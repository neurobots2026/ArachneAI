from datetime import datetime

from pydantic import BaseModel, EmailStr


class TargetRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    major: str = "Undeclared"


class TargetLoginRequest(BaseModel):
    email: str
    password: str


class TargetTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TargetUserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    major: str
    student_id: str
    gpa: float

    model_config = {"from_attributes": True}


class CourseResponse(BaseModel):
    id: str
    code: str
    title: str
    description: str
    credits: int
    instructor: str
    schedule: str
    enrolled: bool = False
    grade: str | None = None

    model_config = {"from_attributes": True}


class DocumentResponse(BaseModel):
    id: str
    title: str
    file_path: str
    category: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentDetailResponse(DocumentResponse):
    content: str


class ReviewRequest(BaseModel):
    content: str


class ReviewResponse(BaseModel):
    id: str
    course_id: str
    user_name: str
    content: str
    created_at: datetime


class AdmissionRequest(BaseModel):
    name: str
    email: EmailStr
    program: str
    message: str = ""


class ProfileUpdateRequest(BaseModel):
    email: str | None = None
    major: str | None = None


class StudentRecordResponse(BaseModel):
    id: str
    name: str
    email: str
    major: str
    student_id: str
    gpa: float
    role: str


class NewsItem(BaseModel):
    title: str
    date: str
    summary: str


class ProgramItem(BaseModel):
    name: str
    description: str
    duration: str
