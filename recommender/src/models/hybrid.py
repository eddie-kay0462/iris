"""
Hybrid scoring model.

Combines collaborative filtering scores with text and image similarity
via a weighted linear combination:

    score = α * cf_score + β * text_sim + γ * image_sim

Uses FAISS indexes for efficient nearest-neighbour retrieval of the
content-based similarity components.
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

from src.indexing.faiss_index import FAISSIndex
from src.models.collaborative import CollaborativeModel
from src.utils.helpers import save_pickle, load_pickle
from src.utils.logging import get_logger

logger = get_logger(__name__)


class HybridModel:
    """Weighted hybrid recommender.

    Attributes:
        alpha: Weight for collaborative filtering scores.
        beta: Weight for text similarity scores.
        gamma: Weight for image similarity scores.
    """

    def __init__(
        self,
        cf_model: CollaborativeModel,
        text_index: FAISSIndex,
        image_index: FAISSIndex,
        text_embeddings: np.ndarray,
        image_embeddings: np.ndarray,
        alpha: float = 0.5,
        beta: float = 0.3,
        gamma: float = 0.2,
    ) -> None:
        self.cf_model = cf_model
        self.text_index = text_index
        self.image_index = image_index
        self.text_embeddings = text_embeddings
        self.image_embeddings = image_embeddings
        self.alpha = alpha
        self.beta = beta
        self.gamma = gamma

    def predict(
        self,
        user_id: int,
        k: int = 10,
        exclude: Optional[List[int]] = None,
        interaction_matrix: Optional[object] = None,
    ) -> List[Tuple[int, float]]:
        """Generate hybrid recommendations for a user.

        Steps:
        1. Get CF scores for all items.
        2. Identify items the user has interacted with.
        3. Compute average content-similarity to the user's history.
        4. Combine with weighted sum and return top-k.

        Args:
            user_id: Integer user index.
            k: Number of items to return.
            exclude: Additional item IDs to exclude.
            interaction_matrix: Sparse matrix to find user's history.

        Returns:
            List of (product_id, hybrid_score) tuples.
        """
        n_items = self.text_embeddings.shape[0]

        # --- CF scores (normalised to [0, 1]) ---
        cf_scores = self.cf_model.predict_scores(user_id)
        cf_min, cf_max = cf_scores.min(), cf_scores.max()
        if cf_max > cf_min:
            cf_norm = (cf_scores - cf_min) / (cf_max - cf_min)
        else:
            cf_norm = np.zeros(n_items, dtype=np.float32)

        # --- Content-based similarity to user history ---
        user_items: List[int] = []
        if interaction_matrix is not None:
            row = interaction_matrix[user_id]
            if hasattr(row, "toarray"):
                row = row.toarray().flatten()
            user_items = list(np.where(row > 0)[0])

        text_scores = np.zeros(n_items, dtype=np.float32)
        image_scores = np.zeros(n_items, dtype=np.float32)

        if user_items:
            # Average text/image embeddings for the user's purchases
            user_text_vec = self.text_embeddings[user_items].mean(axis=0)
            user_image_vec = self.image_embeddings[user_items].mean(axis=0)

            # Text similarity via FAISS
            t_ids, t_dists = self.text_index.query(user_text_vec, k=n_items)
            for pid, dist in zip(t_ids, t_dists):
                if 0 <= pid < n_items:
                    text_scores[pid] = dist  # inner product = cosine on normalised

            # Image similarity via FAISS
            i_ids, i_dists = self.image_index.query(user_image_vec, k=n_items)
            for pid, dist in zip(i_ids, i_dists):
                if 0 <= pid < n_items:
                    image_scores[pid] = dist

            # Normalise to [0, 1]
            for scores in (text_scores, image_scores):
                s_min, s_max = scores.min(), scores.max()
                if s_max > s_min:
                    scores[:] = (scores - s_min) / (s_max - s_min)

        # --- Combine ---
        hybrid = (
            self.alpha * cf_norm
            + self.beta * text_scores
            + self.gamma * image_scores
        )

        # Exclude items
        exclusion_set = set(exclude or []) | set(user_items)
        for eid in exclusion_set:
            if 0 <= eid < n_items:
                hybrid[eid] = -np.inf

        top_k_idx = np.argsort(-hybrid)[:k]
        return [(int(idx), float(hybrid[idx])) for idx in top_k_idx if hybrid[idx] > -np.inf]

    def save(self, path: Path) -> None:
        """Persist hybrid weights and component paths.

        Args:
            path: Pickle file path.
        """
        save_pickle(
            {"alpha": self.alpha, "beta": self.beta, "gamma": self.gamma},
            path,
        )

    def load(self, path: Path) -> None:
        """Restore hybrid weights from disk.

        Args:
            path: Pickle file previously written by :meth:`save`.
        """
        data = load_pickle(path)
        self.alpha = data["alpha"]
        self.beta = data["beta"]
        self.gamma = data["gamma"]
        logger.info(
            "HybridModel loaded: α=%.2f, β=%.2f, γ=%.2f",
            self.alpha,
            self.beta,
            self.gamma,
        )
