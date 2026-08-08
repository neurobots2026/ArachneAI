import os
from datetime import datetime, timezone

from scenarios import SCENARIOS

TARGET_APP_URL = os.getenv("TARGET_APP_URL", "http://localhost:3000")

SIMULATION_LOGS: dict[str, list[dict]] = {}


def append_log(sim_id: str, message: str, detail: str = ""):
    if sim_id not in SIMULATION_LOGS:
        SIMULATION_LOGS[sim_id] = []
    SIMULATION_LOGS[sim_id].append(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": message,
            "detail": detail,
        }
    )


def get_logs(sim_id: str) -> list[dict]:
    return SIMULATION_LOGS.get(sim_id, [])


def run_scenario(scenario_name: str, org_id: str = "", sim_id: str = "") -> dict:
    key = scenario_name.lower().replace(" ", "_").replace("-", "_")
    if key not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario_name}. Available: {list(SCENARIOS.keys())}")
    start_index = len(get_logs(sim_id))
    append_log(sim_id, f"Scenario {key} initiated", f"Target: Crestwood College API")
    fn = SCENARIOS[key]
    result = fn(TARGET_APP_URL, org_id, sim_id)
    trace = get_logs(sim_id)[start_index:]
    transport_failed = any("FAILED" in entry.get("message", "") for entry in trace)
    server_failed = any("Status: 5" in entry.get("detail", "") for entry in trace)
    client_failed = any("Status: 4" in entry.get("detail", "") for entry in trace)
    has_success = any("Status: 2" in entry.get("detail", "") for entry in trace)
    # Broken-auth intentionally includes rejected wordlist attempts before the
    # planted credential succeeds; other 4xx responses mean the workflow did
    # not execute as designed.
    failed = transport_failed or server_failed or not has_success or (client_failed and key not in {"broken_auth", "idor"})
    result["status"] = "failed" if failed else "completed"
    append_log(
        sim_id,
        f"Scenario {key} {'failed' if failed else 'completed'}",
        (
            "Allowlisted scenario finished; attacker retrieval remained confined "
            "to the seeded synthetic decoy-document registry"
        ),
    )
    return result
