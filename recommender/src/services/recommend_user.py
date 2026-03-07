"""
User recommendation service.

Loads trained models and indexes, resolves cold-start scenarios, and
returns personalised recommendations for a given user.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from scipy.sparse import csr_matrix

from src.config.settings import get_settings
from src.models.collaborative import CollaborativeModel
from src.models.hybrid import HybridModel
from src.models.popularity import PopularityModel
from src.indexing.faiss_index import FAISSIndex
from src.services.cold_start import ColdStartHandler
from src.utils.helpers import load_pickle
from src.utils.logging import get_logger

logger = get_logger(__name__)

settings = get_settings()


class UserRecommender:
    """Orchestrates personalised recommendations for known and unknown users.

    Attributes:
        hybrid_model: Fitted hybrid model or None.
        popularity_model: Fitted popularity fallback.
        cold_start: ColdStartHandler for unknown users.
        interaction_matrix: Sparse user-item matrix.
        product_id_to_name: Mapping from product_id to display name.
    """

    def __init__(self) -> None:
        self.hybrid_model: Optional[HybridModel] = None
        self.popularity_model: Optional[PopularityModel] = None
        self.cold_start: Optional[ColdStartHandler] = None
        self.interaction_matrix: Optional[csr_matrix] = None
        self.product_id_to_name: Dict[int, str] = {}
        self._n_users: int = 0

    def load_artifacts(self, artifacts_dir: Optional[Path] = None) -> None:
        """Load all pre-trained models and indexes from disk.

        Args:
            artifacts_dir: Directory containing saved model artifacts.
                Defaults to ``settings.paths.model_artifacts_dir``.
        """
        d = artifacts_dir or settings.paths.model_artifacts_dir

        # Popularity
        self.popularity_model = PopularityModel()
        self.popularity_model.load(d / "popularity.pkl")

        # Collaborative
        cf_model = CollaborativeModel()
        cf_model.load(d / "collaborative.pkl")

        # FAISS indexes
        text_index = FAISSIndex()
        text_index.load(settings.paths.index_dir / "text.index")
        image_index = FAISSIndex()
        image_index.load(settings.paths.index_dir / "image.index")

        # Embeddings
        text_emb_data = load_pickle(d / "text_embeddings.pkl")
        image_emb_data = load_pickle(d / "image_embeddings.pkl")

        text_embeddings = text_emb_data["embeddings"]
        image_embeddings = image_emb_data["embeddings"]

        # Hybrid
        self.hybrid_model = HybridModel(
            cf_model=cf_model,
            text_index=text_index,
            image_index=image_index,
            text_embeddings=text_embeddings,
            image_embeddings=image_embeddings,
        )
        self.hybrid_model.load(d / "hybrid.pkl")

        # Interaction matrix
        self.interaction_matrix = load_pickle(d / "interaction_matrix.pkl")
        self._n_users = self.interaction_matrix.shape[0]

        # Product lookup
        try:
            self.product_id_to_name = load_pickle(d / "product_id_to_name.pkl")
        except FileNotFoundError:
            self.product_id_to_name = {}

        # Cold-start handler
        self.cold_start = ColdStartHandler(
            popularity_model=self.popularity_model,
            text_index=text_index,
            text_embeddings=text_embeddings,
        )

        logger.info("UserRecommender: all artifacts loaded (%d users)", self._n_users)

    def recommend(self, user_id: int, k: int = 10) -> List[Dict[str, Any]]:
        """Generate recommendations for a user.

        Falls back to popularity for unknown users.

        Args:
            user_id: Integer user ID.
            k: Number of recommendations.

        Returns:
            List of dicts with ``product_id``, ``score``, and ``name``.
        """
        if user_id < 0 or user_id >= self._n_users:
            logger.info("Cold-start fallback for user %d", user_id)
            recs = self.cold_start.recommend_for_new_user(k=k)
        else:
            recs = self.hybrid_model.predict(
                user_id,
                k=k,
                interaction_matrix=self.interaction_matrix,
            )

        return [
            {
                "product_id": pid,
                "score": round(score, 4),
                "name": self.product_id_to_name.get(pid, f"product_{pid}"),
            }
            for pid, score in recs
        ]
