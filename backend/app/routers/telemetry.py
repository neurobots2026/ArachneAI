from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.telemetry import TelemetryEventRequest, TelemetryResponse
from app.services import telemetry_service

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


@router.post("/events", response_model=TelemetryResponse)
def record_event(req: TelemetryEventRequest, db: Session = Depends(get_db)):
    return telemetry_service.record_event(db, req)


@router.get("/events", response_model=list[TelemetryResponse])
def list_events(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return telemetry_service.list_events(db, user.organization_id)
