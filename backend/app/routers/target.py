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


def _get_org(db: Session) -> Organization:
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
def post_review(course_id: str, req: ReviewRequest, request: Request, db: Session = Depends(get_db), user: TargetUser = Depends(get_target_user)):
    org = _get_org(db)
    return target_service.add_review(db, org.id, user.id, course_id, req, request)


@router.get("/courses/{course_id}/reviews")
def get_reviews(course_id: str, db: Session = Depends(get_db)):
    return target_service.get_reviews(db, course_id)


@router.get("/students/{student_id}")
def get_student(student_id: str, request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    return target_service.get_student(db, org.id, student_id, request)


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


@router.get("/admin/students")
def admin_students(db: Session = Depends(get_db), user: TargetUser = Depends(require_admin)):
    org = _get_org(db)
    return target_service.admin_list_students(db, org.id)


@router.get("/admin/documents")
def admin_documents(request: Request, db: Session = Depends(get_db), user: TargetUser = Depends(require_admin)):
    org = _get_org(db)
    return target_service.admin_list_all_documents(db, org.id, request)


@router.post("/admin/ping")
async def admin_ping(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    body = await request.json()
    host = body.get("host", "")
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("cmd")).first()
    if ht and (";" in host or "|" in host or "`" in host):
        target_service._trigger_honeytoken(db, ht.id, request, "/target/admin/ping")
    target_service.log_activity(db, org.id, f"Ping diagnostic: {host[:50]}", "/target/admin/ping", request)
    return {"status": "ok", "output": f"PING {host.split(';')[0].split('|')[0]} — 4 packets transmitted"}


@router.post("/admin/fetch")
async def admin_fetch(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    body = await request.json()
    url = body.get("url", "")
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.type.in_(["cloud", "credential"])).first()
    if ht and ("169.254" in url or "internal" in url or "localhost" in url):
        target_service._trigger_honeytoken(db, ht.id, request, "/target/admin/fetch")
    target_service.log_activity(db, org.id, f"External fetch attempted: {url[:60]}", "/target/admin/fetch", request)
    return {"status": "blocked", "message": "External resource fetch denied by policy"}


@router.post("/admin/upload")
async def admin_upload(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.type == "document").first()
    if ht:
        target_service._trigger_honeytoken(db, ht.id, request, "/target/admin/upload")
    target_service.log_activity(db, org.id, "File upload attempted", "/target/admin/upload", request)
    return {"status": "rejected", "message": "Upload blocked — use approved portal"}


@router.post("/admin/import-xml")
async def import_xml(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    body = await request.body()
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("xxe")).first()
    if ht and b"<!ENTITY" in body:
        target_service._trigger_honeytoken(db, ht.id, request, "/target/admin/import-xml")
    target_service.log_activity(db, org.id, "XML transcript import attempted", "/target/admin/import-xml", request)
    return {"status": "rejected"}


@router.post("/admin/import-settings")
async def import_settings(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("deserialize")).first()
    if ht:
        target_service._trigger_honeytoken(db, ht.id, request, "/target/admin/import-settings")
    target_service.log_activity(db, org.id, "Settings import attempted", "/target/admin/import-settings", request)
    return {"status": "error", "message": "Invalid settings format"}


@router.get("/go")
def open_redirect(url: str, request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("redirect")).first()
    if ht and ("evil" in url or "phish" in url):
        target_service._trigger_honeytoken(db, ht.id, request, "/target/go")
    target_service.log_activity(db, org.id, f"Redirect: {url[:60]}", "/target/go", request)
    return {"redirect": url, "warning": "Unvalidated redirect"}


@router.get("/api/data")
def api_data(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    from app.models.honeytoken import Honeytoken
    key = request.headers.get("x-api-key", "")
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.type == "api").first()
    if ht and key:
        target_service._trigger_honeytoken(db, ht.id, request, "/target/api/data")
    return {"students": [], "message": "Use authenticated portal for bulk data"}


@router.post("/api/register-bulk")
async def register_bulk(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    body = await request.json()
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("api_abuse")).first()
    if ht and body.get("role") == "admin":
        target_service._trigger_honeytoken(db, ht.id, request, "/target/api/register-bulk")
    return {"status": "created", "role": body.get("role", "student")}


@router.post("/api/session")
async def session_reuse(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("session")).first()
    if ht:
        target_service._trigger_honeytoken(db, ht.id, request, "/target/api/session")
    return {"status": "invalid", "message": "Session expired"}


@router.get("/api/secure")
def secure_endpoint(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("mitm")).first()
    if ht and request.headers.get("x-forwarded-for"):
        target_service._trigger_honeytoken(db, ht.id, request, "/target/api/secure")
    return {"secure": True}


@router.get("/api/cache")
def cache_endpoint(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("cache")).first()
    host = request.headers.get("x-forwarded-host", "")
    if ht and host:
        target_service._trigger_honeytoken(db, ht.id, request, "/target/api/cache")
    return {"cached": True, "host": host or "crestwood.edu"}


@router.post("/api/package")
async def package_check(request: Request, db: Session = Depends(get_db)):
    org = _get_org(db)
    body = await request.json()
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.placement_path.contains("supply")).first()
    if ht and "malicious" in body.get("version", ""):
        target_service._trigger_honeytoken(db, ht.id, request, "/target/api/package")
    return {"status": "blocked", "message": "Package version not approved"}


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
    from app.models.honeytoken import Honeytoken
    ht = db.query(Honeytoken).filter(Honeytoken.organization_id == org.id, Honeytoken.type == "cloud").first()
    if ht:
        target_service._trigger_honeytoken(db, ht.id, request, "/target/admin/config-export")
    real_config = {"APP_ENV": "production", "DEBUG": "false", "DB_HOST": "db.crestwood.internal"}
    fake_config = {"APP_ENV": "production", "AWS_ADMIN_KEY": ht.fake_value if ht else "AKIAHONEYTOKEN", "DB_PASSWORD": "[REDACTED]"}
    return {"config": real_config, "note": "Production config (sanitized)"}
