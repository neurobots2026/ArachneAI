from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.utils.helpers import generate_id


class AttackSimulation(Base):
    __tablename__ = "attack_simulations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: generate_id("sim"))
    organization_id: Mapped[str] = mapped_column(String, ForeignKey("organizations.id"), nullable=False)
    scenario_name: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending")
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resulting_incident_id: Mapped[str | None] = mapped_column(String, ForeignKey("incidents.id"), nullable=True)
