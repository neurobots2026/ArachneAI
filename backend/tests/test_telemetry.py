import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.auth import hash_password
from app.database.base import Base
from app.models.honeytoken import Honeytoken
from app.models.organization import Organization
from app.models.user import User
from app.schemas.telemetry import TelemetryEventRequest
from app.services import auth_service, telemetry_service


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    org = Organization(name="Test Org", industry="Tech", employee_count=10, cloud_provider="AWS", departments=["Engineering"])
    session.add(org)
    session.commit()
    yield session, org
    session.close()


def test_register_and_login(db):
    session, org = db
    auth_service.register_user(session, "test@example.com", "password123", org.id)
    token = auth_service.authenticate_user(session, "test@example.com", "password123")
    assert token.access_token


def test_telemetry_creates_incident(db):
    session, org = db
    ht = Honeytoken(
        organization_id=org.id,
        type="credential",
        name="Test Key",
        fake_value="AKIATEST123",
        department="Engineering",
        placement_path="/internal/.env",
    )
    session.add(ht)
    session.commit()

    event = telemetry_service.record_event(
        session,
        TelemetryEventRequest(
            honeytoken_id=ht.id,
            source_ip="203.0.113.1",
            endpoint="/api/login",
            http_method="POST",
        ),
    )
    assert event.id

    from app.models.incident import Incident

    incident = session.query(Incident).filter(Incident.telemetry_event_id == event.id).first()
    assert incident is not None
    assert incident.attack_type != "Unknown"
