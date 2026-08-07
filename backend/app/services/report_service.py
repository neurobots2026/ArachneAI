from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.incident import Incident
from app.models.report import Report
from app.schemas.reports import ReportResponse
from app.services import incident_service

REPORTS_ROOT = Path(__file__).resolve().parents[3] / "reports"
TEMPLATE_DIR = REPORTS_ROOT / "incident_templates"
OUTPUT_DIR = REPORTS_ROOT / "generated_reports"


def generate_report(db: Session, org_id: str, incident_id: str) -> ReportResponse:
    incident_resp = incident_service.get_incident(db, org_id, incident_id)
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise NotFoundError("Incident not found")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = env.get_template("incident_report.html")
    html = template.render(
        incident=incident_resp,
        recommendations=incident_resp.recommendations,
        telemetry=incident_resp.telemetry,
    )

    html_path = OUTPUT_DIR / f"{incident_id}.html"
    html_path.write_text(html, encoding="utf-8")

    pdf_path = OUTPUT_DIR / f"{incident_id}.pdf"
    try:
        from weasyprint import HTML

        HTML(string=html).write_pdf(str(pdf_path))
        file_path = str(pdf_path)
    except Exception:
        file_path = str(html_path)

    report = Report(incident_id=incident_id, file_path=file_path)
    db.add(report)
    db.commit()
    db.refresh(report)
    return ReportResponse.model_validate(report)


def list_reports(db: Session, org_id: str) -> list[ReportResponse]:
    reports = (
        db.query(Report)
        .join(Incident, Report.incident_id == Incident.id)
        .filter(Incident.organization_id == org_id)
        .order_by(Report.generated_at.desc())
        .all()
    )
    return [ReportResponse.model_validate(r) for r in reports]
