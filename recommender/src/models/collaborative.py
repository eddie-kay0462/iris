"""
Collaborative filtering model using the ``implicit`` library.

Uses Alternating Least Squares (ALS) for implicit feedback matrix
factorisation.  Provides the same fit/predict/save/load interface
expected by the rest of the pipeline.
"""

from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
from scipy.sparse import csr_matrix

from src.utils.helpers import save_pickle, load_pickle
from src.utils.logging import get_logger

logger = get_logger(__name__)


class CollaborativeModel:
    """Implicit-feedback collaborative filtering recommender.

    Wraps :class:`implicit.als.AlternatingLeastSquares` to train on a
    user–item interaction matrix and produce ranked recommendations.

    Attributes:
        n_components: Dimensionality of the latent factors.
        regularization: L2 regularisation weight.
        iterations: Number of ALS iterations (analogous to epochs).
    """

    def __init__(
        self,
        n_components: int = 64,
        loss: str = "als",
        epochs: int = 30,
        learning_rate: float = 0.05,
        regularization: float = 0.01,
    ) -> None:
        self.n_components = n_components
        self.loss = loss
        self.epochs = epochs
        self.learning_rate = learning_rate
        self.regularization = regularization
        self._model = None
        self._n_users: int = 0
        self._n_items: int = 0
        self._interaction_matrix: Optional[csr_matrix] = None

    def fit(self, interactions: csr_matrix, epochs: Optional[int] = None) -> "CollaborativeModel":
        """Train the ALS model on a user–item interaction matrix.

        Args:
            interactions: Sparse matrix of shape ``(n_users, n_items)``.
            epochs: Override default iterations if provided.

        Returns:
            Self (for chaining).
        """
        from implicit.als import AlternatingLeastSquares

        self._n_users, self._n_items = interactions.shape
        iters = epochs or self.epochs

        logger.info(
            "Training ALS (factors=%d, iterations=%d, reg=%.4f)",
            self.n_components,
            iters,
            self.regularization,
        )

        self._model = AlternatingLeastSquares(
            factors=self.n_components,
            iterations=iters,
            regularization=self.regularization,
            random_state=42,
        )
        # implicit expects item-user matrix (CSC), but accepts CSR and transposes
        self._interaction_matrix = interactions
        self._model.fit(interactions)
        logger.info("ALS training complete")
        return self

    def predict(
        self,
        user_id: int,
        k: int = 10,
        exclude: Optional[List[int]] = None,
    ) -> List[Tuple[int, float]]:
        """Generate top-k item recommendations for a single user.

        Args:
            user_id: Integer user index.
            k: Number of items to return.
            exclude: Item IDs to exclude.

        Returns:
            List of (product_id, score) tuples sorted by descending score.
        """
        if self._model is None:
            raise RuntimeError("Model has not been fitted yet.")

        if user_id < 0 or user_id >= self._n_users:
            return []

        # Get recommendations using implicit's recommend method
        filter_items = exclude if exclude else None
        ids, scores = self._model.recommend(
            user_id,
            self._interaction_matrix[user_id],
            N=k,
            filter_already_liked_items=True,
            filter_items=filter_items,
        )
        return [(int(pid), float(sc)) for pid, sc in zip(ids, scores)]

    def predict_scores(self, user_id: int) -> np.ndarray:
        """Return raw CF scores for all items for a given user.

        Args:
            user_id: Integer user index.

        Returns:
            1-D array of scores of length ``n_items``.
        """
        if self._model is None:
            raise RuntimeError("Model has not been fitted yet.")

        # Compute dot product: user_factors[user_id] · item_factors.T
        user_vec = self._model.user_factors[user_id]
        item_factors = self._model.item_factors
        scores = item_factors.dot(user_vec)
        return scores

    def save(self, path: Path) -> None:
        """Persist model to disk.

        Args:
            path: Pickle file path.
        """
        save_pickle(
            {
                "model": self._model,
                "n_users": self._n_users,
                "n_items": self._n_items,
                "n_components": self.n_components,
                "loss": self.loss,
                "epochs": self.epochs,
                "learning_rate": self.learning_rate,
                "regularization": self.regularization,
                "interaction_matrix": self._interaction_matrix,
            },
            path,
        )

    def load(self, path: Path) -> None:
        """Load model from disk.

        Args:
            path: Pickle file previously written by :meth:`save`.
        """
        data = load_pickle(path)
        self._model = data["model"]
        self._n_users = data["n_users"]
        self._n_items = data["n_items"]
        self.n_components = data["n_components"]
        self.loss = data["loss"]
        self.epochs = data["epochs"]
        self.learning_rate = data["learning_rate"]
        self.regularization = data["regularization"]
        self._interaction_matrix = data.get("interaction_matrix")
        logger.info(
            "CollaborativeModel loaded: %d users, %d items",
            self._n_users,
            self._n_items,
        )
