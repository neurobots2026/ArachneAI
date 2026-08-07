import sys
from pathlib import Path

from sqlalchemy.orm import Session

DECEPTION_ROOT = Path(__file__).resolve().parents[3] / "deception-engine"
if str(DECEPTION_ROOT) not in sys.path:
    sys.path.insert(0, str(DECEPTION_ROOT))

from deployment.target_app_deployer import deploy_honeytoken  # noqa: E402
from generators import generate_honeytoken_content  # noqa: E402

from app.core.exceptions import NotFoundError
from app.models.honeytoken import Honeytoken
from app.schemas.honeytoken import CreateHoneytokenRequest, HoneytokenResponse
from app.services.organization_service import get_organization_model


def create_honeytoken(
    db: Session, org_id: str, data: CreateHoneytokenRequest
) -> HoneytokenResponse:
    org = get_organization_model(db, org_id)
    token = Honeytoken(
        organization_id=org_id,
        type=data.type,
        name=data.name,
        department=data.department,
        placement_path=data.placement_path or f"/internal/{data.type}/{data.name}",
        created_by_ai_reasoning=data.created_by_ai_reasoning,
        fake_value="",
    )
    db.add(token)
    db.flush()

    content, _ = generate_honeytoken_content(
        data.type, data.name, org.name, data.department, token.id
    )
    if isinstance(content, bytes):
        token.fake_value = content.hex()
    else:
        token.fake_value = content

    db.commit()
    db.refresh(token)
    deploy_honeytoken(token)
    return _to_response(token, include_value=True)


def list_honeytokens(db: Session, org_id: str) -> list[HoneytokenResponse]:
    tokens = db.query(Honeytoken).filter(Honeytoken.organization_id == org_id).all()
    return [_to_response(t, include_value=False) for t in tokens]


def get_honeytoken(db: Session, org_id: str, token_id: str) -> HoneytokenResponse:
    token = (
        db.query(Honeytoken)
        .filter(Honeytoken.id == token_id, Honeytoken.organization_id == org_id)
        .first()
    )
    if not token:
        raise NotFoundError("Honeytoken not found")
    return _to_response(token, include_value=True)


def delete_honeytoken(db: Session, org_id: str, token_id: str) -> None:
    token = (
        db.query(Honeytoken)
        .filter(Honeytoken.id == token_id, Honeytoken.organization_id == org_id)
        .first()
    )
    if not token:
        raise NotFoundError("Honeytoken not found")
    db.delete(token)
    db.commit()


def _to_response(token: Honeytoken, include_value: bool) -> HoneytokenResponse:
    data = HoneytokenResponse.model_validate(token)
    if not include_value:
        data.fake_value = None
    return data
