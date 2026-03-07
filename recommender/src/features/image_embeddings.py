"""
CLIP image embedding generator for products.

Downloads product images from Shopify CDN URLs and encodes them into
dense 512-dimensional vectors using OpenAI CLIP (ViT-B/32).
"""

import io
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import requests
from PIL import Image

from src.utils.helpers import save_pickle, load_pickle, normalise_vectors
from src.utils.logging import get_logger

logger = get_logger(__name__)

_DOWNLOAD_TIMEOUT: int = 10  # seconds per image


class ImageEmbedder:
    """Wrap CLIP to produce product image embeddings.

    Attributes:
        model_name: OpenCLIP model identifier.
        pretrained: Pre-trained weights tag.
        embeddings: Computed embedding matrix of shape ``(n_products, 512)``.
    """

    def __init__(
        self,
        model_name: str = "ViT-B-32",
        pretrained: str = "openai",
    ) -> None:
        self.model_name = model_name
        self.pretrained = pretrained
        self.embeddings: Optional[np.ndarray] = None
        self._model = None
        self._preprocess = None
        self._tokenizer = None

    def _load_model(self) -> None:
        """Lazy-load the CLIP model."""
        if self._model is None:
            import open_clip
            import torch

            logger.info("Loading CLIP model: %s (%s)", self.model_name, self.pretrained)
            self._model, _, self._preprocess = open_clip.create_model_and_transforms(
                self.model_name, pretrained=self.pretrained
            )
            self._model.eval()
            self._device = "cpu"
            if torch.cuda.is_available():
                self._device = "cuda"
                self._model = self._model.to(self._device)

    @staticmethod
    def _download_image(url: str) -> Optional[Image.Image]:
        """Download an image from a URL; return None on failure.

        Args:
            url: HTTP(S) image URL.

        Returns:
            PIL Image or None.
        """
        if not isinstance(url, str) or not url.startswith("http"):
            return None
        try:
            resp = requests.get(url, timeout=_DOWNLOAD_TIMEOUT)
            resp.raise_for_status()
            return Image.open(io.BytesIO(resp.content)).convert("RGB")
        except Exception as exc:
            logger.debug("Image download failed for %s: %s", url, exc)
            return None

    def fit(
        self,
        products_df: pd.DataFrame,
        image_column: str = "Image Src",
    ) -> np.ndarray:
        """Encode product images into CLIP embeddings.

        Args:
            products_df: DataFrame with an ``image_column`` containing
                image URLs.
            image_column: Column with the image URLs.

        Returns:
            Normalised embedding matrix of shape ``(n_products, 512)``.
        """
        import torch

        self._load_model()
        urls = products_df[image_column].fillna("").tolist()
        n = len(urls)
        dim = 512
        all_embeddings = np.zeros((n, dim), dtype=np.float32)

        logger.info("Encoding %d product images …", n)
        for idx, url in enumerate(urls):
            img = self._download_image(url)
            if img is None:
                continue  # zero vector for missing images

            tensor = self._preprocess(img).unsqueeze(0).to(self._device)
            with torch.no_grad():
                feat = self._model.encode_image(tensor)
            all_embeddings[idx] = feat.cpu().numpy().flatten()

            if (idx + 1) % 50 == 0:
                logger.info("  encoded %d / %d images", idx + 1, n)

        self.embeddings = normalise_vectors(all_embeddings)
        logger.info("Image embeddings shape: %s", self.embeddings.shape)
        return self.embeddings

    def save(self, path: Path) -> None:
        """Persist embeddings to disk.

        Args:
            path: Pickle file path.
        """
        save_pickle(
            {
                "model_name": self.model_name,
                "pretrained": self.pretrained,
                "embeddings": self.embeddings,
            },
            path,
        )

    def load(self, path: Path) -> None:
        """Restore embeddings from disk.

        Args:
            path: Pickle file previously written by :meth:`save`.
        """
        data = load_pickle(path)
        self.model_name = data["model_name"]
        self.pretrained = data["pretrained"]
        self.embeddings = data["embeddings"]
        logger.info("Loaded image embeddings: shape=%s", self.embeddings.shape)
