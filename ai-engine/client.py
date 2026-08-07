import json
import os
import re
from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def call_gemini(prompt: str, response_schema: type[T]) -> T:
    if not GEMINI_API_KEY:
        return _mock_response(prompt, response_schema)

    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        schema_json = json.dumps(response_schema.model_json_schema())
        full_prompt = (
            f"{prompt}\n\nRespond ONLY with valid JSON matching this schema:\n{schema_json}"
        )
        response = model.generate_content(full_prompt)
        text = response.text or "{}"
        text = re.sub(r"^```json\s*|\s*```$", "", text.strip())
        data = json.loads(text)
        return response_schema.model_validate(data)
    except Exception:
        return _mock_response(prompt, response_schema)


def call_gemini_text(prompt: str) -> str:
    if not GEMINI_API_KEY:
        return "Automated analysis indicates unauthorized access to a decoy asset with elevated risk."

    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text or ""
    except Exception:
        return "Automated analysis indicates unauthorized access to a decoy asset with elevated risk."


def _mock_response(prompt: str, response_schema: type[T]) -> T:
    name = response_schema.__name__
    if name == "ThreatClassification":
        attack = "Broken Auth"
        upper = prompt.upper()
        for candidate in [
            "SSRF", "IDOR", "XSS", "CSRF", "COMMAND INJECTION", "FILE UPLOAD",
            "API ABUSE", "SESSION ATTACK", "MITM", "DNS", "DESERIALIZATION",
            "XXE", "CACHE POISONING", "SUPPLY CHAIN",
        ]:
            if candidate in upper:
                attack = candidate.title() if candidate != "DNS" else "DNS/Redirect"
                break
        return response_schema.model_validate(
            {"attack_type": attack, "confidence_score": 0.87}
        )
    if name == "ReasoningOutput":
        return response_schema.model_validate(
            {
                "evidence": [
                    "Honeytoken credential was accessed from an external IP address.",
                    "Request targeted an internal-only placement path.",
                    "User agent indicates automated scanning behavior.",
                ],
                "summary": "Likely credential theft attempt against decoy asset.",
            }
        )
    if name == "DeceptionStrategy":
        return response_schema.model_validate(
            {
                "assets": ["AWS credentials", "Payroll spreadsheet"],
                "honeytokens": [
                    {
                        "type": "credential",
                        "name": "AWS Admin Key",
                        "department": "Engineering",
                        "placement_path": "/internal/.env",
                        "reasoning": "Developers often store cloud keys in env files.",
                    }
                ],
                "justification": "Organization profile suggests credential and document decoys.",
            }
        )
    return response_schema.model_validate({})
