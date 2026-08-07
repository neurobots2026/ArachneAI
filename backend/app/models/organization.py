from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.utils.helpers import generate_id, utc_now


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: generate_id("org"))
    name: Mapped[str] = mapped_column(String, nullable=False)
    industry: Mapped[str] = mapped_column(String, nullable=False)
    employee_count: Mapped[int] = mapped_column(Integer, default=0)
    cloud_provider: Mapped[str] = mapped_column(String, default="")
    departments: Mapped[list] = mapped_column(JSON, default=list)
    deception_strategy: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    users: Mapped[list["User"]] = relationship("User", back_populates="organization")
    honeytokens: Mapped[list["Honeytoken"]] = relationship("Honeytoken", back_populates="organization")
    incidents: Mapped[list["Incident"]] = relationship("Incident", back_populates="organization")
