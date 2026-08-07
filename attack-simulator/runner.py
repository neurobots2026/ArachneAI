import os
from datetime import datetime

from scenarios import SCENARIOS

TARGET_APP_URL = os.getenv("TARGET_APP_URL", "http://localhost:9000")

SIMULATION_LOGS: dict[str, list[dict]] = {}


def append_log(sim_id: str, message: str, detail: str = ""):
    if sim_id not in SIMULATION_LOGS:
        SIMULATION_LOGS[sim_id] = []
    SIMULATION_LOGS[sim_id].append(
        {
            "timestamp": datetime.utcnow().isoformat(),
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
    append_log(sim_id, f"Scenario {key} initiated", f"Target: Crestwood College API")
    fn = SCENARIOS[key]
    result = fn(TARGET_APP_URL, org_id, sim_id)
    append_log(sim_id, f"Scenario {key} completed", str(result))
    return result
