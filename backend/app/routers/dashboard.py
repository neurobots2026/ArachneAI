from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
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
