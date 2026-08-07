from datetime import datetime

from pydantic import BaseModel

from app.schemas.telemetry import TelemetryResponse


class RecommendationResponse(BaseModel):
    id: str
    action: str
    status: str
    approved_by: str | None = None

    model_config = {"from_attributes": True}


class AIInvestigationResponse(BaseModel):
    id: str
    agent_name: str
    input_summary: str
    output_summary: str
    status: str
    started_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class IncidentResponse(BaseModel):
    id: str
    organization_id: str
    status: str
    attack_type: str
    risk_score: float
    confidence_score: float
    ai_reasoning: str
    created_at: datetime
    updated_at: datetime
    telemetry: TelemetryResponse | None = None
    recommendations: list[RecommendationResponse] = []
    ai_investigations: list[AIInvestigationResponse] = []

    model_config = {"from_attributes": True}


class ApproveRecommendationRequest(BaseModel):
    recommendation_id: str
    approved: bool = True
