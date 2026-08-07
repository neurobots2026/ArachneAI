import sys
from pathlib import Path

from sqlalchemy.orm import Session

AI_ROOT = Path(__file__).resolve().parents[3] / "ai-engine"
DECEPTION_ROOT = Path(__file__).resolve().parents[3] / "deception-engine"
for p in (AI_ROOT, DECEPTION_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from client import call_gemini  # noqa: E402
from strategies.adaptive_strategy import weight_honeytoken_types  # noqa: E402

from app.models.organization import Organization
from app.schemas.honeytoken import DeceptionStrategy, GenerateFromStrategyRequest, HoneytokenResponse
from app.services.honeytoken_service import create_honeytoken
from app.services.organization_service import get_organization_model
from app.schemas.honeytoken import CreateHoneytokenRequest


def analyze_organization(db: Session, org_id: str) -> DeceptionStrategy:
    org = get_organization_model(db, org_id)
    weights = weight_honeytoken_types(org)
    prompt = (
        f"Design honeytoken deception strategy for org: name={org.name}, "
        f"industry={org.industry}, departments={org.departments}, "
        f"cloud={org.cloud_provider}, weights={weights}. "
        "Return recommended honeytoken placements."
    )
    strategy = call_gemini(prompt, DeceptionStrategy)
    org.deception_strategy = strategy.model_dump()
    db.commit()
    return strategy


def generate_from_strategy(
    db: Session, org_id: str, req: GenerateFromStrategyRequest
) -> list[HoneytokenResponse]:
    created = []
    for item in req.strategy.honeytokens:
        token = create_honeytoken(
            db,
            org_id,
            CreateHoneytokenRequest(
                type=item.type,
                name=item.name,
                department=item.department,
                placement_path=item.placement_path,
                created_by_ai_reasoning=item.reasoning,
            ),
        )
        created.append(token)
    return created
