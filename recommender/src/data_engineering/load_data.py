"""
Data loaders for Shopify CSV exports.

Each loader reads a raw CSV, performs minimal type casting, and returns
a clean :class:`pandas.DataFrame`.
"""

from pathlib import Path

import pandas as pd

from src.utils.logging import get_logger

logger = get_logger(__name__)


def load_customers(path: Path) -> pd.DataFrame:
    """Load the Shopify customers CSV.

    Args:
        path: Absolute or relative path to ``customers_export.csv``.

    Returns:
        DataFrame with columns: Customer ID, Email, Total Spent,
        Total Orders, Tags, etc.
    """
    logger.info("Loading customers from %s", path)
    df = pd.read_csv(
        path,
        dtype={"Customer ID": str},
        low_memory=False,
    )
    df.columns = df.columns.str.strip()
    # Ensure numeric
    df["Total Spent"] = pd.to_numeric(df["Total Spent"], errors="coerce").fillna(0.0)
    df["Total Orders"] = pd.to_numeric(df["Total Orders"], errors="coerce").fillna(0).astype(int)
    logger.info("Loaded %d customer rows", len(df))
    return df


def load_orders(path: Path) -> pd.DataFrame:
    """Load the Shopify orders CSV.

    Args:
        path: Absolute or relative path to ``orders_export_1.csv``.

    Returns:
        DataFrame with parsed ``Created at`` datetime and all line-item
        columns.
    """
    logger.info("Loading orders from %s", path)
    df = pd.read_csv(path, low_memory=False)
    df.columns = df.columns.str.strip()
    df["Created at"] = pd.to_datetime(df["Created at"], errors="coerce", utc=True)
    df["Lineitem quantity"] = (
        pd.to_numeric(df["Lineitem quantity"], errors="coerce").fillna(1).astype(int)
    )
    df["Lineitem price"] = pd.to_numeric(df["Lineitem price"], errors="coerce").fillna(0.0)
    logger.info("Loaded %d order line rows", len(df))
    return df


def load_products(path: Path) -> pd.DataFrame:
    """Load the Shopify products CSV.

    Args:
        path: Absolute or relative path to ``products_export_1.csv``.

    Returns:
        DataFrame with one row per variant.  The ``Handle`` column
        serves as the canonical product identifier.
    """
    logger.info("Loading products from %s", path)
    df = pd.read_csv(path, low_memory=False)
    df.columns = df.columns.str.strip()
    df["Variant Price"] = pd.to_numeric(df["Variant Price"], errors="coerce").fillna(0.0)
    logger.info("Loaded %d product/variant rows", len(df))
    return df
