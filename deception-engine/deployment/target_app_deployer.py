import os
import sys
from pathlib import Path

import httpx

TARGET_APP_URL = os.getenv("TARGET_APP_URL", "http://localhost:9000")


def deploy_honeytoken(honeytoken) -> None:
    try:
        httpx.post(
            f"{TARGET_APP_URL}/internal/deploy",
            json={
                "honeytoken_id": honeytoken.id,
                "type": honeytoken.type,
                "name": honeytoken.name,
                "fake_value": honeytoken.fake_value,
                "placement_path": honeytoken.placement_path,
                "department": honeytoken.department,
            },
            timeout=5.0,
        )
    except Exception:
        pass
