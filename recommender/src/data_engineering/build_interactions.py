"""
Build user–item interaction structures for model training.

Produces both a sparse CSR matrix (for LightFM) and a tidy DataFrame
(for evaluation splits and the two-tower model).
"""

from typing import Dict, Tuple

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix

from src.utils.logging import get_logger

logger = get_logger(__name__)


def build_interaction_df(orders: pd.DataFrame) -> pd.DataFrame:
    """Aggregate order lines into (user_id, product_id, weight, timestamp).

    The *weight* is the total quantity purchased for each (user, item) pair.
    The *timestamp* is the most recent purchase date for that pair.

    Args:
        orders: Cleaned orders DataFrame with ``user_id``, ``product_id``,
            ``quantity``, and ``timestamp`` columns.

    Returns:
        Aggregated interaction DataFrame sorted by timestamp.
    """
    agg = (
        orders.groupby(["user_id", "product_id"])
        .agg(
            weight=("quantity", "sum"),
            timestamp=("timestamp", "max"),
        )
        .reset_index()
    )
    agg = agg.sort_values("timestamp").reset_index(drop=True)
    logger.info(
        "Built interaction DF: %d interactions, %d users, %d items",
        len(agg),
        agg["user_id"].nunique(),
        agg["product_id"].nunique(),
    )
    return agg


def build_interaction_matrix(
    interactions: pd.DataFrame,
    n_users: int,
    n_items: int,
) -> csr_matrix:
    """Convert an interaction DataFrame into a sparse user–item matrix.

    Args:
        interactions: DataFrame with ``user_id``, ``product_id``, and
            ``weight`` columns.
        n_users: Total number of users (matrix rows).
        n_items: Total number of items (matrix columns).

    Returns:
        Sparse CSR matrix of shape ``(n_users, n_items)``.
    """
    rows = interactions["user_id"].values
    cols = interactions["product_id"].values
    vals = interactions["weight"].values.astype(np.float32)

    mat = csr_matrix((vals, (rows, cols)), shape=(n_users, n_items))
    logger.info(
        "Interaction matrix: shape=%s, nnz=%d, density=%.4f%%",
        mat.shape,
        mat.nnz,
        100.0 * mat.nnz / (mat.shape[0] * mat.shape[1]),
    )
    return mat
