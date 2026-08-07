from client import call_gemini_text


def run(context: dict, reasoning: dict, threat: dict) -> dict:
    prompt = (
        f"Write a 2-3 sentence business impact summary for a {threat.get('attack_type')} "
        f"incident involving a honeytoken. Evidence: {reasoning.get('evidence', [])}"
    )
    summary = call_gemini_text(prompt)
    return {"agent": "security_advisor", "business_impact": summary}
