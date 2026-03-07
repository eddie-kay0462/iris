"""
Data cleaning and normalisation pipeline.

Produces deduplicated, ID-mapped DataFrames ready for feature
engineering and model training.
"""

import re
from pathlib import Path
from typing import Dict, Tuple

import pandas as pd
from bs4 import BeautifulSoup

from src.utils.helpers import build_id_map
from src.utils.logging import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Customers
# ---------------------------------------------------------------------------

def clean_customers(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
    """Normalise customer records and assign integer user IDs.

    Args:
        df: Raw customers DataFrame from :func:`load_customers`.

    Returns:
        Tuple of (cleaned DataFrame with ``user_id`` column,
        email → user_id mapping).
    """
    df = df.copy()

    # Normalise email
    df["Email"] = df["Email"].astype(str).str.strip().str.lower()
    df = df[df["Email"].notna() & (df["Email"] != "") & (df["Email"] != "nan")]
    df = df.drop_duplicates(subset=["Email"], keep="first").reset_index(drop=True)

    # Build contiguous integer IDs
    user_map: Dict[str, int] = build_id_map(df["Email"].tolist())
    df["user_id"] = df["Email"].map(user_map)

    logger.info("Cleaned customers: %d unique users", len(df))
    return df, user_map


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

def _strip_html(text: str) -> str:
    """Remove HTML tags and collapse whitespace."""
    if not isinstance(text, str) or not text.strip():
        return ""
    clean = BeautifulSoup(text, "html.parser").get_text(separator=" ")
    return re.sub(r"\s+", " ", clean).strip()


def clean_products(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
    """Deduplicate products by handle and assign integer product IDs.

    Args:
        df: Raw products DataFrame from :func:`load_products`.

    Returns:
        Tuple of (cleaned DataFrame with one row per unique product
        plus a ``product_id`` column, handle → product_id mapping).
    """
    df = df.copy()

    # Forward-fill handle-level columns (Shopify uses blank rows for variants)
    handle_cols = ["Handle", "Title", "Body (HTML)", "Vendor", "Product Category",
                   "Type", "Tags", "Image Src"]
    for col in handle_cols:
        if col in df.columns:
            df[col] = df[col].ffill()

    # Deduplicate to one canonical row per handle
    df = df.drop_duplicates(subset=["Handle"], keep="first").reset_index(drop=True)
    df = df[df["Handle"].notna() & (df["Handle"] != "")]

    # Clean text
    df["body_clean"] = df["Body (HTML)"].apply(_strip_html)
    df["tags_clean"] = df["Tags"].fillna("").astype(str).str.lower().str.strip()
    df["type_clean"] = df["Type"].fillna("").astype(str).str.lower().str.strip()

    # Build product text blob for embeddings
    df["product_text"] = (
        df["Title"].fillna("")
        + " " + df["body_clean"]
        + " " + df["tags_clean"]
        + " " + df["type_clean"]
    ).str.strip()

    # Integer IDs
    product_map: Dict[str, int] = build_id_map(df["Handle"].tolist())
    df["product_id"] = df["Handle"].map(product_map)

    logger.info("Cleaned products: %d unique products", len(df))
    return df, product_map


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

def _extract_handle_from_lineitem(name: str) -> str:
    """Best-effort extraction of the product handle from a lineitem name.

    Shopify lineitem names look like:
        ``Flare Sweatpants Black - Black / L``
    We strip everything after the last `` - `` to get the base product
    title, then slugify.
    """
    if not isinstance(name, str):
        return ""
    base = name.rsplit(" - ", 1)[0].strip()
    slug = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")
    return slug


def clean_orders(
    df: pd.DataFrame,
    user_map: Dict[str, int],
    product_map: Dict[str, int],
) -> pd.DataFrame:
    """Map orders to integer user and product IDs.

    Args:
        df: Raw orders DataFrame from :func:`load_orders`.
        user_map: Email → user_id mapping from :func:`clean_customers`.
        product_map: Handle → product_id mapping from :func:`clean_products`.

    Returns:
        Cleaned orders DataFrame with ``user_id``, ``product_id``,
        ``quantity``, and ``timestamp`` columns.  Rows that cannot be
        mapped are dropped.
    """
    df = df.copy()

    # Drop cancelled orders
    df = df[df["Cancelled at"].isna()]

    # Map user
    df["email_clean"] = df["Email"].astype(str).str.strip().str.lower()
    df["user_id"] = df["email_clean"].map(user_map)

    # Map product via lineitem name → handle slug → product_map
    df["lineitem_handle"] = df["Lineitem name"].apply(_extract_handle_from_lineitem)
    df["product_id"] = df["lineitem_handle"].map(product_map)

    # Keep only mapped rows
    before = len(df)
    df = df.dropna(subset=["user_id", "product_id"])
    df["user_id"] = df["user_id"].astype(int)
    df["product_id"] = df["product_id"].astype(int)
    after = len(df)
    logger.info("Mapped %d / %d order lines to (user, product) pairs", after, before)

    # Rename convenience columns
    df = df.rename(columns={
        "Lineitem quantity": "quantity",
        "Created at": "timestamp",
    })

    return df[["user_id", "product_id", "quantity", "timestamp",
               "email_clean", "lineitem_handle"]].reset_index(drop=True)
