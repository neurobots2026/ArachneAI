from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.reports import ReportResponse
from app.services import report_service

router = APIRouter(tags=["reports"])


@router.post("/reports/generate/{incident_id}", response_model=ReportResponse)
def generate_report(
    incident_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return report_service.generate_report(db, user.organization_id, incident_id)


@router.get("/reports", response_model=list[ReportResponse])
def list_reports(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return report_service.list_reports(db, user.organization_id)


@router.get("/reports/{report_id}/download")
def download_report(
    report_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    from app.core.exceptions import NotFoundError
    from app.models.incident import Incident
    from app.models.report import Report

    report = (
        db.query(Report)
        .join(Incident, Report.incident_id == Incident.id)
        .filter(Report.id == report_id, Incident.organization_id == user.organization_id)
        .first()
    )
    if not report:
        raise NotFoundError("Report not found")
    return FileResponse(report.file_path, filename=report.file_path.split("/")[-1])
