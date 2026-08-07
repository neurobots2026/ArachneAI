from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.organization import CreateOrganizationRequest, OrganizationResponse
from app.services import organization_service

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.post("", response_model=OrganizationResponse)
def create_organization(req: CreateOrganizationRequest, db: Session = Depends(get_db)):
    return organization_service.create_organization(db, req)


@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(org_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return organization_service.get_organization(db, org_id)
