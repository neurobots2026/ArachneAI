import app.path_setup  # noqa: F401

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.core.exceptions import AppError
from app.database.session import init_db
from app.middleware.error_handler import app_error_handler, unhandled_error_handler
from app.middleware.logging import LoggingMiddleware, RequestIdMiddleware
from app.middleware.mitm_signature import MitmSignatureMiddleware
from app.routers import (
    ai,
    auth,
    dashboard,
    deception,
    honeytoken,
    incident,
    organization,
    reports,
    simulation,
    target,
    telemetry,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    _seed_if_empty()
    yield


def _seed_if_empty() -> None:
    from app.core.auth import hash_password
    from app.database.session import SessionLocal
    from app.models.honeytoken import Honeytoken
    from app.models.organization import Organization
    from app.models.user import User
    from app.models.target import Course, Document, SiteActivity, TargetUser

    db = SessionLocal()
    try:
        org = db.query(Organization).filter(Organization.name == "Crestwood College").first()
        has_target_data = bool(
            org and db.query(TargetUser).filter(TargetUser.organization_id == org.id).first()
        )
        has_secops = db.query(User).filter(User.email == "secops@crestwood.edu").first() is not None
        if org and has_target_data:
            if not has_secops:
                db.add(User(organization_id=org.id, email="secops@crestwood.edu",
                            hashed_password=hash_password("secops123"), role="admin"))
            idor_token = db.query(Honeytoken).filter(
                Honeytoken.organization_id == org.id,
                Honeytoken.name == "Reserved Student Range",
            ).first()
            if not idor_token:
                idor_token = Honeytoken(
                    organization_id=org.id,
                    type="record",
                    name="Reserved Student Range",
                    fake_value="CW-GHOST-99999",
                    department="Academic Affairs",
                    placement_path="/target/students/9000",
                    created_by_ai_reasoning="Ghost student record reserved for object-enumeration detection.",
                )
                db.add(idor_token)
                db.flush()
            if not db.query(Honeytoken).filter(
                Honeytoken.organization_id == org.id,
                Honeytoken.name == "Internal Finance Metadata",
            ).first():
                db.add(Honeytoken(
                    organization_id=org.id,
                    type="cloud",
                    name="Internal Finance Metadata",
                    fake_value="AKIA-CRESTWOOD-DECOY-ONLY",
                    department="Finance",
                    placement_path="/target/internal/finance-api",
                    created_by_ai_reasoning="Internal-only finance metadata bait for SSRF detection.",
                ))
            session_token = db.query(Honeytoken).filter(
                Honeytoken.organization_id == org.id,
                Honeytoken.name == "Session Reuse Bait",
            ).first()
            if session_token and not db.query(TargetUser).filter(
                TargetUser.email == "session.demo@crestwood.internal"
            ).first():
                db.add(TargetUser(
                    organization_id=org.id,
                    email="session.demo@crestwood.internal",
                    hashed_password=hash_password("SessionDemo2026!"),
                    name="Session_Account",
                    role="decoy",
                    major="Simulation",
                    student_id="CW-SESSION-9001",
                    gpa=0.0,
                    is_honeytoken=True,
                    honeytoken_id=session_token.id,
                ))
            ghost = db.query(TargetUser).filter(
                TargetUser.organization_id == org.id,
                TargetUser.student_id == "CW-GHOST-99999",
            ).first()
            if ghost:
                ghost.honeytoken_id = idor_token.id
            if not db.query(SiteActivity).filter(SiteActivity.organization_id == org.id).first():
                db.add_all([
                    SiteActivity(organization_id=org.id, event_type="normal", description="Public programme catalog viewed", endpoint="/target/public/programs", source_ip="10.24.0.21"),
                    SiteActivity(organization_id=org.id, event_type="normal", description="Student portal health check completed", endpoint="/target/portal/dashboard", source_ip="10.24.0.12"),
                    SiteActivity(organization_id=org.id, event_type="normal", description="Course schedule synchronized", endpoint="/target/courses", source_ip="10.24.0.18"),
                ])
            db.commit()
            return
        if not org:
            org = Organization(
                name="Crestwood College",
                industry="Education",
                employee_count=1200,
                cloud_provider="AWS",
                departments=["IT", "Admissions", "Finance", "Academic Affairs"],
            )
            db.add(org)
            db.flush()

        if not has_secops:
            db.add(User(organization_id=org.id, email="secops@crestwood.edu",
                        hashed_password=hash_password("secops123"), role="admin"))

        tokens = [
            Honeytoken(
                organization_id=org.id,
                type="credential",
                name="Leaked Admin Backup",
                fake_value="admin_backup:Winter2024!",
                department="IT",
                placement_path="/target/auth/login",
                created_by_ai_reasoning="Credential stuffing target — planted leaked admin backup account.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="cloud",
                name="AWS Admin Key",
                fake_value="AKIAHONEYTOKEN12345678",
                department="IT",
                placement_path="/target/admin/config-export",
                created_by_ai_reasoning="Fake .env export on admin system page.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="document",
                name="Payroll 2026",
                fake_value="PAYROLL_2026_FAKE_DATA",
                department="Finance",
                placement_path="/target/admin/documents",
                created_by_ai_reasoning="Finance honeytoken document in admin file list.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="document",
                name="Faculty Salaries",
                fake_value="FACULTY_SALARIES_FAKE",
                department="HR",
                placement_path="/target/admin/upload",
                created_by_ai_reasoning="Discoverable via file upload path traversal.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="api",
                name="Financial Aid API Key",
                fake_value="fa-api-key-honeytoken-9x7k2m",
                department="Finance",
                placement_path="/target/api/data",
                created_by_ai_reasoning="API abuse honeytoken for bulk data endpoint.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="credential",
                name="XSS Session Bait",
                fake_value="session_honeytoken_admin_abc123",
                department="IT",
                placement_path="/target/courses/xss",
                created_by_ai_reasoning="Stored XSS exfiltration bait.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="credential",
                name="CSRF Provost Profile",
                fake_value="provost_profile_honeytoken",
                department="Academic Affairs",
                placement_path="/target/profile/csrf",
                created_by_ai_reasoning="CSRF on profile update form.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="credential",
                name="Command Injection Marker",
                fake_value="Exam_Answer_Key.pdf",
                department="IT",
                placement_path="/target/admin/cmd",
                created_by_ai_reasoning="Ping diagnostic command injection bait.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="credential",
                name="Session Reuse Bait",
                fake_value="fixed_session_honeytoken_xyz",
                department="IT",
                placement_path="/target/api/session",
                created_by_ai_reasoning="Session fixation/reuse detection bait.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="credential",
                name="MITM Anomaly",
                fake_value="mitm_connection_marker",
                department="IT",
                placement_path="/target/api/mitm",
                created_by_ai_reasoning="Suspicious forwarded header chain.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="credential",
                name="Open Redirect Bait",
                fake_value="https://crestwood-login.evil.example.com",
                department="IT",
                placement_path="/target/go/redirect",
                created_by_ai_reasoning="Open redirect to phishing lookalike.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="credential",
                name="Deserialization Bait",
                fake_value="debug_endpoint_honeytoken",
                department="IT",
                placement_path="/target/admin/deserialize",
                created_by_ai_reasoning="Settings import deserialization bait.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="document",
                name="XXE Transcript",
                fake_value="/internal/honeytoken/transcripts",
                department="Admissions",
                placement_path="/target/admin/xxe",
                created_by_ai_reasoning="XML transcript import XXE bait.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="credential",
                name="Cache Poison",
                fake_value="cache_poison_honeytoken_value",
                department="IT",
                placement_path="/target/api/cache",
                created_by_ai_reasoning="Web cache poisoning via X-Forwarded-Host.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="source_code",
                name="Supply Chain Package",
                fake_value="lodash@99.0.0-malicious",
                department="IT",
                placement_path="/target/api/supply",
                created_by_ai_reasoning="Malicious dependency pull bait.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="credential",
                name="API Abuse Escalation",
                fake_value="role_escalation_honeytoken",
                department="IT",
                placement_path="/target/api/api_abuse",
                created_by_ai_reasoning="Mass registration with admin role field.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="record",
                name="Reserved Student Range",
                fake_value="CW-GHOST-99999",
                department="Academic Affairs",
                placement_path="/target/students/9000",
                created_by_ai_reasoning="Ghost student record reserved for object-enumeration detection.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="cloud",
                name="Internal Finance Metadata",
                fake_value="AKIA-CRESTWOOD-DECOY-ONLY",
                department="Finance",
                placement_path="/target/internal/finance-api",
                created_by_ai_reasoning="Internal-only finance metadata bait for SSRF detection.",
            ),
        ]
        db.add_all(tokens)
        db.flush()

        students = [
            TargetUser(
                organization_id=org.id,
                email="student1@crestwood.edu",
                hashed_password=hash_password("Student2024!"),
                name="Alex Rivera",
                role="student",
                major="Computer Science",
                student_id="CW-2026001",
                gpa=3.72,
            ),
            TargetUser(
                organization_id=org.id,
                email="student2@crestwood.edu",
                hashed_password=hash_password("Student2024!"),
                name="Jordan Kim",
                role="student",
                major="Business Administration",
                student_id="CW-2026002",
                gpa=3.45,
            ),
            TargetUser(
                organization_id=org.id,
                email="admin@crestwood.edu",
                hashed_password=hash_password("Admin2024!"),
                name="Dr. Patricia Walsh",
                role="admin",
                major="Administration",
                student_id="CW-ADMIN01",
                gpa=0.0,
            ),
            TargetUser(
                organization_id=org.id,
                email="session.demo@crestwood.internal",
                hashed_password=hash_password("SessionDemo2026!"),
                name="Session_Account",
                role="decoy",
                major="Simulation",
                student_id="CW-SESSION-9001",
                gpa=0.0,
                is_honeytoken=True,
                honeytoken_id=tokens[8].id,
            ),
        ]
        db.add_all(students)
        db.flush()

        ghost = TargetUser(
            organization_id=org.id,
            email="provost.secret@crestwood.internal",
            hashed_password=hash_password("ghost_account"),
            name="Provost_Account",
            role="admin",
            major="Executive",
            student_id="CW-GHOST-99999",
            gpa=0.0,
            is_honeytoken=True,
            honeytoken_id=tokens[-2].id,
        )
        db.add(ghost)

        courses_data = [
            ("CS-101", "Introduction to Programming", "Python fundamentals and problem solving.", 3, "Dr. Chen", "MWF 10:00 AM"),
            ("CS-301", "Web Application Security", "OWASP Top 10, secure coding, penetration testing basics.", 3, "Prof. Martinez", "TTh 2:00 PM"),
            ("BUS-201", "Principles of Marketing", "Market research, branding, and digital strategy.", 3, "Dr. Thompson", "MWF 1:00 PM"),
            ("NUR-110", "Fundamentals of Nursing", "Clinical skills and patient care foundations.", 4, "Prof. Davis", "TTh 8:00 AM"),
            ("PSY-150", "General Psychology", "Cognitive, behavioral, and social psychology.", 3, "Dr. Anderson", "MW 3:00 PM"),
            ("MATH-201", "Calculus II", "Integration techniques and series.", 4, "Prof. Lee", "MWF 9:00 AM"),
            ("ENG-102", "Academic Writing", "Research papers and critical analysis.", 3, "Dr. Foster", "TTh 11:00 AM"),
            ("BIO-101", "General Biology", "Cell biology, genetics, and ecology.", 4, "Prof. Garcia", "MWF 11:00 AM"),
        ]
        for code, title, desc, credits, instructor, schedule in courses_data:
            db.add(
                Course(
                    organization_id=org.id,
                    code=code,
                    title=title,
                    description=desc,
                    credits=credits,
                    instructor=instructor,
                    schedule=schedule,
                )
            )

        real_docs = [
            ("Student Handbook 2026", "/portal/docs/handbook.pdf", "general", "Welcome to Crestwood College. This handbook covers academic policies, campus resources, and student conduct guidelines."),
            ("Course Catalog", "/portal/docs/catalog.pdf", "academic", "Complete listing of undergraduate programs and degree requirements for 2025-2026."),
            ("IT Acceptable Use Policy", "/portal/docs/it-policy.pdf", "it", "Guidelines for network usage, email, and software installation on campus systems."),
        ]
        for title, path, cat, content in real_docs:
            db.add(
                Document(
                    organization_id=org.id,
                    title=title,
                    file_path=path,
                    category=cat,
                    content=content,
                    is_honeytoken=False,
                )
            )

        fake_docs = [
            (tokens[2], "Payroll_2026.xlsx", "/admin/files/Payroll_2026.xlsx", "finance", "Employee,Salary,Department\nJohn Doe,85000,Engineering\n[FAKE HONEYTOKEN DATA]"),
            (tokens[3], "Faculty_Salaries.pdf", "/admin/files/Faculty_Salaries.pdf", "finance", "[FAKE] Faculty compensation report — honeytoken document."),
            (tokens[1], "financial-aid-api-key.txt", "/portal/linked-services/financial-aid-api-key.txt", "credentials", tokens[1].fake_value),
        ]
        for ht, title, path, cat, content in fake_docs:
            db.add(
                Document(
                    organization_id=org.id,
                    title=title,
                    file_path=path,
                    category=cat,
                    content=content,
                    is_honeytoken=True,
                    honeytoken_id=ht.id,
                )
            )

        db.add_all([
            SiteActivity(organization_id=org.id, event_type="normal", description="Public programme catalog viewed", endpoint="/target/public/programs", source_ip="10.24.0.21"),
            SiteActivity(organization_id=org.id, event_type="normal", description="Student portal health check completed", endpoint="/target/portal/dashboard", source_ip="10.24.0.12"),
            SiteActivity(organization_id=org.id, event_type="normal", description="Course schedule synchronized", endpoint="/target/courses", source_ip="10.24.0.18"),
        ])

        db.commit()
        # v3 consumes honeytokens directly through the target router; no
        # standalone target-app deployment callback is needed.
    finally:
        db.close()


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
if settings.ENV == "development":
    # Bearer-token auth — no cookies — so wildcard CORS is safe in local dev
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
app.add_middleware(RequestIdMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(MitmSignatureMiddleware)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(Exception, unhandled_error_handler)

API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(organization.router, prefix=API_PREFIX)
app.include_router(honeytoken.router, prefix=API_PREFIX)
app.include_router(deception.router, prefix=API_PREFIX)
app.include_router(telemetry.router, prefix=API_PREFIX)
app.include_router(incident.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)
app.include_router(simulation.router, prefix=API_PREFIX)
app.include_router(ai.router, prefix=API_PREFIX)
app.include_router(target.router, prefix=API_PREFIX)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}
