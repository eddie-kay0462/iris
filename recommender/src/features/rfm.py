"""
RFM (Recency, Frequency, Monetary) feature engineering.

Computes per-user purchase behaviour metrics and quintile-based
segmentation used downstream for the two-tower model and cold-start
fallback.
"""

from typing import Optional

import numpy as np
import pandas as pd

from src.utils.logging import get_logger

logger = get_logger(__name__)


def compute_rfm(
    orders: pd.DataFrame,
    reference_date: Optional[pd.Timestamp] = None,
) -> pd.DataFrame:
    """Calculate Recency, Frequency, and Monetary value per user.

    Args:
        orders: Cleaned orders DataFrame with ``user_id``, ``quantity``,
            ``timestamp``, and a ``Lineitem price``-like monetary column.
            If a ``weight`` column exists it is used as quantity.
        reference_date: Date from which recency is measured.
            Defaults to the maximum timestamp in *orders*.

    Returns:
        DataFrame indexed by ``user_id`` with columns ``recency``,
        ``frequency``, and ``monetary``.
    """
    df = orders.copy()

    if reference_date is None:
        reference_date = df["timestamp"].max()

    # Ensure timezone-aware comparison
    if hasattr(reference_date, "tzinfo") and reference_date.tzinfo is not None:
        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    else:
        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
        reference_date = pd.Timestamp(reference_date, tz="UTC")

    qty_col = "weight" if "weight" in df.columns else "quantity"

    rfm = (
        df.groupby("user_id")
        .agg(
            recency=("timestamp", lambda x: (reference_date - x.max()).days),
            frequency=(qty_col, "sum"),
            monetary=("quantity", lambda x: x.sum()),  # total items as proxy
        )
        .reset_index()
    )

    logger.info("Computed RFM for %d users", len(rfm))
    return rfm


def rfm_segment(rfm_df: pd.DataFrame) -> pd.DataFrame:
    """Assign quintile-based R/F/M scores and a combined segment label.

    Args:
        rfm_df: DataFrame from :func:`compute_rfm`.

    Returns:
        Copy of *rfm_df* with added ``r_score``, ``f_score``,
        ``m_score``, and ``rfm_segment`` columns.
    """
    df = rfm_df.copy()

    # Recency: lower is better → invert scoring
    df["r_score"] = pd.qcut(df["recency"], q=5, labels=[5, 4, 3, 2, 1], duplicates="drop").astype(int)
    df["f_score"] = pd.qcut(df["frequency"].rank(method="first"), q=5, labels=[1, 2, 3, 4, 5], duplicates="drop").astype(int)
    df["m_score"] = pd.qcut(df["monetary"].rank(method="first"), q=5, labels=[1, 2, 3, 4, 5], duplicates="drop").astype(int)

    df["rfm_segment"] = df["r_score"].astype(str) + df["f_score"].astype(str) + df["m_score"].astype(str)

    logger.info("RFM segmentation complete, %d segments", df["rfm_segment"].nunique())
    return df
