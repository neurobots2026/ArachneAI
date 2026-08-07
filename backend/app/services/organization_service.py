from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.organization import Organization
from app.schemas.organization import CreateOrganizationRequest, OrganizationResponse


def create_organization(db: Session, data: CreateOrganizationRequest) -> OrganizationResponse:
    org = Organization(**data.model_dump())
    db.add(org)
    db.commit()
    db.refresh(org)
    return OrganizationResponse.model_validate(org)


def get_organization(db: Session, org_id: str) -> OrganizationResponse:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise NotFoundError("Organization not found")
    return OrganizationResponse.model_validate(org)


def get_organization_model(db: Session, org_id: str) -> Organization:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise NotFoundError("Organization not found")
    return org
