from datetime import datetime

from pydantic import BaseModel


class ReportResponse(BaseModel):
    id: str
    incident_id: str
    file_path: str
    generated_at: datetime

    model_config = {"from_attributes": True}


class DashboardSummary(BaseModel):
    total_incidents: int
    open_incidents: int
    critical_incidents: int
    honeytokens_deployed: int
    telemetry_events_24h: int


class ThreatItem(BaseModel):
    attack_type: str
    count: int
    avg_risk_score: float


class ActivityItem(BaseModel):
    id: str
    type: str
    description: str
    timestamp: datetime


class DashboardStatus(BaseModel):
    state: str
    open_incidents: int
    recent_activity: list[ActivityItem]
    summary: DashboardSummary
