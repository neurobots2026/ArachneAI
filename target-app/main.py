import os
from typing import Any

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from pydantic import BaseModel

app = FastAPI(title="Target App (Sandbox)")

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
HONEYTOKENS: dict[str, dict[str, Any]] = {}


class DeployRequest(BaseModel):
    honeytoken_id: str
    type: str
    name: str
    fake_value: str
    placement_path: str
    department: str = ""


def _notify_telemetry(honeytoken_id: str, request: Request, endpoint: str):
    try:
        httpx.post(
            f"{BACKEND_URL}/api/v1/telemetry/events",
            json={
                "honeytoken_id": honeytoken_id,
                "source_ip": request.client.host if request.client else "127.0.0.1",
                "user_agent": request.headers.get("user-agent", ""),
                "endpoint": endpoint,
                "http_method": request.method,
                "session_id": request.headers.get("x-session-id", ""),
                "raw_metadata": {"target_app": True},
            },
            timeout=5.0,
        )
    except Exception:
        pass


@app.post("/internal/deploy")
def deploy(req: DeployRequest):
    HONEYTOKENS[req.honeytoken_id] = req.model_dump()
    return {"status": "deployed", "id": req.honeytoken_id}


@app.get("/")
def root():
    return {"app": "Target Sandbox", "endpoints": list(HONEYTOKENS.keys())}


@app.post("/api/login")
async def login(request: Request):
    for ht_id, ht in HONEYTOKENS.items():
        if ht.get("type") == "credential":
            _notify_telemetry(ht_id, request, "/api/login")
            break
    return {"status": "failed", "message": "Invalid credentials"}


@app.get("/internal/{path:path}")
async def internal_files(path: str, request: Request):
    for ht_id, ht in HONEYTOKENS.items():
        placement = ht.get("placement_path", "").lstrip("/")
        if placement.endswith(path) or path in placement:
            _notify_telemetry(ht_id, request, f"/internal/{path}")
            return PlainTextResponse(ht.get("fake_value", "decoy"))
    return JSONResponse({"error": "not found"}, status_code=404)


@app.get("/docs/{path:path}")
async def docs(path: str, request: Request):
    for ht_id, ht in HONEYTOKENS.items():
        if path in ht.get("placement_path", ""):
            _notify_telemetry(ht_id, request, f"/docs/{path}")
            if ht.get("type") == "document":
                return JSONResponse({"file": path, "marker": ht.get("fake_value", "")[:32]})
            return PlainTextResponse(ht.get("fake_value", ""))
    return JSONResponse({"error": "not found"}, status_code=404)


@app.post("/search")
async def search(request: Request):
    _trigger_any(request, "/search")
    return {"results": []}


@app.post("/transfer")
async def transfer(request: Request):
    _trigger_any(request, "/transfer")
    return {"status": "blocked"}


@app.get("/api/users/{user_id}")
async def get_user(user_id: str, request: Request):
    _trigger_any(request, f"/api/users/{user_id}")
    return {"id": user_id, "name": "demo"}


@app.post("/api/ping")
async def ping(request: Request):
    _trigger_any(request, "/api/ping")
    return {"status": "ok"}


@app.post("/api/fetch")
async def fetch_url(request: Request):
    _trigger_any(request, "/api/fetch")
    return {"status": "blocked"}


@app.post("/api/upload")
async def upload(request: Request):
    _trigger_any(request, "/api/upload")
    return {"status": "rejected"}


@app.get("/api/data")
async def api_data(request: Request):
    for ht_id, ht in HONEYTOKENS.items():
        if ht.get("type") in ("api", "credential"):
            _notify_telemetry(ht_id, request, "/api/data")
            break
    return {"data": []}


@app.post("/api/session")
async def session(request: Request):
    _trigger_any(request, "/api/session")
    return {"status": "invalid"}


@app.get("/api/secure")
async def secure(request: Request):
    _trigger_any(request, "/api/secure")
    return {"secure": True}


@app.post("/api/redirect")
async def redirect(request: Request):
    _trigger_any(request, "/api/redirect")
    return {"status": "blocked"}


@app.post("/api/deserialize")
async def deserialize(request: Request):
    _trigger_any(request, "/api/deserialize")
    return {"status": "error"}


@app.post("/api/xml")
async def xml_parse(request: Request):
    _trigger_any(request, "/api/xml")
    return {"status": "rejected"}


@app.get("/api/cache")
async def cache(request: Request):
    _trigger_any(request, "/api/cache")
    return {"cached": True}


@app.post("/api/package")
async def package(request: Request):
    _trigger_any(request, "/api/package")
    return {"status": "blocked"}


def _trigger_any(request: Request, endpoint: str):
    if HONEYTOKENS:
        ht_id = next(iter(HONEYTOKENS))
        _notify_telemetry(ht_id, request, endpoint)
