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
    is_simulation = bool(request and request.headers.get("x-simulation-id"))
    db.add(
        SiteActivity(
            organization_id=org_id,
            event_type="simulation" if is_simulation else "normal",
            description=description,
            endpoint=endpoint,
            source_ip=ip,
        )
    )
    db.commit()


def _trigger_honeytoken(
    db: Session,
    honeytoken_id: str,
    request: Request,
    endpoint: str,
    attack_type_hint: str = "",
    artifacts: list[dict] | None = None,
):
    from app.schemas.telemetry import TelemetryEventRequest
    from app.models.telemetry import TelemetryEvent

    simulation_id = request.headers.get("x-simulation-id", "")
    if simulation_id and attack_type_hint:
        recent_events = db.query(TelemetryEvent).order_by(TelemetryEvent.timestamp.desc()).limit(100).all()
        if any(
            (event.raw_metadata or {}).get("simulation_id") == simulation_id
            and (event.raw_metadata or {}).get("attack_type_hint") == attack_type_hint
            for event in recent_events
        ):
            return

    telemetry_service.record_event(
        db,
        TelemetryEventRequest(
            honeytoken_id=honeytoken_id,
            source_ip=request.client.host if request.client else "127.0.0.1",
            user_agent=request.headers.get("user-agent", ""),
            endpoint=endpoint,
            http_method=request.method,
            session_id=request.headers.get("x-session-id", ""),
            raw_metadata={
                "target_site": True,
                "event_type": "alert",
                "attack_type_hint": attack_type_hint,
                "simulation_id": simulation_id,
                "deception_response": [
                    "honeytoken_triggered",
                    "adaptive_honeypot_deployed",
                ],
                "artifacts": artifacts or [],
                "data_classification": "synthetic_decoy_only",
            },
        ),
    )


def record_request_anomaly(
    db: Session,
    org_id: str,
    request: Request,
    attack_type_hint: str,
    placement_hint: str,
    artifacts: list[dict] | None = None,
) -> bool:
    """Record a safe, signature-only attack demo without touching real data."""
    honeytoken = (
        db.query(Honeytoken)
        .filter(
            Honeytoken.organization_id == org_id,
            Honeytoken.placement_path.contains(placement_hint),
        )
        .first()
    )
    if not honeytoken:
        return False
    _trigger_honeytoken(
        db,
        honeytoken.id,
        request,
        request.url.path,
        attack_type_hint,
        artifacts,
    )
    return True


def register(db: Session, org_id: str, data: TargetRegisterRequest, request: Request) -> TargetTokenResponse:
    if data.role and data.role.lower() != "student":
        # Treat privilege-bearing registration input as a bounded mass-
        # assignment exercise. It produces telemetry and a non-persisted,
        # student-scoped token, never an organization account.
        ht = (
            db.query(Honeytoken)
            .filter(
                Honeytoken.organization_id == org_id,
                Honeytoken.placement_path.contains("api_abuse"),
            )
            .first()
        )
        if ht:
            _trigger_honeytoken(
                db,
                ht.id,
                request,
                "/target/auth/register",
                "API Abuse",
                [{"name": "role", "value": data.role, "classification": "rejected_input"}],
            )
        token = create_access_token(
            {"sub": "simulated_mass_assignment", "type": "target", "role": "student", "org_id": org_id}
        )
        return TargetTokenResponse(access_token=token)
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
            user_token = db.query(Honeytoken).filter(Honeytoken.id == user.honeytoken_id).first()
            if not user_token or "session" not in user_token.placement_path:
                _trigger_honeytoken(
                    db,
                    user.honeytoken_id,
                    request,
                    "/target/auth/login",
                    "Broken Auth",
                    [{"name": "decoy_session", "value": "cw_demo_session_redacted", "classification": "synthetic"}],
                )
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
            _trigger_honeytoken(
                db,
                ht.id,
                request,
                "/target/auth/login",
                "Broken Auth",
                [{"name": "credential", "value": leaked_email, "classification": "honeytoken"}],
            )
            token = create_access_token(
                {
                    "sub": "simulated_backup_identity",
                    "type": "target",
                    "role": "decoy",
                    "org_id": org_id,
                    "data_scope": "synthetic_decoy_only",
                }
            )
            return TargetTokenResponse(access_token=token)
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
    # Storing inert review text is not the detection boundary. The controlled
    # telemetry beacon is what confirms the simulated payload was rendered.
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


def get_student(
    db: Session,
    org_id: str,
    student_id: str,
    request: Request,
    requester: TargetUser,
) -> StudentRecordResponse:
    numeric_candidate = student_id
    for prefix in ("CW-", "CW_"):
        if numeric_candidate.upper().startswith(prefix):
            numeric_candidate = numeric_candidate[len(prefix):]
            break
    reserved_decoy_request = bool(
        numeric_candidate.isdigit() and int(numeric_candidate) >= 9000
    )

    # A simulation may enumerate only the explicitly reserved ghost range. It
    # cannot use a known UUID to promote a real TargetUser into its output.
    if request.headers.get("x-simulation-id") and not reserved_decoy_request:
        raise NotFoundError("Student not found")

    if reserved_decoy_request:
        ghost = db.query(TargetUser).filter(
            TargetUser.organization_id == org_id,
            TargetUser.student_id == "CW-GHOST-99999",
        ).first()
        if ghost:
            _trigger_honeytoken(
                db,
                ghost.honeytoken_id,
                request,
                f"/target/students/{student_id}",
                "IDOR",
                [{"name": "student_record", "value": ghost.student_id, "classification": "synthetic_decoy"}],
            )
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

    user = db.query(TargetUser).filter(
        TargetUser.organization_id == org_id,
        TargetUser.id == student_id,
    ).first()
    if not user:
        raise NotFoundError("Student not found")
    if requester.role != "admin" and requester.id != user.id:
        raise AppError("Student access denied", 403)
    return StudentRecordResponse.model_validate(user)


def list_documents(db: Session, org_id: str, user: TargetUser) -> list[DocumentResponse]:
    q = db.query(Document).filter(Document.organization_id == org_id)
    if user.role != "admin":
        q = q.filter(
            Document.is_honeytoken == False,  # noqa: E712
            (Document.owner_id == user.id) | (Document.owner_id.is_(None)),
        )
    docs = q.all()
    return [DocumentResponse.model_validate(d) for d in docs]


def get_document(db: Session, org_id: str, doc_id: str, request: Request, user: TargetUser) -> DocumentDetailResponse:
    doc = db.query(Document).filter(Document.id == doc_id, Document.organization_id == org_id).first()
    if not doc:
        raise NotFoundError("Document not found")
    if user.role != "admin" and (doc.is_honeytoken or (doc.owner_id and doc.owner_id != user.id)):
        raise AppError("Document access denied", 403)
    if doc.is_honeytoken and doc.honeytoken_id:
        _trigger_honeytoken(
            db,
            doc.honeytoken_id,
            request,
            f"/target/documents/{doc_id}",
            "File Upload",
            [{"name": doc.title, "value": doc.content[:160], "classification": "synthetic_decoy"}],
        )
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
    if ht and not request.headers.get("x-csrf-token"):
        _trigger_honeytoken(
            db,
            ht.id,
            request,
            "/target/profile/update",
            "CSRF",
            [{"name": "profile_email", "value": data.email or user.email, "classification": "simulated_mutation"}],
        )
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
