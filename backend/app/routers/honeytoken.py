from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.honeytoken import CreateHoneytokenRequest, HoneytokenResponse
from app.services import honeytoken_service

router = APIRouter(prefix="/honeytokens", tags=["honeytokens"])


@router.post("", response_model=HoneytokenResponse)
def create_honeytoken(
    req: CreateHoneytokenRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return honeytoken_service.create_honeytoken(db, user.organization_id, req)


@router.get("", response_model=list[HoneytokenResponse])
def list_honeytokens(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return honeytoken_service.list_honeytokens(db, user.organization_id)


@router.get("/{token_id}", response_model=HoneytokenResponse)
def get_honeytoken(
    token_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return honeytoken_service.get_honeytoken(db, user.organization_id, token_id)


@router.delete("/{token_id}")
def delete_honeytoken(
    token_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    honeytoken_service.delete_honeytoken(db, user.organization_id, token_id)
    return {"status": "deleted"}
