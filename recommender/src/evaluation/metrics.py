"""
Evaluation metrics for recommender systems.

All functions are pure: (predicted, actual, k) → float.
"""

from typing import List, Set

import numpy as np


def precision_at_k(predicted: List[int], actual: Set[int], k: int) -> float:
    """Proportion of recommended items in the top-k that are relevant.

    Args:
        predicted: Ordered list of recommended item IDs.
        actual: Set of ground-truth relevant item IDs.
        k: Cut-off rank.

    Returns:
        Precision@K in [0, 1].
    """
    if k <= 0 or not actual:
        return 0.0
    top_k = predicted[:k]
    hits = sum(1 for p in top_k if p in actual)
    return hits / k


def recall_at_k(predicted: List[int], actual: Set[int], k: int) -> float:
    """Proportion of relevant items that appear in the top-k.

    Args:
        predicted: Ordered list of recommended item IDs.
        actual: Set of ground-truth relevant item IDs.
        k: Cut-off rank.

    Returns:
        Recall@K in [0, 1].
    """
    if k <= 0 or not actual:
        return 0.0
    top_k = predicted[:k]
    hits = sum(1 for p in top_k if p in actual)
    return hits / len(actual)


def ndcg_at_k(predicted: List[int], actual: Set[int], k: int) -> float:
    """Normalised Discounted Cumulative Gain at rank k.

    Uses binary relevance (1 if item is in *actual*, 0 otherwise).

    Args:
        predicted: Ordered list of recommended item IDs.
        actual: Set of ground-truth relevant item IDs.
        k: Cut-off rank.

    Returns:
        NDCG@K in [0, 1].
    """
    if k <= 0 or not actual:
        return 0.0

    top_k = predicted[:k]
    dcg = sum(
        1.0 / np.log2(i + 2)  # i is 0-indexed, rank = i+1, log2(rank+1)
        for i, p in enumerate(top_k)
        if p in actual
    )

    # Ideal DCG: all relevant items at the top
    ideal_len = min(len(actual), k)
    idcg = sum(1.0 / np.log2(i + 2) for i in range(ideal_len))

    return dcg / idcg if idcg > 0 else 0.0


def coverage(all_predictions: List[List[int]], n_items: int) -> float:
    """Fraction of the item catalogue that the model has recommended at
    least once across all users.

    Args:
        all_predictions: List of per-user recommendation lists.
        n_items: Total number of items in the catalogue.

    Returns:
        Coverage ratio in [0, 1].
    """
    if n_items <= 0:
        return 0.0
    recommended = set()
    for preds in all_predictions:
        recommended.update(preds)
    return len(recommended) / n_items
