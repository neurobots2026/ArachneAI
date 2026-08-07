from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.utils.helpers import generate_id, utc_now


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: generate_id("inc"))
    organization_id: Mapped[str] = mapped_column(String, ForeignKey("organizations.id"), nullable=False)
    telemetry_event_id: Mapped[str] = mapped_column(String, ForeignKey("telemetry_events.id"), nullable=False)
    status: Mapped[str] = mapped_column(String, default="open")
    attack_type: Mapped[str] = mapped_column(String, default="Unknown")
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    ai_reasoning: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="incidents")
    telemetry_event: Mapped["TelemetryEvent"] = relationship("TelemetryEvent", back_populates="incident")
    ai_investigations: Mapped[list["AIInvestigation"]] = relationship("AIInvestigation", back_populates="incident")
    recommendations: Mapped[list["Recommendation"]] = relationship("Recommendation", back_populates="incident")
    reports: Mapped[list["Report"]] = relationship("Report", back_populates="incident")
