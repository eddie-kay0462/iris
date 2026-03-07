"""
Popularity-based recommender.

Ranks items by total purchase count. Used as the primary cold-start
fallback for unknown users.
"""

from pathlib import Path
from typing import List, Tuple

import numpy as np
import pandas as pd

from src.utils.helpers import save_pickle, load_pickle
from src.utils.logging import get_logger

logger = get_logger(__name__)


class PopularityModel:
    """Non-personalised popularity recommender.

    Attributes:
        item_scores: Sorted array of (product_id, score) pairs.
    """

    def __init__(self) -> None:
        self.item_scores: np.ndarray = np.array([])
        self._ranked_ids: np.ndarray = np.array([])

    def fit(self, interactions: pd.DataFrame) -> "PopularityModel":
        """Fit by counting purchases per item.

        Args:
            interactions: DataFrame with ``product_id`` and ``weight`` columns.

        Returns:
            Self (for chaining).
        """
        counts = (
            interactions.groupby("product_id")["weight"]
            .sum()
            .sort_values(ascending=False)
        )
        self._ranked_ids = counts.index.values
        self.item_scores = counts.values.astype(np.float32)
        logger.info("PopularityModel fitted on %d items", len(self._ranked_ids))
        return self

    def predict(self, k: int = 10, exclude: List[int] | None = None) -> List[Tuple[int, float]]:
        """Return the top-k most popular items.

        Args:
            k: Number of items to return.
            exclude: Item IDs to exclude (e.g. already purchased).

        Returns:
            List of (product_id, score) tuples.
        """
        results: List[Tuple[int, float]] = []
        for pid, score in zip(self._ranked_ids, self.item_scores):
            if exclude and int(pid) in exclude:
                continue
            results.append((int(pid), float(score)))
            if len(results) >= k:
                break
        return results

    def save(self, path: Path) -> None:
        """Persist model to disk.

        Args:
            path: Pickle file path.
        """
        save_pickle(
            {"ranked_ids": self._ranked_ids, "item_scores": self.item_scores},
            path,
        )

    def load(self, path: Path) -> None:
        """Load model from disk.

        Args:
            path: Pickle file previously written by :meth:`save`.
        """
        data = load_pickle(path)
        self._ranked_ids = data["ranked_ids"]
        self.item_scores = data["item_scores"]
        logger.info("PopularityModel loaded: %d items", len(self._ranked_ids))
