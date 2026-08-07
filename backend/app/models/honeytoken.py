from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.utils.helpers import generate_id, utc_now


class Honeytoken(Base):
    __tablename__ = "honeytokens"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: generate_id("ht"))
    organization_id: Mapped[str] = mapped_column(String, ForeignKey("organizations.id"), nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    fake_value: Mapped[str] = mapped_column(Text, nullable=False)
    department: Mapped[str] = mapped_column(String, default="")
    placement_path: Mapped[str] = mapped_column(String, default="")
    created_by_ai_reasoning: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="honeytokens")
    telemetry_events: Mapped[list["TelemetryEvent"]] = relationship("TelemetryEvent", back_populates="honeytoken")
