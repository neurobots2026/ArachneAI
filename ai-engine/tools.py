from pydantic import BaseModel, Field

from client import call_gemini, call_gemini_text


class ThreatClassification(BaseModel):
    attack_type: str
    confidence_score: float = Field(ge=0.0, le=1.0)


class ReasoningOutput(BaseModel):
    evidence: list[str]
    summary: str = ""


ATTACK_TYPES = [
    "XSS", "CSRF", "Broken Auth", "IDOR", "Command Injection", "SSRF",
    "File Upload", "API Abuse", "Session Attack", "MITM", "DNS/Redirect",
    "Deserialization", "XXE", "Cache Poisoning", "Supply Chain",
]

CONTAINMENT_MAP = {
    "Broken Auth": ["rotate_credential", "block_source_ip"],
    "SSRF": ["block_source_ip", "isolate_resource"],
    "IDOR": ["disable_user", "notify_soc"],
    "XSS": ["block_source_ip", "notify_soc"],
    "CSRF": ["block_source_ip", "notify_soc"],
    "Command Injection": ["block_source_ip", "isolate_resource"],
    "File Upload": ["block_source_ip", "isolate_resource"],
    "API Abuse": ["block_source_ip", "rotate_credential"],
    "Session Attack": ["disable_user", "rotate_credential"],
    "MITM": ["notify_soc", "block_source_ip"],
    "DNS/Redirect": ["block_source_ip", "notify_soc"],
    "Deserialization": ["isolate_resource", "block_source_ip"],
    "XXE": ["isolate_resource", "block_source_ip"],
    "Cache Poisoning": ["block_source_ip", "notify_soc"],
    "Supply Chain": ["notify_soc", "rotate_credential"],
}


def classify_attack(evidence: dict) -> str:
    prompt = f"Classify this security event. Evidence: {evidence}. Pick from: {ATTACK_TYPES}"
    result = call_gemini(prompt, ThreatClassification)
    return result.attack_type


def calculate_risk(evidence: dict) -> float:
    base = 0.5
    if evidence.get("honeytoken_type") == "credential":
        base += 0.2
    if evidence.get("source_ip") and not evidence.get("source_ip", "").startswith("10."):
        base += 0.15
    return min(base, 0.99)
