from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.models.incident import Incident
from app.models.organization import Organization
from app.models.telemetry import TelemetryEvent
from app.services import dashboard_service


def test_dashboard_status_uses_incident_state():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    org = Organization(name="Test Org", industry="Tech", employee_count=100)
    session.add(org)
    session.commit()
    session.refresh(org)

    telemetry = TelemetryEvent(
        honeytoken_id="ht_test",
        source_ip="127.0.0.1",
        user_agent="test-agent",
        endpoint="/login",
        http_method="POST",
        timestamp=__import__("datetime").datetime.utcnow(),
        session_id="session-1",
        raw_metadata={},
    )
    session.add(telemetry)
    session.commit()
    session.refresh(telemetry)

    incident = Incident(
        organization_id=org.id,
        telemetry_event_id=telemetry.id,
        attack_type="Broken Auth",
        risk_score=0.82,
        confidence_score=0.9,
        status="investigating",
        ai_reasoning="test",
    )
    session.add(incident)
    session.commit()

    status = dashboard_service.get_status(session, org.id)

    assert status.state == "investigating"
    assert status.open_incidents == 1
    assert status.recent_activity[0].description.startswith("Broken Auth")

    session.close()
