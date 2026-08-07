from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.utils.helpers import generate_id, utc_now


class TelemetryEvent(Base):
    __tablename__ = "telemetry_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: generate_id("tel"))
    honeytoken_id: Mapped[str] = mapped_column(String, ForeignKey("honeytokens.id"), nullable=False)
    source_ip: Mapped[str] = mapped_column(String, default="")
    user_agent: Mapped[str] = mapped_column(String, default="")
    endpoint: Mapped[str] = mapped_column(String, default="")
    http_method: Mapped[str] = mapped_column(String, default="GET")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    session_id: Mapped[str] = mapped_column(String, default="")
    raw_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

    honeytoken: Mapped["Honeytoken"] = relationship("Honeytoken", back_populates="telemetry_events")
    incident: Mapped["Incident | None"] = relationship("Incident", back_populates="telemetry_event", uselist=False)
