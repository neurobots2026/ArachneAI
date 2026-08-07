from fastapi import Request
from sqlalchemy.orm import Session

from app.core.auth import create_access_token, hash_password, verify_password
from app.core.exceptions import AppError, NotFoundError, UnauthorizedError
from app.models.honeytoken import Honeytoken
from app.models.target import (
    Admission,
    Course,
    CourseReview,
    Document,
    Enrollment,
    SiteActivity,
    TargetUser,
)
from app.schemas.target import (
    AdmissionRequest,
    CourseResponse,
    DocumentDetailResponse,
    DocumentResponse,
    ProfileUpdateRequest,
    ReviewRequest,
    ReviewResponse,
    StudentRecordResponse,
    TargetLoginRequest,
    TargetRegisterRequest,
    TargetTokenResponse,
    TargetUserResponse,
)
from app.services import telemetry_service


def _org_id() -> str:
    from app.database.session import SessionLocal
    from app.models.organization import Organization

    db = SessionLocal()
    try:
        org = db.query(Organization).first()
        return org.id if org else ""
    finally:
        db.close()


def log_activity(db: Session, org_id: str, description: str, endpoint: str, request: Request | None = None):
    ip = request.client.host if request and request.client else "127.0.0.1"
    db.add(
        SiteActivity(
            organization_id=org_id,
            event_type="normal",
            description=description,
            endpoint=endpoint,
            source_ip=ip,
        )
    )
    db.commit()


def _trigger_honeytoken(db: Session, honeytoken_id: str, request: Request, endpoint: str):
    from app.schemas.telemetry import TelemetryEventRequest

    telemetry_service.record_event(
        db,
        TelemetryEventRequest(
            honeytoken_id=honeytoken_id,
            source_ip=request.client.host if request.client else "127.0.0.1",
            user_agent=request.headers.get("user-agent", ""),
            endpoint=endpoint,
            http_method=request.method,
            session_id=request.headers.get("x-session-id", ""),
            raw_metadata={"target_site": True, "event_type": "alert"},
        ),
    )


def register(db: Session, org_id: str, data: TargetRegisterRequest, request: Request) -> TargetTokenResponse:
    if db.query(TargetUser).filter(TargetUser.email == data.email).first():
        raise AppError("Email already registered", 400)
    count = db.query(TargetUser).filter(TargetUser.organization_id == org_id, TargetUser.is_honeytoken == False).count()  # noqa: E712
    user = TargetUser(
        organization_id=org_id,
        email=data.email,
        hashed_password=hash_password(data.password),
        name=data.name,
        role="student",
        major=data.major,
        student_id=f"CW-{2026000 + count + 1}",
        gpa=3.5,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_activity(db, org_id, f"New student registered: {data.email}", "/target/auth/register", request)
    token = create_access_token({"sub": user.id, "type": "target", "role": user.role, "org_id": org_id})
    return TargetTokenResponse(access_token=token)


def login(db: Session, org_id: str, data: TargetLoginRequest, request: Request) -> TargetTokenResponse:
    user = db.query(TargetUser).filter(TargetUser.email == data.email).first()
    if user and verify_password(data.password, user.hashed_password):
        log_activity(db, org_id, f"Login: {data.email}", "/target/auth/login", request)
        if user.is_honeytoken and user.honeytoken_id:
            _trigger_honeytoken(db, user.honeytoken_id, request, "/target/auth/login")
        token = create_access_token({"sub": user.id, "type": "target", "role": user.role, "org_id": org_id})
        return TargetTokenResponse(access_token=token)

    ht = (
        db.query(Honeytoken)
        .filter(Honeytoken.organization_id == org_id, Honeytoken.type == "credential")
        .first()
    )
    if ht and ":" in ht.fake_value:
        leaked_email, leaked_pass = ht.fake_value.split(":", 1)
        if data.email == leaked_email and data.password == leaked_pass:
            _trigger_honeytoken(db, ht.id, request, "/target/auth/login")
    raise UnauthorizedError("Invalid credentials")


def get_me(db: Session, user_id: str) -> TargetUserResponse:
    user = db.query(TargetUser).filter(TargetUser.id == user_id).first()
    if not user:
        raise NotFoundError("User not found")
    return TargetUserResponse.model_validate(user)


def list_courses(db: Session, org_id: str, user_id: str | None = None) -> list[CourseResponse]:
    courses = db.query(Course).filter(Course.organization_id == org_id).all()
    enrollments = {}
    if user_id:
        enrollments = {
            e.course_id: e.grade
            for e in db.query(Enrollment).filter(Enrollment.user_id == user_id).all()
        }
    return [
        CourseResponse(
            id=c.id,
            code=c.code,
            title=c.title,
            description=c.description,
            credits=c.credits,
            instructor=c.instructor,
            schedule=c.schedule,
            enrolled=c.id in enrollments,
            grade=enrollments.get(c.id),
        )
        for c in courses
    ]


def enroll(db: Session, org_id: str, user_id: str, course_id: str, request: Request) -> dict:
    course = db.query(Course).filter(Course.id == course_id, Course.organization_id == org_id).first()
    if not course:
        raise NotFoundError("Course not found")
    existing = db.query(Enrollment).filter(Enrollment.user_id == user_id, Enrollment.course_id == course_id).first()
    if existing:
        return {"status": "already_enrolled"}
    db.add(Enrollment(user_id=user_id, course_id=course_id))
    db.commit()
    log_activity(db, org_id, f"Enrolled in {course.code}", f"/target/courses/{course_id}/enroll", request)
    return {"status": "enrolled", "course": course.code}


def add_review(db: Session, org_id: str, user_id: str, course_id: str, data: ReviewRequest, request: Request) -> ReviewResponse:
    user = db.query(TargetUser).filter(TargetUser.id == user_id).first()
    review = CourseReview(course_id=course_id, user_id=user_id, content=data.content)
    db.add(review)
    db.commit()
    db.refresh(review)
    log_activity(db, org_id, f"Course review posted on {course_id}", f"/target/courses/{course_id}/review", request)
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org_id, Honeytoken.placement_path.contains("xss")).first()
    if ht and ("<script" in data.content.lower() or "onerror" in data.content.lower()):
        _trigger_honeytoken(db, ht.id, request, f"/target/courses/{course_id}/review")
    return ReviewResponse(
        id=review.id,
        course_id=course_id,
        user_name=user.name if user else "Anonymous",
        content=review.content,
        created_at=review.created_at,
    )


def get_reviews(db: Session, course_id: str) -> list[ReviewResponse]:
    reviews = db.query(CourseReview).filter(CourseReview.course_id == course_id).order_by(CourseReview.created_at.desc()).all()
    result = []
    for r in reviews:
        user = db.query(TargetUser).filter(TargetUser.id == r.user_id).first()
        result.append(
            ReviewResponse(
                id=r.id,
                course_id=r.course_id,
                user_name=user.name if user else "Anonymous",
                content=r.content,
                created_at=r.created_at,
            )
        )
    return result


def get_student(db: Session, org_id: str, student_id: str, request: Request) -> StudentRecordResponse:
    user = db.query(TargetUser).filter(TargetUser.organization_id == org_id, TargetUser.id == student_id).first()
    if not user:
        ghost = db.query(TargetUser).filter(
            TargetUser.organization_id == org_id,
            TargetUser.is_honeytoken == True,  # noqa: E712
        ).first()
        if ghost:
            _trigger_honeytoken(db, ghost.honeytoken_id, request, f"/target/students/{student_id}")
            return StudentRecordResponse(
                id=ghost.id,
                name=ghost.name,
                email=ghost.email,
                major=ghost.major,
                student_id=ghost.student_id,
                gpa=ghost.gpa,
                role=ghost.role,
            )
        raise NotFoundError("Student not found")
    return StudentRecordResponse.model_validate(user)


def list_documents(db: Session, org_id: str, user: TargetUser) -> list[DocumentResponse]:
    q = db.query(Document).filter(Document.organization_id == org_id)
    if user.role != "admin":
        q = q.filter((Document.owner_id == user.id) | (Document.owner_id.is_(None)))
    docs = q.all()
    return [DocumentResponse.model_validate(d) for d in docs]


def get_document(db: Session, org_id: str, doc_id: str, request: Request, user: TargetUser) -> DocumentDetailResponse:
    doc = db.query(Document).filter(Document.id == doc_id, Document.organization_id == org_id).first()
    if not doc:
        raise NotFoundError("Document not found")
    if doc.is_honeytoken and doc.honeytoken_id:
        _trigger_honeytoken(db, doc.honeytoken_id, request, f"/target/documents/{doc_id}")
    log_activity(db, org_id, f"Document accessed: {doc.title}", f"/target/documents/{doc_id}", request)
    return DocumentDetailResponse.model_validate(doc)


def submit_admission(db: Session, org_id: str, data: AdmissionRequest, request: Request) -> dict:
    db.add(
        Admission(
            organization_id=org_id,
            name=data.name,
            email=data.email,
            program=data.program,
            message=data.message,
        )
    )
    db.commit()
    log_activity(db, org_id, f"Admission inquiry from {data.email}", "/target/admissions", request)
    return {"status": "received", "message": "Thank you for your application. We will contact you within 5 business days."}


def update_profile(db: Session, org_id: str, user_id: str, data: ProfileUpdateRequest, request: Request) -> TargetUserResponse:
    user = db.query(TargetUser).filter(TargetUser.id == user_id).first()
    if not user:
        raise NotFoundError("User not found")
    if data.email:
        user.email = data.email
    if data.major:
        user.major = data.major
    db.commit()
    db.refresh(user)
    log_activity(db, org_id, f"Profile updated: {user.email}", "/target/profile/update", request)
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org_id, Honeytoken.placement_path.contains("csrf")).first()
    if ht:
        _trigger_honeytoken(db, ht.id, request, "/target/profile/update")
    return TargetUserResponse.model_validate(user)


def admin_list_students(db: Session, org_id: str) -> list[StudentRecordResponse]:
    users = (
        db.query(TargetUser)
        .filter(TargetUser.organization_id == org_id, TargetUser.is_honeytoken == False)  # noqa: E712
        .all()
    )
    return [StudentRecordResponse.model_validate(u) for u in users]


def admin_list_all_documents(db: Session, org_id: str, request: Request) -> list[DocumentResponse]:
    docs = db.query(Document).filter(Document.organization_id == org_id).all()
    log_activity(db, org_id, "Admin viewed document directory", "/target/admin/documents", request)
    return [DocumentResponse.model_validate(d) for d in docs]
