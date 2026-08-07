import sys
import threading
from datetime import timedelta
from pathlib import Path

from sqlalchemy.orm import Session

ATTACK_ROOT = Path(__file__).resolve().parents[3] / "attack-simulator"
if str(ATTACK_ROOT) not in sys.path:
    sys.path.insert(0, str(ATTACK_ROOT))

from runner import run_scenario  # noqa: E402

from app.models.attack import AttackSimulation
from app.models.incident import Incident
from app.schemas.attack import SimulationResponse
from app.utils.helpers import utc_now


def start_simulation(db: Session, org_id: str, scenario_name: str) -> SimulationResponse:
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
            run_scenario(scenario_name, org_id, sim.id)
            local_sim = local_db.query(AttackSimulation).filter(AttackSimulation.id == sim.id).first()
            if local_sim:
                since = utc_now() - timedelta(seconds=30)
                incident = (
                    local_db.query(Incident)
                    .filter(Incident.organization_id == org_id, Incident.created_at >= since)
                    .order_by(Incident.created_at.desc())
                    .first()
                )
                local_sim.status = "completed"
                local_sim.finished_at = utc_now()
                if incident:
                    local_sim.resulting_incident_id = incident.id
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

    return get_logs(sim_id)


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
