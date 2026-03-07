"""
FastAPI route definitions.

Endpoints:
    GET  /recommend/user/{user_id}     – personalised recommendations
    GET  /recommend/product/{product_id} – similar products
    GET  /metrics                       – latest evaluation metrics
    POST /retrain                       – trigger full retrain pipeline
"""

import subprocess
import sys
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from src.api.schemas import (
    MetricsResponse,
    RecommendationItem,
    RecommendationResponse,
    RetrainResponse,
)
from src.config.settings import get_settings
from src.utils.helpers import load_pickle
from src.utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()
settings = get_settings()

# These are set at startup by main.py
_user_recommender = None
_product_recommender = None
_user_map = None       # email → int_id
_product_map = None    # handle → int_id


def attach_services(user_rec: object, product_rec: object) -> None:
    """Inject loaded services into the router module.

    Called once during the FastAPI ``startup`` event.

    Args:
        user_rec: A :class:`UserRecommender` instance.
        product_rec: A :class:`ProductRecommender` instance.
    """
    global _user_recommender, _product_recommender
    _user_recommender = user_rec
    _product_recommender = product_rec


def attach_maps(user_map: dict, product_map: dict) -> None:
    """Inject email→id and handle→id mappings.

    Called once during the FastAPI ``startup`` event.

    Args:
        user_map: Dict mapping email strings to integer user IDs.
        product_map: Dict mapping product handles to integer product IDs.
    """
    global _user_map, _product_map
    _user_map = user_map
    _product_map = product_map


# ------------------------------------------------------------------
# /product-map  — handle → integer_id lookup for the NestJS bridge
# ------------------------------------------------------------------

@router.get("/product-map")
async def product_map() -> dict:
    """Return the full product handle → integer ID mapping.

    Used by the NestJS proxy at startup to cache the mapping in memory.
    """
    if _product_map is None:
        return {}
    return _product_map


# ------------------------------------------------------------------
# /recommend/user/popular  — popularity fallback for guests
# ------------------------------------------------------------------

@router.get("/recommend/user/popular", response_model=RecommendationResponse)
async def recommend_popular(
    k: Optional[int] = Query(default=None, ge=1, le=100, description="Number of results"),
) -> RecommendationResponse:
    """Return top-K popular products (used for guests / unauthenticated users)."""
    if _user_recommender is None:
        raise HTTPException(status_code=503, detail="Models not loaded yet")

    k = k or settings.api.default_k
    recs = _user_recommender.cold_start.recommend_for_new_user(k=k)
    items = [RecommendationItem(product_id=pid, score=score, name=_user_recommender.product_id_to_name.get(pid, "")) for pid, score in recs]
    return RecommendationResponse(recommendations=items, strategy="popularity")


# ------------------------------------------------------------------
# /recommend/user/by-email  — look up user by email, then recommend
# ------------------------------------------------------------------

@router.get("/recommend/user/by-email", response_model=RecommendationResponse)
async def recommend_by_email(
    email: str = Query(..., description="User email address"),
    k: Optional[int] = Query(default=None, ge=1, le=100, description="Number of results"),
) -> RecommendationResponse:
    """Return personalised recommendations for a user identified by email.

    Falls back to popularity if the email is not in the training data.
    """
    if _user_recommender is None:
        raise HTTPException(status_code=503, detail="Models not loaded yet")

    k = k or settings.api.default_k

    # Look up integer user_id from email
    user_id: Optional[int] = _user_map.get(email) if _user_map else None

    if user_id is None:
        # Unknown email — popularity fallback
        recs = _user_recommender.cold_start.recommend_for_new_user(k=k)
        items = [RecommendationItem(product_id=pid, score=score, name=_user_recommender.product_id_to_name.get(pid, "")) for pid, score in recs]
        return RecommendationResponse(recommendations=items, strategy="popularity")

    recs = _user_recommender.recommend(user_id, k=k)
    items = [RecommendationItem(**r) for r in recs]
    strategy = "hybrid" if recs else "popularity"
    return RecommendationResponse(user_id=user_id, recommendations=items, strategy=strategy)


# ------------------------------------------------------------------
# /recommend/user/{user_id}
# ------------------------------------------------------------------

@router.get("/recommend/user/{user_id}", response_model=RecommendationResponse)
async def recommend_for_user(
    user_id: int,
    k: Optional[int] = Query(default=None, ge=1, le=100, description="Number of results"),
) -> RecommendationResponse:
    """Return personalised recommendations for a user.

    Falls back to popularity for unknown users.
    """
    if _user_recommender is None:
        raise HTTPException(status_code=503, detail="Models not loaded yet")

    k = k or settings.api.default_k
    recs = _user_recommender.recommend(user_id, k=k)
    items = [RecommendationItem(**r) for r in recs]

    strategy = "hybrid" if recs else "popularity"
    return RecommendationResponse(
        user_id=user_id,
        recommendations=items,
        strategy=strategy,
    )


# ------------------------------------------------------------------
# /recommend/product/{product_id}
# ------------------------------------------------------------------

@router.get("/recommend/product/{product_id}", response_model=RecommendationResponse)
async def recommend_for_product(
    product_id: int,
    k: Optional[int] = Query(default=None, ge=1, le=100, description="Number of results"),
) -> RecommendationResponse:
    """Return similar products for a given item."""
    if _product_recommender is None:
        raise HTTPException(status_code=503, detail="Models not loaded yet")

    k = k or settings.api.default_k
    recs = _product_recommender.similar(product_id, k=k)
    items = [RecommendationItem(**r) for r in recs]

    return RecommendationResponse(
        product_id=product_id,
        recommendations=items,
        strategy="content",
    )


# ------------------------------------------------------------------
# /metrics
# ------------------------------------------------------------------

@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics() -> MetricsResponse:
    """Return the latest offline evaluation metrics."""
    metrics_path = settings.paths.model_artifacts_dir / "metrics.pkl"
    try:
        metrics = load_pickle(metrics_path)
    except FileNotFoundError:
        metrics = {"message": "No metrics available yet – run retrain first."}

    model_info = {
        "alpha": settings.model.alpha,
        "beta": settings.model.beta,
        "gamma": settings.model.gamma,
    }
    return MetricsResponse(metrics=metrics, model_info=model_info)


# ------------------------------------------------------------------
# /retrain
# ------------------------------------------------------------------

@router.post("/retrain", response_model=RetrainResponse)
async def retrain() -> RetrainResponse:
    """Trigger a full retrain of the recommendation pipeline.

    Runs ``scripts/retrain_all.py`` as a subprocess.
    """
    logger.info("Retrain triggered via API")
    try:
        result = subprocess.run(
            [sys.executable, "-m", "scripts.retrain_all"],
            capture_output=True,
            text=True,
            timeout=600,
            cwd=str(settings.paths.project_root),
        )
        if result.returncode != 0:
            logger.error("Retrain failed: %s", result.stderr)
            return RetrainResponse(
                status="error",
                message=f"Retrain failed: {result.stderr[:500]}",
            )

        # Reload metrics
        metrics_path = settings.paths.model_artifacts_dir / "metrics.pkl"
        try:
            metrics = load_pickle(metrics_path)
        except FileNotFoundError:
            metrics = {}

        return RetrainResponse(
            status="success",
            message="Pipeline retrained successfully.",
            metrics=metrics,
        )
    except subprocess.TimeoutExpired:
        return RetrainResponse(status="error", message="Retrain timed out after 600s")
    except Exception as e:
        logger.exception("Retrain error")
        return RetrainResponse(status="error", message=str(e))
