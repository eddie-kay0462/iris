"""
Product (item-to-item) recommendation service.

Returns similar products for a given product using FAISS nearest
neighbour search on text and image embeddings.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

from src.config.settings import get_settings
from src.indexing.faiss_index import FAISSIndex
from src.utils.helpers import load_pickle
from src.utils.logging import get_logger

logger = get_logger(__name__)

settings = get_settings()


class ProductRecommender:
    """Find similar products via content embeddings.

    Attributes:
        text_index: FAISS index on text embeddings.
        image_index: FAISS index on image embeddings.
        text_embeddings: Text embedding matrix.
        image_embeddings: Image embedding matrix.
        product_id_to_name: Lookup table for display names.
    """

    def __init__(self) -> None:
        self.text_index: Optional[FAISSIndex] = None
        self.image_index: Optional[FAISSIndex] = None
        self.text_embeddings: Optional[np.ndarray] = None
        self.image_embeddings: Optional[np.ndarray] = None
        self.product_id_to_name: Dict[int, str] = {}
        self._n_items: int = 0

    def load_artifacts(self, artifacts_dir: Optional[Path] = None) -> None:
        """Load FAISS indexes and embedding matrices.

        Args:
            artifacts_dir: Directory containing saved model artifacts.
        """
        d = artifacts_dir or settings.paths.model_artifacts_dir

        self.text_index = FAISSIndex()
        self.text_index.load(settings.paths.index_dir / "text.index")

        self.image_index = FAISSIndex()
        self.image_index.load(settings.paths.index_dir / "image.index")

        text_data = load_pickle(d / "text_embeddings.pkl")
        image_data = load_pickle(d / "image_embeddings.pkl")
        self.text_embeddings = text_data["embeddings"]
        self.image_embeddings = image_data["embeddings"]
        self._n_items = self.text_embeddings.shape[0]

        try:
            self.product_id_to_name = load_pickle(d / "product_id_to_name.pkl")
        except FileNotFoundError:
            self.product_id_to_name = {}

        logger.info("ProductRecommender loaded (%d items)", self._n_items)

    def similar(
        self,
        product_id: int,
        k: int = 10,
        text_weight: float = 0.6,
        image_weight: float = 0.4,
    ) -> List[Dict[str, Any]]:
        """Find the most similar products to a given item.

        Args:
            product_id: Integer product index.
            k: Number of results.
            text_weight: Blend weight for text similarity.
            image_weight: Blend weight for image similarity.

        Returns:
            List of dicts with ``product_id``, ``score``, and ``name``.
        """
        if product_id < 0 or product_id >= self._n_items:
            logger.warning("Unknown product_id %d", product_id)
            return []

        query_text = self.text_embeddings[product_id]
        query_image = self.image_embeddings[product_id]

        t_ids, t_dists = self.text_index.query(query_text, k=k + 1)
        i_ids, i_dists = self.image_index.query(query_image, k=k + 1)

        # Build combined score map
        scores: Dict[int, float] = {}
        for pid, dist in zip(t_ids, t_dists):
            pid = int(pid)
            if pid == product_id:
                continue
            scores[pid] = scores.get(pid, 0.0) + text_weight * float(dist)

        for pid, dist in zip(i_ids, i_dists):
            pid = int(pid)
            if pid == product_id:
                continue
            scores[pid] = scores.get(pid, 0.0) + image_weight * float(dist)

        ranked = sorted(scores.items(), key=lambda x: -x[1])[:k]

        return [
            {
                "product_id": pid,
                "score": round(sc, 4),
                "name": self.product_id_to_name.get(pid, f"product_{pid}"),
            }
            for pid, sc in ranked
        ]
