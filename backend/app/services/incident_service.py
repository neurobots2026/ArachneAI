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
from app.models.honeypot import HoneypotDeployment
from app.models.incident import Incident
from app.models.recommendation import Recommendation
from app.models.telemetry import TelemetryEvent
from app.schemas.incident import IncidentResponse, RecommendationResponse, AIInvestigationResponse
from app.schemas.telemetry import TelemetryResponse
from app.utils.helpers import utc_now


def create_incident_from_event(db: Session, event: TelemetryEvent) -> Incident:
    honeytoken = db.query(Honeytoken).filter(Honeytoken.id == event.honeytoken_id).first()
    if not honeytoken:
        raise NotFoundError("Honeytoken not found for telemetry event")

    incident = Incident(
        organization_id=honeytoken.organization_id,
        telemetry_event_id=event.id,
        status="investigating",
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    metadata = event.raw_metadata or {}
    if "adaptive_honeypot_deployed" in metadata.get("deception_response", []):
        db.add(
            HoneypotDeployment(
                organization_id=honeytoken.organization_id,
                incident_id=incident.id,
                simulation_id=metadata.get("simulation_id", ""),
                attack_type=metadata.get("attack_type_hint", "Unknown"),
                state="deployed",
                target_zone=event.endpoint,
            )
        )
        db.commit()

    from app.services import ai_service

    ai_service.investigate(db, incident.id)
    db.refresh(incident)
    return incident


def get_incident(db: Session, org_id: str, incident_id: str) -> IncidentResponse:
    incident = (
        db.query(Incident)
        .filter(Incident.id == incident_id, Incident.organization_id == org_id)
        .first()
    )
    if not incident:
        raise NotFoundError("Incident not found")
    return _to_response(db, incident)


def list_incidents(db: Session, org_id: str) -> list[IncidentResponse]:
    incidents = (
        db.query(Incident)
        .filter(Incident.organization_id == org_id)
        .order_by(Incident.created_at.desc())
        .all()
    )
    return [_to_response(db, i) for i in incidents]


def approve_recommendation(
    db: Session, org_id: str, recommendation_id: str, user_id: str, approved: bool
) -> RecommendationResponse:
    rec = (
        db.query(Recommendation)
        .join(Incident, Recommendation.incident_id == Incident.id)
        .filter(Recommendation.id == recommendation_id, Incident.organization_id == org_id)
        .first()
    )
    if not rec:
        raise NotFoundError("Recommendation not found")

    rec.status = "approved" if approved else "rejected"
    rec.approved_by = user_id if approved else None
    incident = db.query(Incident).filter(Incident.id == rec.incident_id).first()
    if incident and approved:
        incident.status = "contained"
        incident.updated_at = utc_now()
        deployments = db.query(HoneypotDeployment).filter(
            HoneypotDeployment.incident_id == incident.id
        ).all()
        for deployment in deployments:
            deployment.state = "monitoring"
            deployment.updated_at = utc_now()
    db.commit()
    db.refresh(rec)
    return RecommendationResponse.model_validate(rec)


def _to_response(db: Session, incident: Incident) -> IncidentResponse:
    event = db.query(TelemetryEvent).filter(TelemetryEvent.id == incident.telemetry_event_id).first()
    investigations = (
        db.query(AIInvestigation)
        .filter(AIInvestigation.incident_id == incident.id)
        .order_by(AIInvestigation.started_at)
        .all()
    )
    recommendations = (
        db.query(Recommendation).filter(Recommendation.incident_id == incident.id).all()
    )
    return IncidentResponse(
        id=incident.id,
        organization_id=incident.organization_id,
        status=incident.status,
        attack_type=incident.attack_type,
        risk_score=incident.risk_score,
        confidence_score=incident.confidence_score,
        ai_reasoning=incident.ai_reasoning,
        created_at=incident.created_at,
        updated_at=incident.updated_at,
        telemetry=TelemetryResponse.model_validate(event) if event else None,
        recommendations=[RecommendationResponse.model_validate(r) for r in recommendations],
        ai_investigations=[AIInvestigationResponse.model_validate(i) for i in investigations],
    )
