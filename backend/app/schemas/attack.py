from datetime import datetime

from pydantic import BaseModel


class StartSimulationRequest(BaseModel):
    scenario_name: str


class SimulationResponse(BaseModel):
    id: str
    organization_id: str
    scenario_name: str
    status: str
    started_at: datetime | None = None
    finished_at: datetime | None = None
    resulting_incident_id: str | None = None

    model_config = {"from_attributes": True}
