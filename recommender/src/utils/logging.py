"""
Structured logging utilities for the recommender system.

Usage:
    from src.utils.logging import get_logger
    logger = get_logger(__name__)
    logger.info("Training started", extra={"epochs": 30})
"""

import logging
import sys
from typing import Optional


_LOG_FORMAT = (
    "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
)
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_configured: bool = False


def _configure_root(level: int = logging.INFO) -> None:
    """One-time configuration of the root logger."""
    global _configured
    if _configured:
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    formatter = logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(handler)

    _configured = True


def get_logger(name: str, level: Optional[int] = None) -> logging.Logger:
    """Return a named logger.

    Args:
        name: Typically ``__name__`` of the calling module.
        level: Override the default INFO level if needed.

    Returns:
        Configured :class:`logging.Logger` instance.
    """
    _configure_root(level or logging.INFO)
    logger = logging.getLogger(name)
    if level is not None:
        logger.setLevel(level)
    return logger
