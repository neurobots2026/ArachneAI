from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.attack import AttackSimulation

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.attack import SimulationResponse, StartSimulationRequest
from app.services import simulation_service

router = APIRouter(prefix="/simulation", tags=["simulation"])


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
    return {
        "id": sim.id,
        "scenario_name": sim.scenario_name,
        "status": sim.status,
        "log": simulation_service.get_simulation_log(sim_id),
    }
