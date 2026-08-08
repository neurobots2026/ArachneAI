from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.honeypot import HoneypotDeployment
from app.schemas.reports import ActivityItem, DashboardStatus, DashboardSummary, ReportResponse, ThreatItem
from app.services import dashboard_service, report_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return dashboard_service.get_summary(db, user.organization_id)


@router.get("/threats", response_model=list[ThreatItem])
def threats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return dashboard_service.get_threats(db, user.organization_id)


@router.get("/activity", response_model=list[ActivityItem])
def activity(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return dashboard_service.get_activity(db, user.organization_id)


@router.get("/status", response_model=DashboardStatus)
def status(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return dashboard_service.get_status(db, user.organization_id)


@router.get("/deception-response")
def deception_response(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    deployments = (
        db.query(HoneypotDeployment)
        .filter(HoneypotDeployment.organization_id == user.organization_id)
        .order_by(HoneypotDeployment.deployed_at.desc())
        .limit(25)
        .all()
    )
    return {
        "deployments": [
            {
                "id": item.id,
                "incident_id": item.incident_id,
                "simulation_id": item.simulation_id,
                "attack_type": item.attack_type,
                "state": item.state,
                "target_zone": item.target_zone,
                "deployed_at": item.deployed_at,
                "updated_at": item.updated_at,
                "environment": "isolated_simulation",
            }
            for item in deployments
        ]
    }
