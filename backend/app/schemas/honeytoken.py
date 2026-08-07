from datetime import datetime

from pydantic import BaseModel, Field


class CreateHoneytokenRequest(BaseModel):
    type: str
    name: str
    department: str = ""
    placement_path: str = ""
    created_by_ai_reasoning: str = ""


class HoneytokenResponse(BaseModel):
    id: str
    type: str
    name: str
    department: str
    placement_path: str
    created_by_ai_reasoning: str = ""
    created_at: datetime
    fake_value: str | None = None

    model_config = {"from_attributes": True}


class DeceptionStrategyItem(BaseModel):
    type: str
    name: str
    department: str
    placement_path: str
    reasoning: str = ""


class DeceptionStrategy(BaseModel):
    assets: list[str] = Field(default_factory=list)
    honeytokens: list[DeceptionStrategyItem] = Field(default_factory=list)
    justification: str = ""


class GenerateFromStrategyRequest(BaseModel):
    strategy: DeceptionStrategy
