from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.honeytoken import DeceptionStrategy, GenerateFromStrategyRequest, HoneytokenResponse
from app.services import deception_service

router = APIRouter(prefix="/deception", tags=["deception"])


@router.post("/analyze", response_model=DeceptionStrategy)
def analyze(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return deception_service.analyze_organization(db, user.organization_id)


@router.post("/generate", response_model=list[HoneytokenResponse])
def generate(
    req: GenerateFromStrategyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return deception_service.generate_from_strategy(db, user.organization_id, req)
