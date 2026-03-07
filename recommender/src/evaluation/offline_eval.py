"""
Offline evaluation harness.

Evaluates a recommender model against a held-out test set, aggregating
precision, recall, NDCG, and coverage across all test users.
"""

from typing import Any, Dict, List, Set

import pandas as pd

from src.evaluation.metrics import coverage, ndcg_at_k, precision_at_k, recall_at_k
from src.utils.logging import get_logger

logger = get_logger(__name__)


def _build_ground_truth(test_df: pd.DataFrame) -> Dict[int, Set[int]]:
    """Build a mapping from user_id to the set of items they interacted
    with in the test period.

    Args:
        test_df: Test interactions DataFrame with ``user_id`` and
            ``product_id`` columns.

    Returns:
        Dict mapping each user to their relevant item set.
    """
    gt: Dict[int, Set[int]] = {}
    for uid, group in test_df.groupby("user_id"):
        gt[int(uid)] = set(group["product_id"].astype(int).tolist())
    return gt


def evaluate_model(
    model: Any,
    test_interactions: pd.DataFrame,
    n_items: int,
    k_values: List[int] | None = None,
    **predict_kwargs: Any,
) -> Dict[str, float]:
    """Evaluate a model across multiple cut-off ranks.

    The *model* must expose a ``predict(user_id, k, ...)`` method that
    returns ``List[Tuple[int, float]]``.

    Args:
        model: Any model with a ``predict`` method.
        test_interactions: Test DataFrame with ``user_id`` and
            ``product_id`` columns.
        n_items: Total number of items in the catalogue.
        k_values: List of K cut-offs to evaluate (default [5, 10, 20]).
        **predict_kwargs: Additional keyword arguments forwarded to
            ``model.predict``.

    Returns:
        Dict of metric names to averaged values, e.g.
        ``{"precision@5": 0.12, "recall@5": 0.08, ...}``.
    """
    if k_values is None:
        k_values = [5, 10, 20]

    ground_truth = _build_ground_truth(test_interactions)
    test_users = list(ground_truth.keys())

    if not test_users:
        logger.warning("No test users found; returning zeros.")
        return {f"{m}@{k}": 0.0 for k in k_values for m in ["precision", "recall", "ndcg"]}

    results: Dict[str, List[float]] = {
        f"{metric}@{k}": [] for k in k_values for metric in ["precision", "recall", "ndcg"]
    }
    all_preds: List[List[int]] = []

    max_k = max(k_values)
    for uid in test_users:
        try:
            preds_raw = model.predict(uid, k=max_k, **predict_kwargs)
            pred_ids = [pid for pid, _ in preds_raw]
        except Exception:
            pred_ids = []

        all_preds.append(pred_ids)
        actual = ground_truth[uid]

        for k in k_values:
            results[f"precision@{k}"].append(precision_at_k(pred_ids, actual, k))
            results[f"recall@{k}"].append(recall_at_k(pred_ids, actual, k))
            results[f"ndcg@{k}"].append(ndcg_at_k(pred_ids, actual, k))

    # Average
    averaged: Dict[str, float] = {}
    for key, vals in results.items():
        averaged[key] = float(sum(vals) / len(vals)) if vals else 0.0

    # Catalogue coverage at max K
    averaged[f"coverage@{max_k}"] = coverage(all_preds, n_items)

    logger.info("Evaluation results: %s", averaged)
    return averaged
