from tools import calculate_risk


def run(context: dict) -> dict:
    evidence = context.get("evidence", {})
    risk = calculate_risk(evidence)
    return {
        "agent": "telemetry",
        "risk_contribution": risk,
        "summary": f"Telemetry from {evidence.get('source_ip', 'unknown')} on {evidence.get('endpoint', '/')}",
    }
