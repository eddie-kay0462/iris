"""
Two-Tower neural retrieval model.

User tower embeds user features (RFM scores + average interaction
embeddings), item tower embeds item features (text + image embeddings).
The towers produce fixed-dimension vectors whose dot product yields a
relevance score.
"""

from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from src.utils.helpers import save_pickle, load_pickle
from src.utils.logging import get_logger

logger = get_logger(__name__)


class UserTower(nn.Module):
    """Encodes user features into a latent embedding."""

    def __init__(self, input_dim: int, hidden_dim: int, output_dim: int) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, output_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class ItemTower(nn.Module):
    """Encodes item features into a latent embedding."""

    def __init__(self, input_dim: int, hidden_dim: int, output_dim: int) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, output_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class TwoTowerModel:
    """Two-tower retrieval model with fit/predict/save/load interface.

    Attributes:
        user_dim: Input dimension for user features.
        item_dim: Input dimension for item features.
        hidden_dim: Hidden layer size for both towers.
        output_dim: Shared embedding dimension.
        epochs: Number of training epochs.
        lr: Learning rate.
        batch_size: Training batch size.
    """

    def __init__(
        self,
        user_dim: int = 64,
        item_dim: int = 128,
        hidden_dim: int = 128,
        output_dim: int = 64,
        epochs: int = 20,
        lr: float = 1e-3,
        batch_size: int = 256,
    ) -> None:
        self.user_dim = user_dim
        self.item_dim = item_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        self.epochs = epochs
        self.lr = lr
        self.batch_size = batch_size

        self.user_tower: Optional[UserTower] = None
        self.item_tower: Optional[ItemTower] = None
        self._device = "cuda" if torch.cuda.is_available() else "cpu"

    def fit(
        self,
        user_features: np.ndarray,
        item_features: np.ndarray,
        interactions: np.ndarray,
    ) -> "TwoTowerModel":
        """Train both towers using sampled positive/negative pairs.

        Args:
            user_features: Array of shape ``(n_users, user_dim)``.
            item_features: Array of shape ``(n_items, item_dim)``.
            interactions: Array of shape ``(n_pairs, 3)`` with columns
                ``[user_id, item_id, label]``, where label ∈ {0, 1}.

        Returns:
            Self (for chaining).
        """
        self.user_dim = user_features.shape[1]
        self.item_dim = item_features.shape[1]

        self.user_tower = UserTower(self.user_dim, self.hidden_dim, self.output_dim).to(self._device)
        self.item_tower = ItemTower(self.item_dim, self.hidden_dim, self.output_dim).to(self._device)

        optimizer = torch.optim.Adam(
            list(self.user_tower.parameters()) + list(self.item_tower.parameters()),
            lr=self.lr,
        )
        criterion = nn.BCEWithLogitsLoss()

        # Build training tensors
        u_idx = torch.LongTensor(interactions[:, 0].astype(int))
        i_idx = torch.LongTensor(interactions[:, 1].astype(int))
        labels = torch.FloatTensor(interactions[:, 2])

        user_feat_tensor = torch.FloatTensor(user_features).to(self._device)
        item_feat_tensor = torch.FloatTensor(item_features).to(self._device)

        dataset = TensorDataset(u_idx, i_idx, labels)
        loader = DataLoader(dataset, batch_size=self.batch_size, shuffle=True)

        logger.info("Training TwoTowerModel for %d epochs on %d pairs", self.epochs, len(interactions))
        self.user_tower.train()
        self.item_tower.train()

        for epoch in range(self.epochs):
            total_loss = 0.0
            for batch_u, batch_i, batch_labels in loader:
                batch_labels = batch_labels.to(self._device)
                u_emb = self.user_tower(user_feat_tensor[batch_u])
                i_emb = self.item_tower(item_feat_tensor[batch_i])
                logits = (u_emb * i_emb).sum(dim=1)

                loss = criterion(logits, batch_labels)
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                total_loss += loss.item()

            if (epoch + 1) % 5 == 0:
                logger.info("Epoch %d/%d  loss=%.4f", epoch + 1, self.epochs, total_loss / len(loader))

        logger.info("TwoTowerModel training complete")
        return self

    def predict(
        self,
        user_id: int,
        user_features: np.ndarray,
        item_features: np.ndarray,
        k: int = 10,
        exclude: Optional[List[int]] = None,
    ) -> List[Tuple[int, float]]:
        """Score all items for a user and return top-k.

        Args:
            user_id: Integer user index.
            user_features: Full user feature matrix.
            item_features: Full item feature matrix.
            k: Number of items to return.
            exclude: Item IDs to exclude.

        Returns:
            List of (product_id, score) tuples.
        """
        if self.user_tower is None or self.item_tower is None:
            raise RuntimeError("Model has not been fitted yet.")

        self.user_tower.eval()
        self.item_tower.eval()

        with torch.no_grad():
            u_feat = torch.FloatTensor(user_features[user_id:user_id + 1]).to(self._device)
            i_feat = torch.FloatTensor(item_features).to(self._device)
            u_emb = self.user_tower(u_feat)
            i_emb = self.item_tower(i_feat)
            scores = (u_emb * i_emb).sum(dim=1).cpu().numpy()

        if exclude:
            for eid in exclude:
                if 0 <= eid < len(scores):
                    scores[eid] = -np.inf

        top_k_idx = np.argsort(-scores)[:k]
        return [(int(idx), float(scores[idx])) for idx in top_k_idx]

    def save(self, path: Path) -> None:
        """Persist model state to disk.

        Args:
            path: File path (will save as PyTorch state dict + metadata pickle).
        """
        if self.user_tower is None or self.item_tower is None:
            raise RuntimeError("Cannot save unfitted model.")

        state = {
            "user_tower": self.user_tower.state_dict(),
            "item_tower": self.item_tower.state_dict(),
            "user_dim": self.user_dim,
            "item_dim": self.item_dim,
            "hidden_dim": self.hidden_dim,
            "output_dim": self.output_dim,
        }
        save_pickle(state, path)

    def load(self, path: Path) -> None:
        """Restore model from disk.

        Args:
            path: File previously written by :meth:`save`.
        """
        state = load_pickle(path)
        self.user_dim = state["user_dim"]
        self.item_dim = state["item_dim"]
        self.hidden_dim = state["hidden_dim"]
        self.output_dim = state["output_dim"]

        self.user_tower = UserTower(self.user_dim, self.hidden_dim, self.output_dim).to(self._device)
        self.item_tower = ItemTower(self.item_dim, self.hidden_dim, self.output_dim).to(self._device)
        self.user_tower.load_state_dict(state["user_tower"])
        self.item_tower.load_state_dict(state["item_tower"])
        logger.info("TwoTowerModel loaded: user_dim=%d, item_dim=%d", self.user_dim, self.item_dim)
