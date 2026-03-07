"""
Pydantic request / response schemas for the recommender API.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class RecommendationItem(BaseModel):
    """A single recommended product."""

    product_id: int = Field(..., description="Integer product index")
    score: float = Field(..., description="Recommendation score")
    name: str = Field("", description="Human-readable product name")


class RecommendationResponse(BaseModel):
    """Response for recommendation endpoints."""

    user_id: Optional[int] = Field(None, description="Requesting user ID")
    product_id: Optional[int] = Field(None, description="Query product ID")
    recommendations: List[RecommendationItem] = Field(
        default_factory=list,
        description="Ordered list of recommendations",
    )
    strategy: str = Field("hybrid", description="Strategy used (hybrid, popularity, content)")


class MetricsResponse(BaseModel):
    """Response for the /metrics endpoint."""

    metrics: dict = Field(default_factory=dict, description="Latest evaluation metrics")
    model_info: dict = Field(
        default_factory=dict,
        description="Model metadata (n_users, n_items, weights …)",
    )


class RetrainResponse(BaseModel):
    """Response for the /retrain endpoint."""

    status: str = Field("success", description="Retrain outcome")
    message: str = Field("", description="Details")
    metrics: dict = Field(default_factory=dict, description="Post-retrain evaluation metrics")
