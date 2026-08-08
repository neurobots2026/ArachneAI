from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.models.organization import Organization
from app.models.target import TargetUser
from app.schemas.target import (
    AdmissionRequest,
    ProfileUpdateRequest,
    ReviewRequest,
    TargetLoginRequest,
    TargetRegisterRequest,
    TargetTokenResponse,
    TargetUserResponse,
)
from app.services import target_service
from app.core.auth import decode_access_token

router = APIRouter(prefix="/target", tags=["target-site"])
_CACHE_STATE = {"host": "portal.crestwood.edu", "poisoned": False}


def reset_simulated_cache() -> None:
    _CACHE_STATE.update({"host": "portal.crestwood.edu", "poisoned": False})


def _get_org(db: Session) -> Organization:
    org = db.query(Organization).filter(Organization.name == "Crestwood College").first()
    if not org:
        org = db.query(Organization).first()
    if not org:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Organization not configured")
    return org


def get_target_user(request: Request, db: Session = Depends(get_db)) -> TargetUser:
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise UnauthorizedError("Not authenticated")
    try:
        payload = decode_access_token(auth[7:])
    except ValueError:
        raise UnauthorizedError("Invalid token")
    if payload.get("type") != "target":
        raise UnauthorizedError("Invalid token scope")
    user = db.query(TargetUser).filter(TargetUser.id == payload["sub"]).first()
    if not user:
        raise UnauthorizedError("User not found")
    return user


def require_admin(user: TargetUser = Depends(get_target_user)) -> TargetUser:
    if user.role != "admin":
        raise ForbiddenError("Admin access required")
    return user


@router.get("/public/news")
def public_news():
    return [
        {"title": "Spring Enrollment Opens March 1", "date": "2026-02-15", "summary": "Register early for priority scheduling."},
        {"title": "Crestwood Ranked Top 50 Regional Colleges", "date": "2026-01-28", "summary": "U.S. News recognizes our STEM programs."},
        {"title": "Campus Sustainability Initiative Launch", "date": "2026-01-10", "summary": "Solar panels installed across residence halls."},
    ]


@router.get("/public/programs")
def public_programs():
    return [
        {"name": "Computer Science", "description": "Software engineering, AI, and cybersecurity tracks.", "duration": "4 years"},
        {"name": "Business Administration", "description": "Finance, marketing, and entrepreneurship.", "duration": "4 years"},
        {"name": "Nursing", "description": "BSN with clinical rotations at Crestwood Medical Center.", "duration": "4 years"},
        {"name": "Psychology", "description": "Research-focused curriculum with lab access.", "duration": "4 years"},
    ]


@router.get("/public/faculty")
def public_faculty():
    return [
        {"name": "Dr. Maya Chen", "title": "Associate Professor of Computer Science", "department": "Science & Technology", "focus": "Human-centered AI, trustworthy systems, computing education"},
        {"name": "Prof. Elena Martinez", "title": "Director of Cybersecurity Studies", "department": "Science & Technology", "focus": "Application security, digital ethics, resilient infrastructure"},
        {"name": "Dr. Marcus Thompson", "title": "Professor of Management", "department": "Business & Leadership", "focus": "Social enterprise, organizational culture, regional economies"},
        {"name": "Prof. Amina Davis", "title": "Assistant Professor of Nursing", "department": "Health Sciences", "focus": "Community care, health equity, clinical simulation"},
        {"name": "Dr. Samuel Anderson", "title": "Professor of Psychology", "department": "Social Sciences", "focus": "Learning and memory, adolescent development, research methods"},
        {"name": "Dr. Evelyn Foster", "title": "Associate Professor of English", "department": "Arts & Humanities", "focus": "Public humanities, contemporary fiction, community publishing"},
    ]


@router.post("/auth/register", response_model=TargetTokenResponse)
def register(req: TargetRegisterRequest, request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    return target_service.register(db, org.id, req, request)


@router.post("/auth/login", response_model=TargetTokenResponse)
def login(req: TargetLoginRequest, request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    return target_service.login(db, org.id, req, request)


@router.get("/auth/me", response_model=TargetUserResponse)
def me(user: TargetUser = Depends(get_target_user)):
    from app.database.session import SessionLocal
    db = SessionLocal()
    try:
        return target_service.get_me(db, user.id)
    finally:
        db.close()


@router.post("/auth/logout")
def logout():
    # Target sessions are bearer tokens stored by the browser; the client drops
    # the token after this acknowledgement.
    return {"status": "signed_out"}


@router.get("/portal/dashboard")
def portal_dashboard(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    session_id = request.cookies.get("session_id") or request.headers.get("x-session-id", "")
    if session_id:
        from app.models.honeytoken import Honeytoken

        ht = db.query(Honeytoken).filter(
            Honeytoken.organization_id == org.id,
            Honeytoken.placement_path.contains("session"),
        ).first()
        if ht and session_id == ht.fake_value:
            artifact = {
                "name": "decoy-dashboard.json",
                "value": {"identity": "Provost_Account", "unread_messages": 3, "documents": ["Board_Minutes_DECOY.pdf"]},
                "classification": "synthetic_decoy",
            }
            target_service._trigger_honeytoken(
                db,
                ht.id,
                request,
                "/target/portal/dashboard",
                "Session Attack",
                [artifact],
            )
            return {
                "user": {"name": "Provost_Account", "role": "decoy"},
                "courses": [],
                "documents": [artifact["value"]["documents"][0]],
                "classification": "synthetic_decoy_only",
            }

    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise UnauthorizedError("Not authenticated")
    try:
        payload = decode_access_token(auth[7:])
    except ValueError:
        raise UnauthorizedError("Invalid token")
    if payload.get("type") != "target":
        raise UnauthorizedError("Invalid token scope")
    user = db.query(TargetUser).filter(TargetUser.id == payload.get("sub")).first()
    if not user:
        raise UnauthorizedError("User not found")
    if user.is_honeytoken:
        from app.models.honeytoken import Honeytoken

        ht = db.query(Honeytoken).filter(
            Honeytoken.id == user.honeytoken_id,
            Honeytoken.organization_id == org.id,
        ).first()
        artifact = {
            "name": "decoy-dashboard.json",
            "value": {"identity": user.name, "documents": ["Board_Minutes_DECOY.pdf"]},
            "classification": "synthetic_decoy",
        }
        if ht:
            target_service._trigger_honeytoken(
                db,
                ht.id,
                request,
                "/target/portal/dashboard",
                "Session Attack",
                [artifact],
            )
        return {
            "user": {"name": user.name, "role": "decoy"},
            "courses": [],
            "documents": artifact["value"]["documents"],
            "classification": "synthetic_decoy_only",
        }
    return {
        "user": target_service.get_me(db, user.id),
        "courses": target_service.list_courses(db, org.id, user.id),
        "documents": target_service.list_documents(db, org.id, user),
        "notices": [
            "Course registration closes Friday at 17:00.",
            "Library research consultations are now available.",
        ],
    }


@router.get("/developer-resources")
def developer_resources():
    return {
        "environment": "Crestwood developer sandbox",
        "documentation": ["REST API conventions", "Portal integration guide", "Responsible disclosure"],
        "status": "available",
        "notice": "Only seeded training data is exposed in this local demonstration.",
        "packages": [
            {
                "name": "crestwood-internal-utils",
                "version": "3.4.2",
                "registry": "/api/v1/target/fake-registry/crestwood-internal-utils",
                "description": "Campus application formatting helpers",
            }
        ],
    }


@router.get("/portal/financial-aid")
def portal_financial_aid(user: TargetUser = Depends(get_target_user)):
    return {
        "student_id": user.student_id,
        "academic_year": "2026–27",
        "estimated_cost": 28640,
        "crestwood_grant": 12000,
        "federal_loan_eligibility": 5500,
        "work_study": 1000,
        "total_estimated_aid": 18500,
        "estimated_balance": 10140,
        "currency": "USD",
        "status": "provisional",
        "documents": ["FAFSA received", "Merit award confirmed"],
    }


@router.get("/courses")
def courses(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    user_id = None
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload = decode_access_token(auth[7:])
            if payload.get("type") == "target":
                user_id = payload["sub"]
        except ValueError:
            pass
    return target_service.list_courses(db, org.id, user_id)


@router.post("/courses/{course_id}/enroll")
def enroll(course_id: str, request: Request, db: Session = Depends(get_db), user: TargetUser = Depends(get_target_user)):
    org = _get_org(db)
    return target_service.enroll(db, org.id, user.id, course_id, request)


@router.post("/courses/{course_id}/review")
@router.post("/courses/{course_id}/reviews")
def post_review(course_id: str, req: ReviewRequest, request: Request, db: Session = Depends(get_db), user: TargetUser = Depends(get_target_user)):
    org = _get_org(db)
    return target_service.add_review(db, org.id, user.id, course_id, req, request)


@router.get("/courses/{course_id}/reviews")
def get_reviews(course_id: str, db: Session = Depends(get_db)):
    return target_service.get_reviews(db, course_id)


@router.get("/students/{student_id}")
def get_student(
    student_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: TargetUser = Depends(get_target_user),
):
    org = _get_org(db)
    return target_service.get_student(db, org.id, student_id, request, user)


@router.get("/documents")
def list_documents(request: Request, db: Session = Depends(get_db), user: TargetUser = Depends(get_target_user)):
    org = _get_org(db)
    return target_service.list_documents(db, org.id, user)


@router.get("/documents/{doc_id}")
def get_document(doc_id: str, request: Request, db: Session = Depends(get_db), user: TargetUser = Depends(get_target_user)):
    org = _get_org(db)
    return target_service.get_document(db, org.id, doc_id, request, user)


@router.post("/admissions")
def admissions(req: AdmissionRequest, request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    return target_service.submit_admission(db, org.id, req, request)


@router.post("/profile/update")
def update_profile(req: ProfileUpdateRequest, request: Request, db: Session = Depends(get_db), user: TargetUser = Depends(get_target_user)):
    org = _get_org(db)
    return target_service.update_profile(db, org.id, user.id, req, request)


@router.post("/portal/profile/email")
async def simulated_profile_email(request: Request, db: Session = Depends(get_db)):
    """Bounded CSRF target: report the forged mutation but never alter a real user."""
    org = _get_org(db)
    body = await request.json()
    attempted_email = body.get("email", "simulated-recipient@example.invalid")
    if not request.headers.get("x-csrf-token"):
        from app.models.honeytoken import Honeytoken

        ht = db.query(Honeytoken).filter(
            Honeytoken.organization_id == org.id,
            Honeytoken.placement_path.contains("csrf"),
        ).first()
        if ht:
            target_service._trigger_honeytoken(
                db,
                ht.id,
                request,
                "/target/portal/profile/email",
                "CSRF",
                [{"name": "attempted_email", "value": attempted_email, "classification": "simulated_mutation"}],
            )
        return {
            "status": "captured",
            "profile_changed": False,
            "attempted_email": attempted_email,
            "data_classification": "simulation_only",
        }
    return {"status": "rejected", "profile_changed": False, "message": "Use the authenticated profile endpoint"}


@router.get("/admin/students")
def admin_students(db: Session = Depends(get_db), user: TargetUser = Depends(require_admin)):
    org = _get_org(db)
    return target_service.admin_list_students(db, org.id)


@router.get("/admin/documents")
def admin_documents(request: Request, db: Session = Depends(get_db), user: TargetUser = Depends(require_admin)):
    org = _get_org(db)
    return target_service.admin_list_all_documents(db, org.id, request)


@router.post("/admin/ping")
@router.post("/admin/tools/ping")
async def admin_ping(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    body = await request.json()
    host = body.get("host", "")
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("cmd")).first()
    if ht and (";" in host or "|" in host or "`" in host):
        target_service._trigger_honeytoken(
            db,
            ht.id,
            request,
            "/target/admin/tools/ping",
            "Command Injection",
            [{"name": "Exam_Answer_Key.pdf", "value": "DECOY: CS-301 practice key — answer sequence B,D,A,C", "classification": "synthetic_decoy"}],
        )
    target_service.log_activity(db, org.id, f"Ping diagnostic: {host[:50]}", "/target/admin/ping", request)
    response = {
        "status": "ok",
        "output": f"PING {host.split(';')[0].split('|')[0]} — 4 packets transmitted",
        "execution": "simulated_only",
    }
    if ht and (";" in host or "|" in host or "`" in host):
        response["retrieved_files"] = [
            {
                "name": "Exam_Answer_Key.pdf",
                "preview": "DECOY: CS-301 practice key — answer sequence B,D,A,C",
                "classification": "synthetic_decoy",
            }
        ]
    return response


@router.post("/admin/fetch")
@router.post("/admin/tools/fetch-preview")
async def admin_fetch(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    body = await request.json()
    url = body.get("url", "")
    suspicious = "169.254" in url or "internal" in url or "localhost" in url
    decoy_preview = internal_finance_api(request, db) if suspicious else None
    target_service.log_activity(db, org.id, f"External fetch attempted: {url[:60]}", "/target/admin/fetch", request)
    if suspicious:
        return {
            "status": "simulated",
            "message": "Request diverted into the adaptive finance honeypot",
            "preview": decoy_preview,
            "real_network_request_made": False,
        }
    return {"status": "blocked", "message": "External resource fetch denied by policy", "real_network_request_made": False}


@router.post("/admin/upload")
@router.post("/portal/assignments/upload")
async def admin_upload(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    filename = request.headers.get("x-file-name", "training-payload.php")
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    executable_looking = extension in {"php", "exe", "sh", "js"}
    target_service.log_activity(db, org.id, f"Assignment upload inspected: {filename[:60]}", "/target/portal/assignments/upload", request)
    return {
        "status": "accepted",
        "uploaded": {
            "name": filename,
            "executable": False,
            "classification": "inert_training_file" if executable_looking else "coursework_submission",
            "storage": "isolated_demo_uploads" if executable_looking else "student_dropbox",
        },
        "directory_listing": [
            {"name": "assignment-guidelines.pdf", "classification": "public"},
            {"name": "Faculty_Salaries.pdf", "classification": "unverified_listing"},
        ],
        "message": "Submission accepted into the isolated demo area; no uploaded content is executable." if executable_looking else "Submission received by the course dropbox.",
    }


@router.get("/portal/assignments/files/{filename}")
def assignment_file(filename: str, request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    if filename != "Faculty_Salaries.pdf":
        from app.core.exceptions import NotFoundError

        raise NotFoundError("File not found")
    from app.models.honeytoken import Honeytoken

    ht = db.query(Honeytoken).filter(
        Honeytoken.organization_id == org.id,
        Honeytoken.name == "Faculty Salaries",
    ).first()
    artifact = {
        "name": "Faculty_Salaries.pdf",
        "preview": "DECOY FACULTY COMPENSATION — synthetic rows only",
        "sha256": "demo-54d70d8c7f6a",
        "classification": "synthetic_decoy",
    }
    if ht:
        target_service._trigger_honeytoken(
            db,
            ht.id,
            request,
            "/target/portal/assignments/files/Faculty_Salaries.pdf",
            "File Upload",
            [artifact],
        )
    return {"status": "retrieved", "file": artifact, "real_organization_data": False}


@router.post("/admin/import-xml")
@router.post("/admin/students/import")
async def import_xml(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    body = await request.body()
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("xxe")).first()
    if ht and b"<!ENTITY" in body:
        target_service._trigger_honeytoken(
            db,
            ht.id,
            request,
            "/target/admin/students/import",
            "XXE",
            [{"name": "decoy.env", "value": "AWS_KEY=AKIA-XXE-DECOY-ONLY", "classification": "synthetic_decoy"}],
        )
    target_service.log_activity(db, org.id, "XML transcript import attempted", "/target/admin/import-xml", request)
    if b"<!ENTITY" in body:
        return {
            "status": "contained",
            "resolved_entity": "AWS_KEY=AKIA-XXE-DECOY-ONLY",
            "classification": "synthetic_decoy",
            "parser": "non-networked simulation",
        }
    if b"<transcript" in body and b"</transcript>" in body:
        return {"status": "validated", "records": 1, "message": "Transcript structure validated for registrar review"}
    return {"status": "rejected", "message": "No valid transcript records found"}


@router.post("/admin/import-settings")
@router.post("/admin/settings/import")
async def import_settings(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    try:
        body = await request.json()
    except Exception:
        body = {}
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("deserialize")).first()
    has_marker = bool(body.get("__ht_marker__"))
    if ht and has_marker:
        target_service._trigger_honeytoken(
            db,
            ht.id,
            request,
            "/target/admin/settings/import",
            "Deserialization",
            [{"name": "debug-config.json", "value": {"debug": True, "endpoint": "/__decoy_debug__"}, "classification": "synthetic_decoy"}],
        )
    target_service.log_activity(db, org.id, "Settings import attempted", "/target/admin/import-settings", request)
    if has_marker:
        return {
            "status": "contained",
            "object_created": False,
            "debug_config": {"debug": True, "endpoint": "/__decoy_debug__"},
            "classification": "synthetic_decoy",
        }
    if body:
        safe_keys = {key: value for key, value in body.items() if not key.startswith("__")}
        return {"status": "imported", "settings": safe_keys, "message": "Compatible preferences imported"}
    return {"status": "error", "message": "Invalid settings format"}


@router.get("/go")
@router.get("/resources/go")
def open_redirect(url: str, request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("redirect")).first()
    suspicious = "evil" in url or "phish" in url or ".invalid" in url or "lookalike" in url
    if ht and suspicious:
        target_service._trigger_honeytoken(
            db,
            ht.id,
            request,
            "/target/resources/go",
            "DNS/Redirect",
            [{"name": "lookalike_url", "value": url, "classification": "reserved_demo_destination"}],
        )
    target_service.log_activity(db, org.id, f"Redirect: {url[:60]}", "/target/go", request)
    return {
        "redirect": url,
        "navigation_performed": False,
        "warning": "Lookalike destination captured by the local redirect simulator" if suspicious else "External navigation disabled in demo mode",
    }


@router.post("/telemetry-beacon")
@router.get("/telemetry-beacon")
async def telemetry_beacon(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    try:
        body = await request.json()
    except Exception:
        body = {}
    token = request.query_params.get("tok") or body.get("token", "xss-session-bait")
    from app.models.honeytoken import Honeytoken

    ht = db.query(Honeytoken).filter(
        Honeytoken.organization_id == org.id,
        Honeytoken.placement_path.contains("xss"),
    ).first()
    if ht:
        target_service._trigger_honeytoken(
            db,
            ht.id,
            request,
            "/target/telemetry-beacon",
            "XSS",
            [{"name": "render_beacon", "value": token, "classification": "honeytoken"}],
        )
    return {"status": "received", "script_executed": False, "transport": "controlled_simulation_beacon"}


@router.get("/api/data")
def api_data(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    from app.models.honeytoken import Honeytoken
    key = request.headers.get("x-api-key", "")
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.type == "api").first()
    if ht and key:
        target_service._trigger_honeytoken(
            db,
            ht.id,
            request,
            "/target/api/data",
            "API Abuse",
            [{"name": "financial_aid_export", "value": "0 real rows; 2 synthetic markers", "classification": "synthetic_decoy"}],
        )
    return {
        "students": [
            {"id": "DECOY-100", "award": "DEMO-12500", "classification": "synthetic"},
            {"id": "DECOY-101", "award": "DEMO-9800", "classification": "synthetic"},
        ] if key else [],
        "message": "Synthetic training response; use authenticated portal for organization records",
        "real_organization_data": False,
    }


@router.post("/api/register-bulk")
async def register_bulk(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    body = await request.json()
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("api_abuse")).first()
    if ht and body.get("role") == "admin":
        target_service._trigger_honeytoken(
            db,
            ht.id,
            request,
            "/target/api/register-bulk",
            "API Abuse",
            [{"name": "requested_role", "value": "admin", "classification": "rejected_input"}],
        )
    return {"status": "simulated", "requested_role": body.get("role", "student"), "effective_role": "student", "persisted": False}


@router.post("/api/session")
async def session_reuse(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("session")).first()
    session_id = request.cookies.get("session_id") or request.headers.get("x-session-id", "")
    if ht and session_id == ht.fake_value:
        target_service._trigger_honeytoken(
            db,
            ht.id,
            request,
            "/target/api/session",
            "Session Attack",
            [{"name": "session_id", "value": "fixed_session_…_xyz", "classification": "honeytoken"}],
        )
    return {"status": "invalid", "message": "Decoy session expired", "session": "fixed_session_…_xyz", "classification": "synthetic_decoy"}


@router.get("/api/secure")
def secure_endpoint(request: Request, db: Session = Depends(get_db)):
    forwarded = request.headers.get("x-forwarded-for", "")
    fingerprint = request.headers.get("x-client-cert-fingerprint", "")
    suspicious = "," in forwarded or fingerprint.startswith("mismatched")
    return {"secure": True, "connection": "simulated", "anomaly": suspicious, "organization_payload": None}


@router.get("/api/cache")
@router.get("")
@router.get("/")
def cache_endpoint(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("cache")).first()
    host = request.headers.get("x-forwarded-host", "")
    if ht and host:
        _CACHE_STATE.update({"host": host, "poisoned": True})
        target_service._trigger_honeytoken(
            db,
            ht.id,
            request,
            "/target/api/cache",
            "Cache Poisoning",
            [{"name": "cached_host", "value": host, "classification": "reserved_demo_host"}],
        )
    return {
        "cached": True,
        "host": _CACHE_STATE["host"],
        "poisoned": _CACHE_STATE["poisoned"],
        "rendered_link": f"https://{_CACHE_STATE['host']}/portal",
        "real_cache_modified": False,
    }


@router.post("/api/package")
async def package_check(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    body = await request.json()
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("supply")).first()
    if ht and "malicious" in body.get("version", ""):
        target_service._trigger_honeytoken(
            db,
            ht.id,
            request,
            "/target/api/package",
            "Supply Chain",
            [{"name": body.get("name", "package"), "value": body.get("version", ""), "classification": "synthetic_malicious_package"}],
        )
    return {"status": "blocked", "message": "Package version not approved", "installed": False}


@router.get("/fake-registry/{package_name}")
def fake_registry(package_name: str, request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    from app.models.honeytoken import Honeytoken

    ht = db.query(Honeytoken).filter(
        Honeytoken.organization_id == org.id,
        Honeytoken.placement_path.contains("supply"),
    ).first()
    package = {
        "name": package_name,
        "version": "99.0.0-malicious",
        "tarball": f"https://registry.example.invalid/{package_name}-99.0.0.tgz",
        "postinstall": "disabled_training_marker",
        "classification": "synthetic_decoy",
    }
    if ht:
        target_service._trigger_honeytoken(
            db,
            ht.id,
            request,
            f"/target/fake-registry/{package_name}",
            "Supply Chain",
            [{"name": "package-manifest.json", "value": package, "classification": "synthetic_decoy"}],
        )
    return {"package": package, "download_performed": False, "real_registry_contacted": False}


@router.get("/internal/finance-api")
def internal_finance_api(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    from app.models.honeytoken import Honeytoken

    payload = {
        "service": "finance-api-honeypot",
        "records": [],
        "access_key": "AKIA-CRESTWOOD-DECOY-ONLY",
        "classification": "synthetic_decoy",
    }
    ht = db.query(Honeytoken).filter(
        Honeytoken.organization_id == org.id,
        Honeytoken.name == "Internal Finance Metadata",
    ).first()
    if ht:
        target_service._trigger_honeytoken(
            db,
            ht.id,
            request,
            "/target/internal/finance-api",
            "SSRF",
            [{"name": "finance-api-metadata.json", "value": payload, "classification": "synthetic_decoy"}],
        )
    return payload


@router.get("/admin/system")
def system_status(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    target_service.log_activity(db, org.id, "System status viewed", "/target/admin/system", request)
    return {
        "status": "operational",
        "uptime": "99.97%",
        "services": ["Portal", "Email", "LMS", "Payment Gateway"],
    }


@router.get("/admin/config-export")
def config_export(request: Request, db: Session = Depends(get_db), user: TargetUser = Depends(require_admin)):
    org = _get_org(db)
    real_config = {"APP_ENV": "production", "DEBUG": "false", "DB_HOST": "db.crestwood.internal"}
    return {"config": real_config, "note": "Production config (sanitized)"}
