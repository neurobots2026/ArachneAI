from sqlalchemy.orm import Session

from app.models.telemetry import TelemetryEvent
from app.schemas.telemetry import TelemetryEventRequest, TelemetryResponse
from app.services import incident_service


def record_event(db: Session, data: TelemetryEventRequest) -> TelemetryResponse:
    event = TelemetryEvent(**data.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    incident_service.create_incident_from_event(db, event)
    return TelemetryResponse.model_validate(event)


def list_events(db: Session, org_id: str, limit: int = 50) -> list[TelemetryResponse]:
    from app.models.honeytoken import Honeytoken

    events = (
        db.query(TelemetryEvent)
        .join(Honeytoken, TelemetryEvent.honeytoken_id == Honeytoken.id)
        .filter(Honeytoken.organization_id == org_id)
        .order_by(TelemetryEvent.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [TelemetryResponse.model_validate(e) for e in events]
