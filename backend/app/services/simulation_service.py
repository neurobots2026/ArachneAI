import sys
import threading
import re
from datetime import timedelta
from pathlib import Path

from sqlalchemy.orm import Session

ATTACK_ROOT = Path(__file__).resolve().parents[3] / "attack-simulator"
if str(ATTACK_ROOT) not in sys.path:
    sys.path.insert(0, str(ATTACK_ROOT))

from runner import run_scenario  # noqa: E402

from app.models.attack import AttackSimulation
from app.models.ai_investigation import AIInvestigation
from app.models.incident import Incident
from app.models.honeytoken import Honeytoken
from app.models.honeypot import HoneypotDeployment
from app.models.recommendation import Recommendation
from app.models.report import Report
from app.models.target import CourseReview, SiteActivity
from app.models.telemetry import TelemetryEvent
from app.schemas.attack import SimulationResponse
from app.utils.helpers import utc_now


# This is the only source of attacker-visible retrieved content. Entries are
# static, synthetic demo fixtures; target response bodies and organization
# records are never promoted into this registry.
SIMULATION_ARTIFACTS: dict[str, list[dict]] = {
    "broken_auth": [
        {"name": "Admin_Backup_Access_Notes_DECOY.txt", "format": "text", "source": "credential honeypot vault", "preview": "DECOY access notes for the planted backup identity; no organization account data", "size": "1.2 KB"},
    ],
    "ssrf": [
        {"name": "Finance_API_Runbook_DECOY.pdf", "format": "pdf", "source": "adaptive finance honeypot", "preview": "DECOY finance API runbook · AKIA-CRESTWOOD-DECOY-ONLY · 0 organization records", "size": "24 KB"},
    ],
    "xss": [
        {"name": "Session_Token_Audit_DECOY.csv", "format": "csv", "source": "controlled render-beacon honeypot", "preview": "DECOY browser-session audit rows; all identities and tokens are synthetic", "size": "8.4 KB"},
    ],
    "csrf": [
        {"name": "Provost_Profile_Change_Request_DECOY.pdf", "format": "pdf", "source": "profile-mutation honeypot", "preview": "DECOY profile-change form; real profile remained unchanged", "size": "31 KB"},
    ],
    "idor": [
        {"name": "Student_Record_CW-GHOST-99999_DECOY.pdf", "format": "pdf", "source": "reserved student-record range", "preview": "DECOY student file for CW-GHOST-99999 · synthetic identity and academic fields", "size": "36 KB"},
    ],
    "command_injection": [
        {"name": "Exam_Answer_Key_DECOY.pdf", "format": "pdf", "source": "simulated command resolver", "preview": "DECOY: CS-301 practice key — answer sequence B,D,A,C", "size": "18 KB"},
    ],
    "file_upload": [
        {"name": "Faculty_Salaries_DECOY.pdf", "format": "pdf", "source": "adaptive file honeypot", "preview": "DECOY FACULTY COMPENSATION — synthetic people and salary rows only", "size": "42 KB"},
    ],
    "api_abuse": [
        {"name": "Financial_Aid_Export_DECOY.csv", "format": "csv", "source": "bulk-data API honeypot", "preview": "DECOY financial-aid export · 2 synthetic rows · 0 real student rows", "size": "12 KB"},
    ],
    "session_attack": [
        {"name": "Board_Minutes_DECOY.pdf", "format": "pdf", "source": "decoy session dashboard", "preview": "DECOY executive board minutes linked only to the synthetic session account", "size": "64 KB"},
    ],
    "mitm": [
        {"name": "Secure_Channel_Audit_DECOY.pdf", "format": "pdf", "source": "network-signature honeypot", "preview": "DECOY secure-channel audit with synthetic forwarded chain and certificate fingerprint", "size": "28 KB"},
    ],
    "dns_redirect": [
        {"name": "SSO_Redirect_Config_DECOY.pdf", "format": "pdf", "source": "redirect-capture honeypot", "preview": "DECOY SSO redirect configuration using a reserved non-routable lookalike destination", "size": "19 KB"},
    ],
    "deserialization": [
        {"name": "Debug_Configuration_DECOY.json", "format": "json", "source": "settings-import honeypot", "preview": "DECOY debug configuration · /__decoy_debug__ · object creation disabled", "size": "388 B"},
    ],
    "xxe": [
        {"name": "Transcript_Import_Secrets_DECOY.txt", "format": "text", "source": "non-networked XML resolver", "preview": "DECOY transcript-import configuration · AWS_KEY=AKIA-XXE-DECOY-ONLY", "size": "1.4 KB"},
    ],
    "cache_poisoning": [
        {"name": "Portal_Cache_Config_DECOY.json", "format": "json", "source": "in-memory demo cache", "preview": "DECOY portal cache configuration · training-cache.example.invalid", "size": "776 B"},
    ],
    "supply_chain": [
        {"name": "Internal_Package_Manifest_DECOY.json", "format": "json", "source": "fake local registry", "preview": "DECOY package manifest · crestwood-internal-utils@99.0.0-malicious · install disabled", "size": "1.4 KB"},
    ],
}


DECOY_DOCUMENT_CLASSIFICATION = "synthetic_decoy_document"
DECOY_DOCUMENT_SCOPE = "seeded_fake_documents_only"
_STATUS_RE = re.compile(r"\bStatus:\s*(\d{3})\b")


def _artifact_document(scenario_name: str, index: int, artifact: dict) -> dict:
    """Build the immutable attacker-facing fake-document contract."""
    return {
        "id": f"decoy-{scenario_name}-{index + 1:02d}",
        "name": artifact["name"],
        "kind": "document",
        "type": "document",
        "format": artifact["format"],
        "source": artifact["source"],
        "provenance": "seeded_simulation_registry",
        "preview": artifact["preview"],
        "size": artifact["size"],
        "status": "retrieved",
        "classification": DECOY_DOCUMENT_CLASSIFICATION,
        "is_decoy": True,
        "data_origin": "seeded_simulation_registry",
        "retrieval_scope": DECOY_DOCUMENT_SCOPE,
        "contains_organization_data": False,
        "downloadable": False,
    }


def get_simulation_artifacts(scenario_name: str) -> list[dict]:
    return [
        _artifact_document(scenario_name, index, artifact)
        for index, artifact in enumerate(SIMULATION_ARTIFACTS.get(scenario_name, []))
    ]


def _safe_public_log_entry(entry: dict) -> dict:
    """Reduce an internal runner event to non-sensitive attacker telemetry.

    The simulator needs HTTP status codes to explain its workflow, but it does
    not need target response bodies. This allowlist also protects older in-memory
    traces produced before response suppression was enabled.
    """
    raw_message = str(entry.get("message", ""))
    status_match = _STATUS_RE.search(str(entry.get("detail", "")))

    if raw_message.startswith(("GET /", "POST /")):
        message = raw_message[:180]
        detail = (
            f"Status: {status_match.group(1)}\n" if status_match else ""
        ) + "Response body suppressed; inspect only the seeded fake documents listed in Retrieved data."
    elif raw_message.startswith("Starting "):
        message = raw_message[:180]
        detail = "Executing an allowlisted local scenario against the synthetic deception surface."
    elif raw_message.startswith("Scenario "):
        message = raw_message[:180]
        detail = f"Retrieval scope: {DECOY_DOCUMENT_SCOPE}; organization records exposed: false."
    elif raw_message == "Captured decoy session":
        message = raw_message
        detail = (
            f"Status: {status_match.group(1)}\n" if status_match else ""
        ) + "Synthetic session marker retained inside the isolated simulator; token suppressed."
    else:
        message = "Simulation event"
        detail = "Internal detail suppressed by the fake-document-only data boundary."

    return {
        "timestamp": str(entry.get("timestamp", ""))[:40],
        "message": message,
        "detail": detail,
        "data_classification": "simulation_metadata_only",
    }


def start_simulation(db: Session, org_id: str, scenario_name: str) -> SimulationResponse:
    if scenario_name not in SIMULATION_ARTIFACTS:
        from app.core.exceptions import AppError

        raise AppError(f"Unknown scenario: {scenario_name}", 400)
    sim = AttackSimulation(
        organization_id=org_id,
        scenario_name=scenario_name,
        status="running",
        started_at=utc_now(),
    )
    db.add(sim)
    db.commit()
    db.refresh(sim)

    def _run():
        from app.database.session import SessionLocal

        local_db = SessionLocal()
        try:
            result = run_scenario(scenario_name, org_id, sim.id)
            local_sim = local_db.query(AttackSimulation).filter(AttackSimulation.id == sim.id).first()
            if local_sim:
                candidates = (
                    local_db.query(Incident)
                    .filter(
                        Incident.organization_id == org_id,
                        Incident.created_at >= (sim.started_at or utc_now() - timedelta(seconds=30)),
                    )
                    .order_by(Incident.created_at.desc())
                    .all()
                )
                incident = None
                for candidate in candidates:
                    event = local_db.query(TelemetryEvent).filter(
                        TelemetryEvent.id == candidate.telemetry_event_id
                    ).first()
                    if event and (event.raw_metadata or {}).get("simulation_id") == sim.id:
                        incident = candidate
                        break
                local_sim.status = "completed" if result.get("status") == "completed" else "failed"
                local_sim.finished_at = utc_now()
                if incident:
                    local_sim.resulting_incident_id = incident.id
                local_db.commit()
        except Exception as exc:
            from runner import append_log  # noqa: WPS433

            append_log(
                sim.id,
                "Scenario worker failed",
                f"Local worker failed ({type(exc).__name__}); response content suppressed",
            )
            local_sim = local_db.query(AttackSimulation).filter(AttackSimulation.id == sim.id).first()
            if local_sim:
                local_sim.status = "failed"
                local_sim.finished_at = utc_now()
                local_db.commit()
        finally:
            local_db.close()

    threading.Thread(target=_run, daemon=True).start()
    return SimulationResponse.model_validate(sim)


def get_simulation_log(sim_id: str) -> list[dict]:
    attack_root = Path(__file__).resolve().parents[3] / "attack-simulator"
    if str(attack_root) not in sys.path:
        sys.path.insert(0, str(attack_root))
    from runner import get_logs  # noqa: E402

    return [_safe_public_log_entry(entry) for entry in get_logs(sim_id)]


def get_simulation(db: Session, org_id: str, sim_id: str) -> SimulationResponse:
    sim = (
        db.query(AttackSimulation)
        .filter(AttackSimulation.id == sim_id, AttackSimulation.organization_id == org_id)
        .first()
    )
    if not sim:
        from app.core.exceptions import NotFoundError

        raise NotFoundError("Simulation not found")
    return SimulationResponse.model_validate(sim)


def reset_demo_state(db: Session, org_id: str) -> dict:
    """Remove simulation-tagged evidence while preserving organization data."""
    simulations = db.query(AttackSimulation).filter(
        AttackSimulation.organization_id == org_id
    ).all()
    events = (
        db.query(TelemetryEvent)
        .join(Honeytoken, TelemetryEvent.honeytoken_id == Honeytoken.id)
        .filter(Honeytoken.organization_id == org_id)
        .all()
    )
    simulation_events = [
        event for event in events if (event.raw_metadata or {}).get("simulation_id")
    ]
    event_ids = [event.id for event in simulation_events]
    incidents = (
        db.query(Incident)
        .filter(Incident.organization_id == org_id, Incident.telemetry_event_id.in_(event_ids))
        .all()
        if event_ids
        else []
    )
    incident_ids = [incident.id for incident in incidents]

    counts = {
        "simulations": len(simulations),
        "incidents": len(incidents),
        "telemetry_events": len(simulation_events),
    }
    if incident_ids:
        db.query(Report).filter(Report.incident_id.in_(incident_ids)).delete(synchronize_session=False)
        db.query(Recommendation).filter(Recommendation.incident_id.in_(incident_ids)).delete(synchronize_session=False)
        db.query(AIInvestigation).filter(AIInvestigation.incident_id.in_(incident_ids)).delete(synchronize_session=False)
        db.query(HoneypotDeployment).filter(HoneypotDeployment.incident_id.in_(incident_ids)).delete(synchronize_session=False)
    db.query(AttackSimulation).filter(AttackSimulation.organization_id == org_id).delete(synchronize_session=False)
    if incident_ids:
        db.query(Incident).filter(Incident.id.in_(incident_ids)).delete(synchronize_session=False)
    if event_ids:
        db.query(TelemetryEvent).filter(TelemetryEvent.id.in_(event_ids)).delete(synchronize_session=False)

    # These exact markers are generated only by the local simulator.
    db.query(CourseReview).filter(
        CourseReview.content == "<script>simulated_beacon()</script>"
    ).delete(synchronize_session=False)
    simulated_endpoints = [
        "/target/admin/fetch",
        "/target/admin/ping",
        "/target/portal/assignments/upload",
        "/target/admin/import-settings",
        "/target/admin/import-xml",
        "/target/go",
    ]
    db.query(SiteActivity).filter(
        SiteActivity.organization_id == org_id,
        (SiteActivity.event_type == "simulation") | (SiteActivity.endpoint.in_(simulated_endpoints)),
    ).delete(synchronize_session=False)
    db.commit()
    return {"status": "reset", "removed": counts, "organization_records_preserved": True}
