from types import SimpleNamespace

import pytest
import scenarios
from runner import SIMULATION_LOGS
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.auth import hash_password
from app.core.exceptions import AppError, NotFoundError
from app.database.base import Base
from app.models.organization import Organization
from app.models.target import TargetUser
from app.services import simulation_service
from app.services import target_service


def test_every_attacker_artifact_is_a_seeded_fake_document():
    for scenario_name in simulation_service.SIMULATION_ARTIFACTS:
        artifacts = simulation_service.get_simulation_artifacts(scenario_name)

        assert len(artifacts) == 1
        for artifact in artifacts:
            assert artifact["kind"] == "document"
            assert artifact["type"] == "document"
            assert artifact["is_decoy"] is True
            assert artifact["classification"] == simulation_service.DECOY_DOCUMENT_CLASSIFICATION
            assert artifact["provenance"] == "seeded_simulation_registry"
            assert artifact["data_origin"] == "seeded_simulation_registry"
            assert artifact["retrieval_scope"] == simulation_service.DECOY_DOCUMENT_SCOPE
            assert artifact["contains_organization_data"] is False
            assert artifact["downloadable"] is False

    file_upload_names = {
        artifact["name"]
        for artifact in simulation_service.get_simulation_artifacts("file_upload")
    }
    assert file_upload_names == {"Faculty_Salaries_DECOY.pdf"}


def test_simulator_never_copies_target_response_body_into_logs(monkeypatch):
    simulation_id = "sim-boundary-test"
    secret = "REAL-STUDENT-ROW-SHOULD-NEVER-LEAVE-TARGET"
    SIMULATION_LOGS.pop(simulation_id, None)

    monkeypatch.setattr(
        scenarios.httpx,
        "get",
        lambda *args, **kwargs: SimpleNamespace(status_code=200, text=secret),
    )

    result = scenarios._get("/boundary-test", simulation_id)
    public_logs = simulation_service.get_simulation_log(simulation_id)

    assert secret not in str(result)
    assert secret not in str(SIMULATION_LOGS[simulation_id])
    assert secret not in str(public_logs)
    assert result["body"] == scenarios.RESPONSE_BODY_SUPPRESSED
    assert public_logs[0]["detail"].startswith("Status: 200")


def test_public_log_filter_removes_legacy_raw_response_content():
    simulation_id = "sim-legacy-boundary-test"
    secret = '{"student_name":"Real Person","gpa":3.9}'
    SIMULATION_LOGS[simulation_id] = [
        {
            "timestamp": "2026-08-08T10:00:00",
            "message": "GET /students/123",
            "detail": f"Status: 200\n{secret}",
        }
    ]

    public_logs = simulation_service.get_simulation_log(simulation_id)

    assert secret not in str(public_logs)
    assert public_logs[0]["detail"].startswith("Status: 200")
    assert "Response body suppressed" in public_logs[0]["detail"]


def test_simulated_student_lookup_cannot_return_real_uuid():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    org = Organization(name="Boundary Org", industry="Education", employee_count=10)
    session.add(org)
    session.flush()
    requester = TargetUser(
        organization_id=org.id,
        email="requester@example.test",
        hashed_password=hash_password("test-password"),
        name="Requester",
        role="student",
        student_id="TEST-001",
        gpa=3.0,
    )
    real_student = TargetUser(
        organization_id=org.id,
        email="real@example.test",
        hashed_password=hash_password("test-password"),
        name="Real Student",
        role="student",
        student_id="TEST-002",
        gpa=4.0,
    )
    session.add_all([requester, real_student])
    session.commit()

    request = SimpleNamespace(headers={"x-simulation-id": "sim-123"})
    with pytest.raises(NotFoundError):
        target_service.get_student(
            session,
            org.id,
            real_student.id,
            request,
            requester,
        )

    session.close()


def test_normal_student_cannot_read_another_student_uuid():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    org = Organization(name="Access Org", industry="Education", employee_count=10)
    session.add(org)
    session.flush()
    requester = TargetUser(
        organization_id=org.id,
        email="requester2@example.test",
        hashed_password=hash_password("test-password"),
        name="Requester",
        role="student",
        student_id="TEST-101",
        gpa=3.0,
    )
    other = TargetUser(
        organization_id=org.id,
        email="other@example.test",
        hashed_password=hash_password("test-password"),
        name="Other Student",
        role="student",
        student_id="TEST-102",
        gpa=4.0,
    )
    session.add_all([requester, other])
    session.commit()

    request = SimpleNamespace(headers={})
    with pytest.raises(AppError) as exc_info:
        target_service.get_student(session, org.id, other.id, request, requester)
    assert exc_info.value.status_code == 403

    session.close()
