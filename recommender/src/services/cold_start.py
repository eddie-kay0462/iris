"""
Cold-start handling for unknown users and items.

Uses popularity-based fallback for new users and content-based
fallback for new items.
"""

from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from src.indexing.faiss_index import FAISSIndex
from src.models.popularity import PopularityModel
from src.utils.logging import get_logger

logger = get_logger(__name__)


class ColdStartHandler:
    """Fallback recommender for cold-start scenarios.

    Attributes:
        popularity_model: Pre-fitted popularity model for new users.
        text_index: FAISS text index for new-item content matching.
        text_embeddings: Full product text embedding matrix.
    """

    def __init__(
        self,
        popularity_model: PopularityModel,
        text_index: Optional[FAISSIndex] = None,
        text_embeddings: Optional[np.ndarray] = None,
    ) -> None:
        self.popularity_model = popularity_model
        self.text_index = text_index
        self.text_embeddings = text_embeddings

    def recommend_for_new_user(
        self,
        k: int = 10,
    ) -> List[Tuple[int, float]]:
        """Return popularity-based recommendations for an unknown user.

        Args:
            k: Number of items.

        Returns:
            List of (product_id, score) tuples.
        """
        logger.info("Cold-start: using popularity for new user")
        return self.popularity_model.predict(k=k)

    def recommend_for_new_item(
        self,
        item_text: str,
        k: int = 10,
    ) -> List[Tuple[int, float]]:
        """Find existing products similar to a new item's text.

        Args:
            item_text: Concatenated text description of the new item.
            k: Number of similar items to return.

        Returns:
            List of (product_id, similarity_score) tuples.
        """
        if self.text_index is None:
            logger.warning("No text index available for new-item cold-start")
            return []

        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer("all-MiniLM-L6-v2")
        vec = model.encode([item_text], convert_to_numpy=True).astype(np.float32)
        norm = np.linalg.norm(vec, axis=1, keepdims=True)
        norm = np.where(norm == 0, 1.0, norm)
        vec = vec / norm

        ids, dists = self.text_index.query(vec[0], k=k)
        results = [(int(pid), float(d)) for pid, d in zip(ids, dists)]
        logger.info("Cold-start: found %d similar items for new product", len(results))
        return results
