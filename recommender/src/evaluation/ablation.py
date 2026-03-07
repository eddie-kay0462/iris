"""
Ablation runner for the hybrid recommender.

Tests different (α, β, γ) weight configurations and reports
evaluation metrics for each, making it easy to identify the
best combination.
"""

from typing import Any, Dict, List, Tuple

import pandas as pd

from src.evaluation.offline_eval import evaluate_model
from src.utils.logging import get_logger

logger = get_logger(__name__)


_DEFAULT_CONFIGS: List[Dict[str, float]] = [
    {"alpha": 1.0, "beta": 0.0, "gamma": 0.0},   # CF only
    {"alpha": 0.0, "beta": 1.0, "gamma": 0.0},   # Text only
    {"alpha": 0.0, "beta": 0.0, "gamma": 1.0},   # Image only
    {"alpha": 0.5, "beta": 0.3, "gamma": 0.2},   # Default hybrid
    {"alpha": 0.4, "beta": 0.4, "gamma": 0.2},   # Balanced text/CF
    {"alpha": 0.6, "beta": 0.2, "gamma": 0.2},   # CF-heavy
    {"alpha": 0.3, "beta": 0.3, "gamma": 0.4},   # Image-heavy
]


def run_ablation(
    hybrid_model: Any,
    test_interactions: pd.DataFrame,
    n_items: int,
    weight_configs: List[Dict[str, float]] | None = None,
    k_values: List[int] | None = None,
    **predict_kwargs: Any,
) -> pd.DataFrame:
    """Run an ablation study over different weight configurations.

    For each configuration, the hybrid model's weights are temporarily
    overridden and the model is evaluated against the test set.

    Args:
        hybrid_model: A :class:`HybridModel` instance.
        test_interactions: Test interactions DataFrame.
        n_items: Total number of items.
        weight_configs: List of dicts each containing ``alpha``,
            ``beta``, and ``gamma`` keys.  Defaults to a built-in set.
        k_values: K cut-offs for evaluation.
        **predict_kwargs: Extra kwargs forwarded to ``model.predict``.

    Returns:
        DataFrame with one row per config and columns for the weights
        and each metric.
    """
    if weight_configs is None:
        weight_configs = _DEFAULT_CONFIGS
    if k_values is None:
        k_values = [5, 10]

    rows: List[Dict[str, Any]] = []

    original_alpha = hybrid_model.alpha
    original_beta = hybrid_model.beta
    original_gamma = hybrid_model.gamma

    for idx, config in enumerate(weight_configs):
        logger.info("Ablation %d/%d: %s", idx + 1, len(weight_configs), config)

        # Override weights
        hybrid_model.alpha = config["alpha"]
        hybrid_model.beta = config["beta"]
        hybrid_model.gamma = config["gamma"]

        metrics = evaluate_model(
            hybrid_model,
            test_interactions,
            n_items,
            k_values=k_values,
            **predict_kwargs,
        )

        row = {**config, **metrics}
        rows.append(row)

    # Restore original weights
    hybrid_model.alpha = original_alpha
    hybrid_model.beta = original_beta
    hybrid_model.gamma = original_gamma

    results_df = pd.DataFrame(rows)
    logger.info("Ablation complete:\n%s", results_df.to_string())
    return results_df
