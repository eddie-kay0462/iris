"""
Train only the collaborative filtering model.

Usage:
    python -m scripts.train_cf
"""

import sys
from pathlib import Path

# Ensure project root is on sys.path
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from src.config.settings import get_settings
from src.data_engineering.build_interactions import (
    build_interaction_df,
    build_interaction_matrix,
)
from src.data_engineering.clean_data import clean_customers, clean_orders, clean_products
from src.data_engineering.load_data import load_customers, load_orders, load_products
from src.data_engineering.splits import time_split
from src.evaluation.offline_eval import evaluate_model
from src.models.collaborative import CollaborativeModel
from src.utils.helpers import save_pickle
from src.utils.logging import get_logger

logger = get_logger(__name__)


def main() -> None:
    """Entry-point: load data → build matrix → train CF → evaluate → save."""
    settings = get_settings()
    settings.paths.ensure_dirs()

    # ---- Load & clean -------------------------------------------------------
    logger.info("=== Loading data ===")
    customers_raw = load_customers(settings.paths.customers_csv)
    orders_raw = load_orders(settings.paths.orders_csv)
    products_raw = load_products(settings.paths.products_csv)

    customers, user_map = clean_customers(customers_raw)
    products, product_map = clean_products(products_raw)
    orders = clean_orders(orders_raw, user_map, product_map)

    # ---- Build interactions --------------------------------------------------
    logger.info("=== Building interactions ===")
    interactions = build_interaction_df(orders)
    n_users = len(user_map)
    n_items = len(product_map)
    train_df, test_df = time_split(interactions, ratio=settings.eval.train_test_ratio)
    train_matrix = build_interaction_matrix(train_df, n_users, n_items)

    # ---- Train ---------------------------------------------------------------
    logger.info("=== Training CF model ===")
    cf = CollaborativeModel(
        n_components=settings.model.cf_num_components,
        loss=settings.model.cf_loss,
        epochs=settings.model.cf_epochs,
        learning_rate=settings.model.cf_learning_rate,
        regularization=settings.model.cf_regularization,
    )
    cf.fit(train_matrix)

    # ---- Evaluate ------------------------------------------------------------
    logger.info("=== Evaluating ===")
    metrics = evaluate_model(cf, test_df, n_items, k_values=settings.eval.k_values)
    for k, v in metrics.items():
        logger.info("  %s = %.4f", k, v)

    # ---- Save ----------------------------------------------------------------
    cf.save(settings.paths.model_artifacts_dir / "collaborative.pkl")
    save_pickle(metrics, settings.paths.model_artifacts_dir / "cf_metrics.pkl")
    logger.info("=== Done ===")


if __name__ == "__main__":
    main()
