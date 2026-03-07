"""
FastAPI application entry-point.

Run with:
    uvicorn src.api.main:app --host 0.0.0.0 --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import attach_services, attach_maps, router
from src.config.settings import get_settings
from src.services.recommend_product import ProductRecommender
from src.services.recommend_user import UserRecommender
from src.utils.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load models and indexes into memory."""
    logger.info("Loading recommendation artifacts …")

    user_rec = UserRecommender()
    product_rec = ProductRecommender()

    try:
        user_rec.load_artifacts()
        product_rec.load_artifacts()
        attach_services(user_rec, product_rec)

        # Load id maps for email→user_id and handle→product_id lookups
        user_map_path = settings.paths.model_artifacts_dir / "user_map.pkl"
        product_map_path = settings.paths.model_artifacts_dir / "product_map.pkl"
        try:
            from src.utils.helpers import load_pickle
            user_map = load_pickle(user_map_path)   # {email: int_id}
            product_map = load_pickle(product_map_path)  # {handle: int_id}
            attach_maps(user_map, product_map)
            logger.info("Maps loaded: %d users, %d products", len(user_map), len(product_map))
        except FileNotFoundError as map_exc:
            logger.warning("Maps not found (%s) — run retrain first", map_exc)
            attach_maps({}, {})

        logger.info("All artifacts loaded – API ready")
    except FileNotFoundError as exc:
        logger.warning(
            "Some artifacts missing (%s). Run `python scripts/retrain_all.py` first.",
            exc,
        )

    yield  # app is running

    logger.info("Shutting down …")


app = FastAPI(
    title="1NRI Hybrid Recommender API",
    description=(
        "Production recommender system for the 1NRI fashion brand. "
        "Combines collaborative filtering, text similarity, and image "
        "similarity into a hybrid scoring model."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health():
    """Health-check endpoint."""
    return {"status": "ok"}
