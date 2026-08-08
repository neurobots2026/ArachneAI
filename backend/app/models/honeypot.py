from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.utils.helpers import generate_id, utc_now


class HoneypotDeployment(Base):
    """Lifecycle record for an adaptive, simulation-only honeypot."""

    __tablename__ = "honeypot_deployments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: generate_id("hpd"))
    organization_id: Mapped[str] = mapped_column(String, ForeignKey("organizations.id"), nullable=False)
    incident_id: Mapped[str] = mapped_column(String, ForeignKey("incidents.id"), nullable=False)
    simulation_id: Mapped[str] = mapped_column(String, default="")
    attack_type: Mapped[str] = mapped_column(String, default="Unknown")
    state: Mapped[str] = mapped_column(String, default="deployed")
    target_zone: Mapped[str] = mapped_column(String, default="")
    deployed_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)
