from agents import containment_agent, reasoning_agent, security_advisor, telemetry_agent, threat_intel_agent
from tools import calculate_risk


def run_investigation(incident_context: dict) -> dict:
    telemetry = telemetry_agent.run(incident_context)
    threat = threat_intel_agent.run(incident_context)
    reasoning = reasoning_agent.run(incident_context, telemetry, threat)
    containment = containment_agent.run(threat)
    advisor = security_advisor.run(incident_context, reasoning, threat)

    risk_score = max(
        calculate_risk(incident_context.get("evidence", {})),
        telemetry.get("risk_contribution", 0.5),
    )

    return {
        "attack_type": threat["attack_type"],
        "confidence_score": threat["confidence_score"],
        "risk_score": risk_score,
        "ai_reasoning": reasoning["ai_reasoning"],
        "business_impact": advisor["business_impact"],
        "recommendations": containment["recommendations"],
        "agent_trail": [
            {"agent": "coordinator", "status": "completed", "output": "Orchestrated investigation"},
            {"agent": "telemetry", "status": "completed", "output": telemetry["summary"]},
            {"agent": "threat_intel", "status": "completed", "output": threat["attack_type"]},
            {"agent": "reasoning", "status": "completed", "output": reasoning["ai_reasoning"][:200]},
            {"agent": "containment", "status": "completed", "output": str(containment["recommendations"])},
            {"agent": "security_advisor", "status": "completed", "output": advisor["business_impact"][:200]},
        ],
    }
