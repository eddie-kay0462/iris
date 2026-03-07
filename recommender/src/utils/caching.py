"""
Caching utilities for expensive computations.

Provides both in-memory LRU caching and disk-based pickle caching.
"""

import functools
import hashlib
import pickle
from pathlib import Path
from typing import Any, Callable, Optional

from src.utils.logging import get_logger

logger = get_logger(__name__)


def disk_cache(cache_dir: Path, key_prefix: str = "") -> Callable:
    """Decorator that caches the return value of a function to disk as pickle.

    The cache key is derived from ``key_prefix`` and a hash of the
    function arguments.

    Args:
        cache_dir: Directory where cached pickled objects are stored.
        key_prefix: Optional prefix prepended to the cache filename.

    Returns:
        Decorated function with disk-based caching.
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            cache_dir.mkdir(parents=True, exist_ok=True)

            # Build a deterministic key from the arguments
            raw = f"{func.__name__}:{args}:{sorted(kwargs.items())}"
            digest = hashlib.md5(raw.encode()).hexdigest()[:12]
            prefix = f"{key_prefix}_" if key_prefix else ""
            cache_path = cache_dir / f"{prefix}{func.__name__}_{digest}.pkl"

            if cache_path.exists():
                logger.info("Cache hit: %s", cache_path.name)
                with open(cache_path, "rb") as fh:
                    return pickle.load(fh)

            result = func(*args, **kwargs)

            with open(cache_path, "wb") as fh:
                pickle.dump(result, fh, protocol=pickle.HIGHEST_PROTOCOL)
            logger.info("Cached result to %s", cache_path.name)

            return result

        # Allow manual cache invalidation
        wrapper.cache_dir = cache_dir  # type: ignore[attr-defined]
        return wrapper

    return decorator


def memory_cache(maxsize: Optional[int] = 128) -> Callable:
    """Simple LRU in-memory cache decorator.

    Args:
        maxsize: Maximum number of entries to keep.  ``None`` for unbounded.

    Returns:
        Decorated function with LRU caching.
    """

    def decorator(func: Callable) -> Callable:
        return functools.lru_cache(maxsize=maxsize)(func)

    return decorator
