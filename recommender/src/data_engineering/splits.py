"""
Time-based train/test splitting for interaction data.

Chronological splits prevent data leakage that would occur with
random splitting of temporal purchase data.
"""

from typing import Tuple

import pandas as pd

from src.utils.logging import get_logger

logger = get_logger(__name__)


def time_split(
    interactions: pd.DataFrame,
    ratio: float = 0.8,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Split interactions chronologically.

    The earliest ``ratio`` fraction of interactions (by timestamp) goes
    to the training set; the rest goes to the test set.

    Args:
        interactions: DataFrame with a ``timestamp`` column.
        ratio: Fraction of data to use for training (default 0.8).

    Returns:
        Tuple of (train_df, test_df).

    Raises:
        ValueError: If *ratio* is not in (0, 1).
    """
    if not 0 < ratio < 1:
        raise ValueError(f"ratio must be in (0, 1), got {ratio}")

    sorted_df = interactions.sort_values("timestamp").reset_index(drop=True)
    split_idx = int(len(sorted_df) * ratio)

    train = sorted_df.iloc[:split_idx].reset_index(drop=True)
    test = sorted_df.iloc[split_idx:].reset_index(drop=True)

    logger.info(
        "Time split: %d train, %d test (ratio=%.2f)",
        len(train),
        len(test),
        ratio,
    )
    return train, test
