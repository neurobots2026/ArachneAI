import secrets
import string
import uuid
from datetime import datetime, timedelta, timezone

from jose import jwt


def generate_fake_aws_key(marker: str) -> str:
    suffix = marker.replace("ht_", "")[:8]
    body = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(16))
    return f"AKIA{body}{suffix}"


def generate_fake_jwt(claims: dict | None = None) -> str:
    payload = claims or {"sub": "honey-user", "role": "admin"}
    payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=1)
    return jwt.encode(payload, "honeytoken-throwaway-secret", algorithm="HS256")


def generate_api_key(marker: str) -> str:
    return f"arachne_{marker}_{secrets.token_hex(12)}"


def generate_source_code_snippet(marker: str) -> str:
    return (
        f"# Internal API config - DO NOT COMMIT\n"
        f"API_KEY = '{generate_api_key(marker)}'\n"
        f"DB_PASSWORD = 'hny_{marker}'\n"
    )
