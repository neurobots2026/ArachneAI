"""Header-only MITM signature detector for the local demonstration target."""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class MitmSignatureMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if not request.url.path.startswith("/api/v1/target"):
            return response
        fingerprint = request.headers.get("x-client-cert-fingerprint", "")
        forwarded = request.headers.get("x-forwarded-for", "")
        # A synthetic mismatch plus a multi-hop chain is the scenario signature;
        # no traffic interception or certificate handling happens here.
        if fingerprint and "," in forwarded:
            from app.database.session import SessionLocal
            from app.models.organization import Organization
            from app.services.target_service import record_request_anomaly
            db = SessionLocal()
            try:
                org = db.query(Organization).first()
                if org:
                    record_request_anomaly(
                        db,
                        org.id,
                        request,
                        "MITM",
                        "mitm",
                        [{
                            "name": "connection_signature",
                            "value": {
                                "forwarded_chain": forwarded,
                                "fingerprint": fingerprint,
                            },
                            "classification": "simulated_network_metadata",
                        }],
                    )
            finally:
                db.close()
        return response
