"""
Build embeddings, FAISS indexes, and train the hybrid model.

Usage:
    python -m scripts.train_hybrid
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
from src.features.text_embeddings import TextEmbedder
from src.indexing.faiss_index import FAISSIndex
from src.models.collaborative import CollaborativeModel
from src.models.hybrid import HybridModel
from src.utils.helpers import save_pickle
from src.utils.logging import get_logger

logger = get_logger(__name__)


def main() -> None:
    """Entry-point: embeddings → FAISS indexes → hybrid model → evaluate."""
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
    interactions = build_interaction_df(orders)
    n_users = len(user_map)
    n_items = len(product_map)
    train_df, test_df = time_split(interactions, ratio=settings.eval.train_test_ratio)
    train_matrix = build_interaction_matrix(train_df, n_users, n_items)

    # ---- Text embeddings -----------------------------------------------------
    logger.info("=== Building text embeddings ===")
    text_emb = TextEmbedder(model_name=settings.embeddings.text_model_name)
    text_embeddings = text_emb.fit(products)
    text_emb.save(settings.paths.model_artifacts_dir / "text_embeddings.pkl")

    # ---- Image embeddings ----------------------------------------------------
    logger.info("=== Building image embeddings ===")
    image_emb = ImageEmbedder(
        model_name=settings.embeddings.image_model_name,
        pretrained=settings.embeddings.image_model_pretrained,
    )
    image_embeddings = image_emb.fit(products)
    image_emb.save(settings.paths.model_artifacts_dir / "image_embeddings.pkl")

    # ---- FAISS indexes -------------------------------------------------------
    logger.info("=== Building FAISS indexes ===")
    text_index = FAISSIndex(dim=text_embeddings.shape[1])
    text_index.build(text_embeddings)
    text_index.save(settings.paths.index_dir / "text.index")

    image_index = FAISSIndex(dim=image_embeddings.shape[1])
    image_index.build(image_embeddings)
    image_index.save(settings.paths.index_dir / "image.index")

    # ---- CF model (load or train) -------------------------------------------
    cf = CollaborativeModel(
        n_components=settings.model.cf_num_components,
        loss=settings.model.cf_loss,
        epochs=settings.model.cf_epochs,
        learning_rate=settings.model.cf_learning_rate,
        regularization=settings.model.cf_regularization,
    )
    cf_path = settings.paths.model_artifacts_dir / "collaborative.pkl"
    if cf_path.exists():
        cf.load(cf_path)
        logger.info("Loaded existing CF model")
    else:
        cf.fit(train_matrix)
        cf.save(cf_path)

    # ---- Hybrid model --------------------------------------------------------
    logger.info("=== Building hybrid model ===")
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

    # ---- Evaluate hybrid -----------------------------------------------------
    logger.info("=== Evaluating hybrid model ===")
    metrics = evaluate_model(
        hybrid,
        test_df,
        n_items,
        k_values=settings.eval.k_values,
        interaction_matrix=train_matrix,
    )
    for k, v in metrics.items():
        logger.info("  %s = %.4f", k, v)
    save_pickle(metrics, settings.paths.model_artifacts_dir / "metrics.pkl")

    logger.info("=== Done ===")


if __name__ == "__main__":
    main()
