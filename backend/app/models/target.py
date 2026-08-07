from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.utils.helpers import generate_id, utc_now


class TargetUser(Base):
    __tablename__ = "target_users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: generate_id("tu"))
    organization_id: Mapped[str] = mapped_column(String, ForeignKey("organizations.id"), nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="student")
    major: Mapped[str] = mapped_column(String, default="")
    student_id: Mapped[str] = mapped_column(String, default="")
    gpa: Mapped[float] = mapped_column(Float, default=0.0)
    is_honeytoken: Mapped[bool] = mapped_column(Boolean, default=False)
    honeytoken_id: Mapped[str | None] = mapped_column(String, ForeignKey("honeytokens.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    enrollments: Mapped[list["Enrollment"]] = relationship("Enrollment", back_populates="user")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: generate_id("crs"))
    organization_id: Mapped[str] = mapped_column(String, ForeignKey("organizations.id"), nullable=False)
    code: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    credits: Mapped[int] = mapped_column(default=3)
    instructor: Mapped[str] = mapped_column(String, default="")
    schedule: Mapped[str] = mapped_column(String, default="")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: generate_id("enr"))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("target_users.id"), nullable=False)
    course_id: Mapped[str] = mapped_column(String, ForeignKey("courses.id"), nullable=False)
    grade: Mapped[str] = mapped_column(String, default="In Progress")

    user: Mapped["TargetUser"] = relationship("TargetUser", back_populates="enrollments")
    course: Mapped["Course"] = relationship("Course")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: generate_id("doc"))
    organization_id: Mapped[str] = mapped_column(String, ForeignKey("organizations.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, default="general")
    content: Mapped[str] = mapped_column(Text, default="")
    owner_id: Mapped[str | None] = mapped_column(String, ForeignKey("target_users.id"), nullable=True)
    is_honeytoken: Mapped[bool] = mapped_column(Boolean, default=False)
    honeytoken_id: Mapped[str | None] = mapped_column(String, ForeignKey("honeytokens.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class CourseReview(Base):
    __tablename__ = "course_reviews"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: generate_id("rev"))
    course_id: Mapped[str] = mapped_column(String, ForeignKey("courses.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("target_users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class Admission(Base):
    __tablename__ = "admissions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: generate_id("adm"))
    organization_id: Mapped[str] = mapped_column(String, ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    program: Mapped[str] = mapped_column(String, default="")
    message: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class SiteActivity(Base):
    __tablename__ = "site_activities"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: generate_id("act"))
    organization_id: Mapped[str] = mapped_column(String, ForeignKey("organizations.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String, default="normal")
    description: Mapped[str] = mapped_column(String, nullable=False)
    endpoint: Mapped[str] = mapped_column(String, default="")
    source_ip: Mapped[str] = mapped_column(String, default="127.0.0.1")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
