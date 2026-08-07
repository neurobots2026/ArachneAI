from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class CreateOrganizationRequest(BaseModel):
    name: str
    industry: str
    employee_count: int
    cloud_provider: str = ""
    departments: list[str] = Field(default_factory=list)


class OrganizationResponse(BaseModel):
    id: str
    name: str
    industry: str
    employee_count: int
    cloud_provider: str
    departments: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}
