import time

import httpx

BASE = "http://localhost:8000"

r = httpx.post(f"{BASE}/api/v1/auth/login", json={"email": "admin@acme.bank", "password": "admin123"})
r.raise_for_status()
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

summary = httpx.get(f"{BASE}/api/v1/dashboard/summary", headers=headers).json()
print("Summary:", summary)

sim = httpx.post(
    f"{BASE}/api/v1/simulation/start",
    headers=headers,
    json={"scenario_name": "broken_auth"},
).json()
print("Simulation:", sim["id"], sim["status"])
time.sleep(4)

incidents = httpx.get(f"{BASE}/api/v1/incidents", headers=headers).json()
print("Incidents:", len(incidents))
if incidents:
    inc = incidents[0]
    print("Attack:", inc["attack_type"], "Risk:", inc["risk_score"], "Status:", inc["status"])
    if inc.get("recommendations"):
        rec_id = inc["recommendations"][0]["id"]
        httpx.post(
            f"{BASE}/api/v1/incidents/contain",
            headers=headers,
            json={"recommendation_id": rec_id, "approved": True},
        )
        print("Approved recommendation")
    report = httpx.post(
        f"{BASE}/api/v1/reports/generate/{inc['id']}",
        headers=headers,
    ).json()
    print("Report:", report["file_path"])
print("E2E OK")
