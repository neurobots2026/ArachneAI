import sys
from pathlib import Path

from sqlalchemy.orm import Session

AI_ROOT = Path(__file__).resolve().parents[3] / "ai-engine"
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from graph import run_investigation  # noqa: E402

from app.core.exceptions import NotFoundError
from app.models.ai_investigation import AIInvestigation
from app.models.honeytoken import Honeytoken
from app.models.incident import Incident
from app.models.recommendation import Recommendation
from app.models.telemetry import TelemetryEvent
from app.utils.helpers import utc_now


def investigate(db: Session, incident_id: str) -> None:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise NotFoundError("Incident not found")

    event = db.query(TelemetryEvent).filter(TelemetryEvent.id == incident.telemetry_event_id).first()
    honeytoken = db.query(Honeytoken).filter(Honeytoken.id == event.honeytoken_id).first()

    context = {
        "incident_id": incident.id,
        "evidence": {
            "source_ip": event.source_ip,
            "endpoint": event.endpoint,
            "http_method": event.http_method,
            "user_agent": event.user_agent,
            "honeytoken_type": honeytoken.type if honeytoken else "unknown",
            "honeytoken_name": honeytoken.name if honeytoken else "unknown",
            "raw_metadata": event.raw_metadata,
        },
    }

    for agent_name in ["coordinator", "telemetry", "threat_intel", "reasoning", "containment", "security_advisor"]:
        inv = AIInvestigation(
            incident_id=incident.id,
            agent_name=agent_name,
            input_summary=str(context.get("evidence", {}))[:500],
            status="running",
        )
        db.add(inv)
        db.commit()

    result = run_investigation(context)

    investigations = (
        db.query(AIInvestigation)
        .filter(AIInvestigation.incident_id == incident.id)
        .order_by(AIInvestigation.started_at)
        .all()
    )
    trail = {t["agent"]: t for t in result.get("agent_trail", [])}
    for inv in investigations:
        trail_item = trail.get(inv.agent_name, {})
        inv.status = "completed"
        inv.output_summary = trail_item.get("output", "completed")
        inv.completed_at = utc_now()

    incident.attack_type = result["attack_type"]
    incident.risk_score = result["risk_score"]
    incident.confidence_score = result["confidence_score"]
    incident.ai_reasoning = result["ai_reasoning"]
    if result.get("business_impact"):
        incident.ai_reasoning += f"\n\nBusiness Impact: {result['business_impact']}"
    incident.status = "open"
    incident.updated_at = utc_now()

    for rec_data in result.get("recommendations", []):
        db.add(
            Recommendation(
                incident_id=incident.id,
                action=rec_data["action"],
                status="pending",
            )
        )

    db.commit()
