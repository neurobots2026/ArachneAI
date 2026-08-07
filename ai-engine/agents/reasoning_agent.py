from client import call_gemini
from tools import ReasoningOutput


def run(context: dict, telemetry: dict, threat: dict) -> dict:
    evidence = context.get("evidence", {})
    prompt = (
        f"Given attack classification {threat.get('attack_type')} and evidence {evidence}, "
        "return 3-5 factual evidence-based bullet points explaining why this is malicious."
    )
    result = call_gemini(prompt, ReasoningOutput)
    bullets = "\n".join(f"{i+1}. {e}" for i, e in enumerate(result.evidence))
    return {
        "agent": "reasoning",
        "ai_reasoning": bullets,
        "evidence": result.evidence,
    }
