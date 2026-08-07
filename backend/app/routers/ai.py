from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.incident import IncidentResponse
from app.services import ai_service, incident_service

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/investigate/{incident_id}", response_model=IncidentResponse)
def investigate(
    incident_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    ai_service.investigate(db, incident_id)
    return incident_service.get_incident(db, user.organization_id, incident_id)
