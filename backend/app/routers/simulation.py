from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.attack import AttackSimulation

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.attack import SimulationResponse, StartSimulationRequest
from app.services import simulation_service

router = APIRouter(prefix="/simulation", tags=["simulation"])


@router.get("/scenarios")
def list_scenarios(user: User = Depends(get_current_user)):
    del user
    return [
        {
            "id": scenario_id,
            "artifact_count": len(artifacts),
            "safety": "local_synthetic_simulation",
            "retrieval_scope": simulation_service.DECOY_DOCUMENT_SCOPE,
            "artifact_classification": simulation_service.DECOY_DOCUMENT_CLASSIFICATION,
        }
        for scenario_id, artifacts in simulation_service.SIMULATION_ARTIFACTS.items()
    ]


@router.get("/history", response_model=list[SimulationResponse])
def simulation_history(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return (
        db.query(AttackSimulation)
        .filter(AttackSimulation.organization_id == user.organization_id)
        .order_by(AttackSimulation.started_at.desc())
        .limit(30)
        .all()
    )


@router.post("/reset")
def reset_simulations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != "admin":
        from app.core.exceptions import ForbiddenError

        raise ForbiddenError("Administrator access required")
    result = simulation_service.reset_demo_state(db, user.organization_id)
    from app.routers.target import reset_simulated_cache

    reset_simulated_cache()
    return result


@router.post("/start", response_model=SimulationResponse)
def start_simulation(
    req: StartSimulationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return simulation_service.start_simulation(db, user.organization_id, req.scenario_name)


@router.get("/{sim_id}", response_model=SimulationResponse)
def get_simulation(
    sim_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return simulation_service.get_simulation(db, user.organization_id, sim_id)


@router.get("/{sim_id}/log")
def get_simulation_log(
    sim_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sim = (
        db.query(AttackSimulation)
        .filter(AttackSimulation.id == sim_id, AttackSimulation.organization_id == user.organization_id)
        .first()
    )
    if not sim:
        from app.core.exceptions import NotFoundError

        raise NotFoundError("Simulation not found")
    log = simulation_service.get_simulation_log(sim_id)
    return {
        "id": sim.id,
        "scenario_name": sim.scenario_name,
        "status": sim.status,
        "log": log,
        "progress": 100 if sim.status in {"completed", "failed"} else min(92, max(8, len(log) * 12)),
        "artifacts": simulation_service.get_simulation_artifacts(sim.scenario_name) if sim.status == "completed" else [],
        "response_actions": ["honeytoken_triggered", "adaptive_honeypot_deployed"] if sim.resulting_incident_id else [],
        "resulting_incident_id": sim.resulting_incident_id,
        "data_boundary": {
            "attacker_view": simulation_service.DECOY_DOCUMENT_SCOPE,
            "artifact_classification": simulation_service.DECOY_DOCUMENT_CLASSIFICATION,
            "response_bodies_exposed": False,
            "organization_records_exposed": False,
            "host_execution_performed": False,
            "external_network_targeted": False,
        },
    }
