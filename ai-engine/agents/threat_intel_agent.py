from client import call_gemini
from tools import ATTACK_TYPES, ThreatClassification


def run(context: dict) -> dict:
    evidence = context.get("evidence", {})
    hint = evidence.get("raw_metadata", {}).get("attack_type_hint", "")
    if hint in ATTACK_TYPES:
        return {
            "agent": "threat_intel",
            "attack_type": hint,
            "confidence_score": 0.98,
        }
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
