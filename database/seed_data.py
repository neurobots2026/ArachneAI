"""Seed demo organization, admin user, and sample honeytokens."""

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND = REPO_ROOT / "backend"
for p in (str(BACKEND), str(REPO_ROOT / "deception-engine")):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.core.auth import hash_password  # noqa: E402
from app.database.session import SessionLocal, init_db  # noqa: E402
from app.models.honeytoken import Honeytoken  # noqa: E402
from app.models.organization import Organization  # noqa: E402
from app.models.user import User  # noqa: E402
from deployment.target_app_deployer import deploy_honeytoken  # noqa: E402


def seed():
    init_db()
    db = SessionLocal()
    try:
        if db.query(Organization).filter(Organization.name == "Acme Bank").first():
            print("Seed data already exists.")
            return

        org = Organization(
            name="Acme Bank",
            industry="Banking",
            employee_count=500,
            cloud_provider="AWS",
            departments=["Engineering", "HR", "Finance"],
        )
        db.add(org)
        db.flush()

        user = User(
            organization_id=org.id,
            email="admin@acme.bank",
            hashed_password=hash_password("admin123"),
            role="admin",
        )
        db.add(user)

        tokens = [
            Honeytoken(
                organization_id=org.id,
                type="credential",
                name="AWS Admin Key",
                fake_value="AKIAHONEYTOKEN12345678",
                department="Engineering",
                placement_path="/internal/.env",
                created_by_ai_reasoning="Engineering teams store cloud credentials in env files.",
            ),
            Honeytoken(
                organization_id=org.id,
                type="document",
                name="Q4 Payroll",
                fake_value="payroll_marker_acme_q4",
                department="HR",
                placement_path="/docs/payroll/Q4.xlsx",
                created_by_ai_reasoning="Banking orgs are targeted for payroll data.",
            ),
        ]
        db.add_all(tokens)
        db.commit()
        for token in tokens:
            db.refresh(token)
            deploy_honeytoken(token)
        print(f"Seeded org={org.id}, user=admin@acme.bank / admin123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
