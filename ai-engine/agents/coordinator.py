"""Orchestrates multi-agent investigation pipeline."""

from agents import (
    containment_agent,
    reasoning_agent,
    security_advisor,
    telemetry_agent,
    threat_intel_agent,
)


def run(context: dict) -> dict:
    telemetry = telemetry_agent.run(context)
    threat = threat_intel_agent.run(context)
    reasoning = reasoning_agent.run(context, telemetry, threat)
    containment = containment_agent.run(threat)
    advisor = security_advisor.run(context, reasoning, threat)

    return {
        "telemetry": telemetry,
        "threat": threat,
        "reasoning": reasoning,
        "containment": containment,
        "advisor": advisor,
    }
