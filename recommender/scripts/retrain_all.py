"""
Full pipeline: load → clean → features → train CF → build indexes
→ hybrid → evaluate → save all artifacts.

Usage:
    python scripts/retrain_all.py
    python -m scripts.retrain_all
"""

import sys
from pathlib import Path

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
from src.features.image_embeddings import ImageEmbedder
from src.features.rfm import compute_rfm, rfm_segment
from src.features.text_embeddings import TextEmbedder
from src.indexing.faiss_index import FAISSIndex
from src.models.collaborative import CollaborativeModel
from src.models.hybrid import HybridModel
from src.models.popularity import PopularityModel
from src.utils.helpers import invert_id_map, save_pickle
from src.utils.logging import get_logger

logger = get_logger(__name__)


def main() -> None:
    """Run the complete recommender training pipeline."""
    settings = get_settings()
    settings.paths.ensure_dirs()

    # ==================================================================
    # 1. DATA ENGINEERING
    # ==================================================================
    logger.info("=" * 60)
    logger.info("PHASE 1 — DATA ENGINEERING")
    logger.info("=" * 60)

    customers_raw = load_customers(settings.paths.customers_csv)
    orders_raw = load_orders(settings.paths.orders_csv)
    products_raw = load_products(settings.paths.products_csv)

    customers, user_map = clean_customers(customers_raw)
    products, product_map = clean_products(products_raw)
    orders = clean_orders(orders_raw, user_map, product_map)

    n_users = len(user_map)
    n_items = len(product_map)
    logger.info("Users: %d  |  Items: %d", n_users, n_items)

    interactions = build_interaction_df(orders)
    train_df, test_df = time_split(interactions, ratio=settings.eval.train_test_ratio)
    train_matrix = build_interaction_matrix(train_df, n_users, n_items)

    # Save mappings
    save_pickle(user_map, settings.paths.model_artifacts_dir / "user_map.pkl")
    save_pickle(product_map, settings.paths.model_artifacts_dir / "product_map.pkl")

    # Build product_id → name lookup
    inv_product = invert_id_map(product_map)
    product_name_lookup = {}
    handle_to_title = dict(zip(products["Handle"], products["Title"].fillna("")))
    for pid, handle in inv_product.items():
        product_name_lookup[pid] = handle_to_title.get(handle, handle)
    save_pickle(product_name_lookup, settings.paths.model_artifacts_dir / "product_id_to_name.pkl")

    # Save interaction matrix
    save_pickle(train_matrix, settings.paths.model_artifacts_dir / "interaction_matrix.pkl")

    # ==================================================================
    # 2. FEATURE ENGINEERING
    # ==================================================================
    logger.info("=" * 60)
    logger.info("PHASE 2 — FEATURE ENGINEERING")
    logger.info("=" * 60)

    # RFM
    rfm = compute_rfm(orders)
    rfm_seg = rfm_segment(rfm)
    save_pickle(rfm_seg, settings.paths.model_artifacts_dir / "rfm.pkl")

    # Text embeddings
    text_emb = TextEmbedder(model_name=settings.embeddings.text_model_name)
    text_embeddings = text_emb.fit(products)
    text_emb.save(settings.paths.model_artifacts_dir / "text_embeddings.pkl")

    # Image embeddings
    image_emb = ImageEmbedder(
        model_name=settings.embeddings.image_model_name,
        pretrained=settings.embeddings.image_model_pretrained,
    )
    image_embeddings = image_emb.fit(products)
    image_emb.save(settings.paths.model_artifacts_dir / "image_embeddings.pkl")

    # ==================================================================
    # 3. INDEXING
    # ==================================================================
    logger.info("=" * 60)
    logger.info("PHASE 3 — FAISS INDEXING")
    logger.info("=" * 60)

    text_index = FAISSIndex(dim=text_embeddings.shape[1])
    text_index.build(text_embeddings)
    text_index.save(settings.paths.index_dir / "text.index")

    image_index = FAISSIndex(dim=image_embeddings.shape[1])
    image_index.build(image_embeddings)
    image_index.save(settings.paths.index_dir / "image.index")

    # ==================================================================
    # 4. MODEL TRAINING
    # ==================================================================
    logger.info("=" * 60)
    logger.info("PHASE 4 — MODEL TRAINING")
    logger.info("=" * 60)

    # Popularity
    pop = PopularityModel()
    pop.fit(interactions)
    pop.save(settings.paths.model_artifacts_dir / "popularity.pkl")

    # Collaborative Filtering
    cf = CollaborativeModel(
        n_components=settings.model.cf_num_components,
        loss=settings.model.cf_loss,
        epochs=settings.model.cf_epochs,
        learning_rate=settings.model.cf_learning_rate,
        regularization=settings.model.cf_regularization,
    )
    cf.fit(train_matrix)
    cf.save(settings.paths.model_artifacts_dir / "collaborative.pkl")

    # Hybrid
    hybrid = HybridModel(
        cf_model=cf,
        text_index=text_index,
        image_index=image_index,
        text_embeddings=text_embeddings,
        image_embeddings=image_embeddings,
        alpha=settings.model.alpha,
        beta=settings.model.beta,
        gamma=settings.model.gamma,
    )
    hybrid.save(settings.paths.model_artifacts_dir / "hybrid.pkl")

    # ==================================================================
    # 5. EVALUATION
    # ==================================================================
    logger.info("=" * 60)
    logger.info("PHASE 5 — EVALUATION")
    logger.info("=" * 60)

    # CF evaluation
    cf_metrics = evaluate_model(cf, test_df, n_items, k_values=settings.eval.k_values)
    logger.info("CF metrics:")
    for k, v in cf_metrics.items():
        logger.info("  %s = %.4f", k, v)

    # Hybrid evaluation
    hybrid_metrics = evaluate_model(
        hybrid,
        test_df,
        n_items,
        k_values=settings.eval.k_values,
        interaction_matrix=train_matrix,
    )
    logger.info("Hybrid metrics:")
    for k, v in hybrid_metrics.items():
        logger.info("  %s = %.4f", k, v)

    # Save combined metrics
    all_metrics = {"cf": cf_metrics, "hybrid": hybrid_metrics}
    save_pickle(all_metrics, settings.paths.model_artifacts_dir / "metrics.pkl")

    logger.info("=" * 60)
    logger.info("PIPELINE COMPLETE — all artifacts saved to %s", settings.paths.model_artifacts_dir)
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
