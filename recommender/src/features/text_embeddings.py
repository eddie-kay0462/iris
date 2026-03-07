"""
Sentence-BERT text embedding generator for products.

Encodes concatenated product text (title + body + tags + type) into
dense 384-dimensional vectors using ``all-MiniLM-L6-v2``.
"""

from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from src.utils.helpers import save_pickle, load_pickle, normalise_vectors
from src.utils.logging import get_logger

logger = get_logger(__name__)


class TextEmbedder:
    """Wrap Sentence-BERT to produce product text embeddings.

    Attributes:
        model_name: HuggingFace model identifier.
        embeddings: Computed embedding matrix of shape ``(n_products, dim)``.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self.model_name = model_name
        self.embeddings: Optional[np.ndarray] = None
        self._model = None

    def _load_model(self) -> None:
        """Lazy-load the Sentence-BERT model."""
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            logger.info("Loading Sentence-BERT model: %s", self.model_name)
            self._model = SentenceTransformer(self.model_name)

    def fit(self, products_df: pd.DataFrame, text_column: str = "product_text") -> np.ndarray:
        """Encode product texts into embeddings.

        Args:
            products_df: DataFrame with a ``text_column`` containing the
                concatenated product text.
            text_column: Name of the text column to encode.

        Returns:
            Normalised embedding matrix of shape ``(n_products, 384)``.
        """
        self._load_model()
        texts = products_df[text_column].fillna("").tolist()

        logger.info("Encoding %d product texts …", len(texts))
        raw = self._model.encode(
            texts,
            batch_size=64,
            show_progress_bar=True,
            convert_to_numpy=True,
        )
        self.embeddings = normalise_vectors(raw.astype(np.float32))
        logger.info("Text embeddings shape: %s", self.embeddings.shape)
        return self.embeddings

    def save(self, path: Path) -> None:
        """Persist embeddings and metadata to disk.

        Args:
            path: Pickle file path.
        """
        save_pickle(
            {"model_name": self.model_name, "embeddings": self.embeddings},
            path,
        )

    def load(self, path: Path) -> None:
        """Restore embeddings from disk.

        Args:
            path: Pickle file previously written by :meth:`save`.
        """
        data = load_pickle(path)
        self.model_name = data["model_name"]
        self.embeddings = data["embeddings"]
        logger.info("Loaded text embeddings: shape=%s", self.embeddings.shape)
