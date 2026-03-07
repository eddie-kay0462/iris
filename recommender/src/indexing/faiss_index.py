"""
FAISS index wrapper for efficient nearest-neighbour retrieval.

Supports inner-product search on L2-normalised embeddings (equivalent
to cosine similarity).
"""

from pathlib import Path
from typing import Tuple

import numpy as np

from src.utils.logging import get_logger

logger = get_logger(__name__)


class FAISSIndex:
    """Thin wrapper around a FAISS ``IndexFlatIP`` index.

    Attributes:
        dim: Dimensionality of the stored vectors.
    """

    def __init__(self, dim: int = 384) -> None:
        self.dim = dim
        self._index = None

    def build(self, embeddings: np.ndarray) -> "FAISSIndex":
        """Build the index from a matrix of embeddings.

        Args:
            embeddings: Array of shape ``(n, dim)``, **already L2-normalised**.

        Returns:
            Self (for chaining).
        """
        import faiss

        self.dim = embeddings.shape[1]
        self._index = faiss.IndexFlatIP(self.dim)
        self._index.add(embeddings.astype(np.float32))
        logger.info("FAISS index built: %d vectors, dim=%d", self._index.ntotal, self.dim)
        return self

    def query(self, vector: np.ndarray, k: int = 10) -> Tuple[np.ndarray, np.ndarray]:
        """Return the top-k nearest neighbours.

        Args:
            vector: Query vector of shape ``(dim,)`` or ``(1, dim)``.
            k: Number of neighbours to retrieve.

        Returns:
            Tuple of (ids, distances) arrays each of length ``k``.

        Raises:
            RuntimeError: If the index has not been built.
        """
        if self._index is None:
            raise RuntimeError("Index has not been built yet.")

        q = vector.astype(np.float32).reshape(1, -1)
        k = min(k, self._index.ntotal)
        distances, indices = self._index.search(q, k)
        return indices[0], distances[0]

    def save(self, path: Path) -> None:
        """Write the index to disk in FAISS native format.

        Args:
            path: Destination file path.
        """
        import faiss

        if self._index is None:
            raise RuntimeError("Cannot save an empty index.")
        path.parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self._index, str(path))
        logger.info("FAISS index saved → %s", path)

    def load(self, path: Path) -> None:
        """Load an index from disk.

        Args:
            path: FAISS index file previously written by :meth:`save`.
        """
        import faiss

        if not path.exists():
            raise FileNotFoundError(f"Index file not found: {path}")
        self._index = faiss.read_index(str(path))
        self.dim = self._index.d
        logger.info("FAISS index loaded ← %s (%d vectors)", path, self._index.ntotal)
