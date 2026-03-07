"""
Shared helper utilities.

ID mapping, serialisation, and a timing decorator.
"""

import pickle
import time
import functools
from pathlib import Path
from typing import Any, Callable, Dict, List, Sequence

import numpy as np
import pandas as pd

from src.utils.logging import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# ID mapping helpers
# ---------------------------------------------------------------------------

def build_id_map(values: Sequence[Any]) -> Dict[Any, int]:
    """Create a mapping from unique values to contiguous integer IDs.

    Args:
        values: Iterable of hashable values (e.g. emails, handles).

    Returns:
        Dict mapping each unique value to an integer starting from 0.
    """
    unique = sorted(set(values))
    return {v: idx for idx, v in enumerate(unique)}


def invert_id_map(id_map: Dict[Any, int]) -> Dict[int, Any]:
    """Invert an id_map so integer keys point back to original values.

    Args:
        id_map: Mapping produced by :func:`build_id_map`.

    Returns:
        Inverted dictionary.
    """
    return {v: k for k, v in id_map.items()}


# ---------------------------------------------------------------------------
# Serialisation
# ---------------------------------------------------------------------------

def save_pickle(obj: Any, path: Path) -> None:
    """Persist an arbitrary Python object to disk via pickle.

    Args:
        obj: Object to serialise.
        path: Destination file path.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as fh:
        pickle.dump(obj, fh, protocol=pickle.HIGHEST_PROTOCOL)
    logger.info("Saved pickle → %s", path)


def load_pickle(path: Path) -> Any:
    """Load a pickled object from disk.

    Args:
        path: Source file path.

    Returns:
        De-serialised Python object.

    Raises:
        FileNotFoundError: If *path* does not exist.
    """
    if not path.exists():
        raise FileNotFoundError(f"Pickle file not found: {path}")
    with open(path, "rb") as fh:
        obj = pickle.load(fh)
    logger.info("Loaded pickle ← %s", path)
    return obj


# ---------------------------------------------------------------------------
# Timing
# ---------------------------------------------------------------------------

def timer(func: Callable) -> Callable:
    """Decorator that logs the wall-clock time of *func*.

    Args:
        func: Function to time.

    Returns:
        Wrapped function.
    """

    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        logger.info("%s completed in %.2f s", func.__name__, elapsed)
        return result

    return wrapper


# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------

def normalise_vectors(vectors: np.ndarray) -> np.ndarray:
    """L2-normalise each row of a 2-D array (for cosine similarity via IP).

    Args:
        vectors: Array of shape ``(n, d)``.

    Returns:
        Row-normalised copy of *vectors*.
    """
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1.0, norms)
    return vectors / norms
