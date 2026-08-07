from datetime import datetime

from pydantic import BaseModel, Field


class TelemetryEventRequest(BaseModel):
    honeytoken_id: str
    source_ip: str = ""
    user_agent: str = ""
    endpoint: str = ""
    http_method: str = "GET"
    session_id: str = ""
    raw_metadata: dict = Field(default_factory=dict)


class TelemetryResponse(BaseModel):
    id: str
    honeytoken_id: str
    source_ip: str
    user_agent: str
    endpoint: str
    http_method: str
    timestamp: datetime
    session_id: str
    raw_metadata: dict

    model_config = {"from_attributes": True}
