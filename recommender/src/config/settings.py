"""
Central configuration for the hybrid recommender system.

All paths are relative to the project root (recommender/).
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List


def _project_root() -> Path:
    """Return the project root directory (recommender/)."""
    return Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class PathSettings:
    """File-system paths used throughout the pipeline."""

    project_root: Path = field(default_factory=_project_root)

    @property
    def raw_data_dir(self) -> Path:
        return self.project_root / "data" / "raw"

    @property
    def processed_data_dir(self) -> Path:
        return self.project_root / "data" / "processed"

    @property
    def external_data_dir(self) -> Path:
        return self.project_root / "data" / "external"

    @property
    def model_artifacts_dir(self) -> Path:
        return self.project_root / "data" / "processed" / "models"

    @property
    def index_dir(self) -> Path:
        return self.project_root / "data" / "processed" / "indexes"

    # --- Raw CSV filenames ---------------------------------------------------
    @property
    def customers_csv(self) -> Path:
        return self.raw_data_dir / "customers_export.csv"

    @property
    def orders_csv(self) -> Path:
        return self.raw_data_dir / "orders_export_1.csv"

    @property
    def products_csv(self) -> Path:
        return self.raw_data_dir / "products_export_1.csv"

    def ensure_dirs(self) -> None:
        """Create all required directories if they don't exist."""
        for d in [
            self.raw_data_dir,
            self.processed_data_dir,
            self.external_data_dir,
            self.model_artifacts_dir,
            self.index_dir,
        ]:
            d.mkdir(parents=True, exist_ok=True)


@dataclass(frozen=True)
class EmbeddingSettings:
    """Embedding model configuration."""

    text_model_name: str = "all-MiniLM-L6-v2"
    text_embedding_dim: int = 384
    image_model_name: str = "ViT-B-32"
    image_model_pretrained: str = "openai"
    image_embedding_dim: int = 512


@dataclass(frozen=True)
class ModelSettings:
    """Training hyper-parameters."""

    cf_epochs: int = 30
    cf_loss: str = "als"
    cf_num_components: int = 64
    cf_learning_rate: float = 0.05
    cf_regularization: float = 0.01

    # Hybrid weights
    alpha: float = 0.5   # collaborative filtering weight
    beta: float = 0.3    # text similarity weight
    gamma: float = 0.2   # image similarity weight

    # Two-Tower
    two_tower_user_dim: int = 64
    two_tower_item_dim: int = 128
    two_tower_hidden_dim: int = 128
    two_tower_output_dim: int = 64
    two_tower_epochs: int = 20
    two_tower_lr: float = 1e-3
    two_tower_batch_size: int = 256


@dataclass(frozen=True)
class EvalSettings:
    """Evaluation configuration."""

    k_values: List[int] = field(default_factory=lambda: [5, 10, 20])
    train_test_ratio: float = 0.8


@dataclass(frozen=True)
class APISettings:
    """API server configuration."""

    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = False
    default_k: int = 10


@dataclass(frozen=True)
class Settings:
    """Top-level settings container."""

    paths: PathSettings = field(default_factory=PathSettings)
    embeddings: EmbeddingSettings = field(default_factory=EmbeddingSettings)
    model: ModelSettings = field(default_factory=ModelSettings)
    eval: EvalSettings = field(default_factory=EvalSettings)
    api: APISettings = field(default_factory=APISettings)


def get_settings() -> Settings:
    """Return a singleton-like Settings instance."""
    return Settings()
