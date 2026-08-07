from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.incident import ApproveRecommendationRequest, IncidentResponse, RecommendationResponse
from app.services import incident_service

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=list[IncidentResponse])
def list_incidents(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return incident_service.list_incidents(db, user.organization_id)


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return incident_service.get_incident(db, user.organization_id, incident_id)


@router.post("/{incident_id}/investigate", response_model=IncidentResponse)
def investigate(
    incident_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    from app.services import ai_service

    ai_service.investigate(db, incident_id)
    return incident_service.get_incident(db, user.organization_id, incident_id)


@router.post("/contain", response_model=RecommendationResponse)
def contain(
    req: ApproveRecommendationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return incident_service.approve_recommendation(
        db, user.organization_id, req.recommendation_id, user.id, req.approved
    )
