from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.honeytoken import Honeytoken
from app.models.honeypot import HoneypotDeployment
from app.models.incident import Incident
from app.models.target import SiteActivity
from app.models.telemetry import TelemetryEvent
from app.schemas.reports import (
    ActivityItem,
    DashboardStatus,
    DashboardSummary,
    DeceptionResponseStatus,
    ThreatItem,
)
from app.utils.helpers import utc_now


def get_summary(db: Session, org_id: str) -> DashboardSummary:
    total = db.query(Incident).filter(Incident.organization_id == org_id).count()
    open_count = (
        db.query(Incident)
        .filter(Incident.organization_id == org_id, Incident.status.in_(["open", "investigating"]))
        .count()
    )
    critical = (
        db.query(Incident)
        .filter(Incident.organization_id == org_id, Incident.risk_score >= 0.7)
        .count()
    )
    honeytokens = db.query(Honeytoken).filter(Honeytoken.organization_id == org_id).count()
    since = utc_now() - timedelta(hours=24)
    telemetry_24h = (
        db.query(TelemetryEvent)
        .join(Honeytoken, TelemetryEvent.honeytoken_id == Honeytoken.id)
        .filter(Honeytoken.organization_id == org_id, TelemetryEvent.timestamp >= since)
        .count()
    )
    return DashboardSummary(
        total_incidents=total,
        open_incidents=open_count,
        critical_incidents=critical,
        honeytokens_deployed=honeytokens,
        telemetry_events_24h=telemetry_24h,
    )


def get_threats(db: Session, org_id: str) -> list[ThreatItem]:
    rows = (
        db.query(
            Incident.attack_type,
            func.count(Incident.id),
            func.avg(Incident.risk_score),
        )
        .filter(Incident.organization_id == org_id)
        .group_by(Incident.attack_type)
        .all()
    )
    return [
        ThreatItem(attack_type=r[0], count=r[1], avg_risk_score=float(r[2] or 0))
        for r in rows
    ]


def get_activity(db: Session, org_id: str, limit: int = 20) -> list[ActivityItem]:
    items: list[ActivityItem] = []

    site_events = (
        db.query(SiteActivity)
        .filter(SiteActivity.organization_id == org_id)
        .order_by(SiteActivity.created_at.desc())
        .limit(limit)
        .all()
    )
    for e in site_events:
        items.append(
            ActivityItem(
                id=e.id,
                type=e.event_type or "normal",
                description=e.description,
                timestamp=e.created_at,
            )
        )

    telemetry = (
        db.query(TelemetryEvent)
        .join(Honeytoken, TelemetryEvent.honeytoken_id == Honeytoken.id)
        .filter(Honeytoken.organization_id == org_id)
        .order_by(TelemetryEvent.timestamp.desc())
        .limit(limit)
        .all()
    )
    for t in telemetry:
        items.append(
            ActivityItem(
                id=t.id,
                type="alert",
                description=f"Honeytoken triggered at {t.endpoint}",
                timestamp=t.timestamp,
            )
        )

    incidents = (
        db.query(Incident)
        .filter(Incident.organization_id == org_id)
        .order_by(Incident.created_at.desc())
        .limit(limit)
        .all()
    )
    for i in incidents:
        items.append(
            ActivityItem(
                id=i.id,
                type="incident",
                description=f"{i.attack_type} incident ({i.status})",
                timestamp=i.created_at,
            )
        )

    items.sort(key=lambda x: x.timestamp, reverse=True)
    return items[:limit]


def get_status(db: Session, org_id: str) -> DashboardStatus:
    summary = get_summary(db, org_id)
    recent_activity = get_activity(db, org_id, limit=8)
    open_incidents = (
        db.query(Incident)
        .filter(Incident.organization_id == org_id, Incident.status.in_(["open", "investigating"]))
        .all()
    )
    contained = (
        db.query(Incident)
        .filter(Incident.organization_id == org_id, Incident.status == "contained")
        .count()
    )
    latest_incident = (
        db.query(Incident)
        .filter(Incident.organization_id == org_id)
        .order_by(Incident.created_at.desc())
        .first()
    )
    latest_deployment = (
        db.query(HoneypotDeployment)
        .filter(HoneypotDeployment.organization_id == org_id)
        .order_by(HoneypotDeployment.deployed_at.desc())
        .first()
    )
    latest_open = max(open_incidents, key=lambda item: item.created_at) if open_incidents else None
    comparison_now = utc_now()
    if latest_open and latest_open.created_at and latest_open.created_at.tzinfo is None:
        comparison_now = comparison_now.replace(tzinfo=None)
    latest_age_seconds = (
        (comparison_now - latest_open.created_at).total_seconds()
        if latest_open and latest_open.created_at
        else None
    )
    if not open_incidents and contained > 0:
        state = "contained"
    elif latest_age_seconds is not None and latest_age_seconds < 6:
        state = "alert"
    elif latest_age_seconds is not None and latest_age_seconds < 12:
        state = "investigating"
    elif any(i.risk_score >= 0.7 for i in open_incidents):
        state = "critical"
    elif any(i.status == "investigating" for i in open_incidents):
        state = "investigating"
    elif open_incidents:
        state = "investigating"
    else:
        state = "normal"

    if state == "normal":
        deception_response = DeceptionResponseStatus(
            honeytoken_state="armed",
            honeypot_state="standby",
            response_stage="monitoring",
            last_incident_id=None,
            deployment_id=None,
            message="Normal organization activity is being monitored; deception assets are armed.",
        )
    elif state == "contained":
        deception_response = DeceptionResponseStatus(
            honeytoken_state="rotated",
            honeypot_state="deployed",
            response_stage="contained",
            last_incident_id=latest_incident.id if latest_incident else None,
            deployment_id=latest_deployment.id if latest_deployment else None,
            message="The decoy interaction is contained; the adaptive honeypot remains under observation.",
        )
    else:
        response_stage = {
            "alert": "alert",
            "investigating": "investigating",
            "critical": "responding",
        }.get(state, "responding")
        deception_response = DeceptionResponseStatus(
            honeytoken_state="triggered",
            honeypot_state="deployed",
            response_stage=response_stage,
            last_incident_id=latest_incident.id if latest_incident else None,
            deployment_id=latest_deployment.id if latest_deployment else None,
            message="A honeytoken fired and the adaptive honeypot was deployed around the attacker session.",
        )
    return DashboardStatus(
        state=state,
        open_incidents=len(open_incidents),
        recent_activity=recent_activity,
        summary=summary,
        deception_response=deception_response,
    )
