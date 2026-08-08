import os
import time

import httpx

BASE = os.getenv("ARACHNE_BASE_URL", "http://localhost:8001")
SCENARIOS = [
    "broken_auth", "ssrf", "xss", "csrf", "idor", "command_injection",
    "file_upload", "api_abuse", "session_attack", "mitm", "dns_redirect",
    "deserialization", "xxe", "cache_poisoning", "supply_chain",
]
EXPECTED_ATTACKS = {
    "broken_auth": "Broken Auth", "ssrf": "SSRF", "xss": "XSS", "csrf": "CSRF",
    "idor": "IDOR", "command_injection": "Command Injection", "file_upload": "File Upload",
    "api_abuse": "API Abuse", "session_attack": "Session Attack", "mitm": "MITM",
    "dns_redirect": "DNS/Redirect", "deserialization": "Deserialization", "xxe": "XXE",
    "cache_poisoning": "Cache Poisoning", "supply_chain": "Supply Chain",
}

with httpx.Client(base_url=BASE, timeout=20.0) as client:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "secops@crestwood.edu", "password": "secops123"},
    )
    response.raise_for_status()
    client.headers["Authorization"] = f"Bearer {response.json()['access_token']}"

    baseline = client.get("/api/v1/dashboard/status")
    baseline.raise_for_status()
    print("Initial dashboard:", baseline.json()["state"])

    failures = []
    for scenario in SCENARIOS:
        started = client.post("/api/v1/simulation/start", json={"scenario_name": scenario})
        started.raise_for_status()
        simulation_id = started.json()["id"]
        deadline = time.monotonic() + 30
        result = None
        while time.monotonic() < deadline:
            response = client.get(f"/api/v1/simulation/{simulation_id}/log")
            response.raise_for_status()
            result = response.json()
            if result["status"] in {"completed", "failed"}:
                break
            time.sleep(0.25)

        if not result or result["status"] != "completed":
            failures.append(f"{scenario}: {result['status'] if result else 'timeout'}")
            continue
        if not result["artifacts"]:
            failures.append(f"{scenario}: no retrieved decoy artifact")
        if result["data_boundary"]["organization_records_exposed"]:
            failures.append(f"{scenario}: organization data boundary violated")
        if not result.get("resulting_incident_id"):
            failures.append(f"{scenario}: no correlated incident")
        else:
            incident = client.get(f"/api/v1/incidents/{result['resulting_incident_id']}")
            incident.raise_for_status()
            if incident.json()["attack_type"] != EXPECTED_ATTACKS[scenario]:
                failures.append(
                    f"{scenario}: classified as {incident.json()['attack_type']} instead of {EXPECTED_ATTACKS[scenario]}"
                )
        if set(result.get("response_actions", [])) != {"honeytoken_triggered", "adaptive_honeypot_deployed"}:
            failures.append(f"{scenario}: deception response actions missing")
        print(
            f"{scenario:20} completed · {len(result['artifacts'])} decoy artifact(s) · "
            f"incident {result.get('resulting_incident_id') or 'pending'}"
        )

    incidents = client.get("/api/v1/incidents")
    incidents.raise_for_status()
    deployments = client.get("/api/v1/dashboard/deception-response")
    deployments.raise_for_status()
    print("Incidents:", len(incidents.json()))
    print("Adaptive honeypots:", len(deployments.json()["deployments"]))

    if os.getenv("ARACHNE_RESET_AFTER_TEST", "1") == "1":
        reset = client.post("/api/v1/simulation/reset")
        reset.raise_for_status()
        print("Demo reset:", reset.json()["removed"])
        reset_status = client.get("/api/v1/dashboard/status")
        reset_status.raise_for_status()
        reset_deployments = client.get("/api/v1/dashboard/deception-response")
        reset_deployments.raise_for_status()
        if reset_status.json()["state"] != "normal" or reset_deployments.json()["deployments"]:
            failures.append("demo reset did not restore the normal/standby state")

if failures:
    raise SystemExit("E2E failures:\n- " + "\n- ".join(failures))
print("E2E OK — all 15 local simulations preserved the synthetic-data boundary")
