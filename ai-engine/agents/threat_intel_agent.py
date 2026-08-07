from client import call_gemini
from tools import ATTACK_TYPES, ThreatClassification


def run(context: dict) -> dict:
    evidence = context.get("evidence", {})
    prompt = (
        f"Classify attack type from honeytoken breach. Evidence: {evidence}. "
        f"Must be one of: {ATTACK_TYPES}"
    )
    result = call_gemini(prompt, ThreatClassification)
    return {
        "agent": "threat_intel",
        "attack_type": result.attack_type,
        "confidence_score": result.confidence_score,
    }
