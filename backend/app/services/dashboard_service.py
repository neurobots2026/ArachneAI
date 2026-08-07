from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.honeytoken import Honeytoken
from app.models.incident import Incident
from app.models.target import SiteActivity
from app.models.telemetry import TelemetryEvent
from app.schemas.reports import ActivityItem, DashboardStatus, DashboardSummary, ThreatItem
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
                type="normal",
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
    if not open_incidents and contained > 0:
        state = "contained"
    elif any(i.status == "investigating" for i in open_incidents):
        state = "investigating"
    elif any(i.risk_score >= 0.7 for i in open_incidents):
        state = "critical"
    elif open_incidents:
        state = "investigating"
    else:
        state = "normal"
    return DashboardStatus(
        state=state,
        open_incidents=len(open_incidents),
        recent_activity=recent_activity,
        summary=summary,
    )
