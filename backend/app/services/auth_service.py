from sqlalchemy.orm import Session

from app.core.auth import create_access_token, hash_password, verify_password
from app.core.exceptions import UnauthorizedError
from app.models.user import User
from app.schemas.user import TokenResponse, UserResponse


def register_user(db: Session, email: str, password: str, org_id: str) -> UserResponse:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise UnauthorizedError("Email already registered")
    user = User(
        email=email,
        hashed_password=hash_password(password),
        organization_id=org_id,
        role="analyst",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


def authenticate_user(db: Session, email: str, password: str) -> TokenResponse:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise UnauthorizedError("Invalid credentials")
    token = create_access_token({"sub": user.id, "org_id": user.organization_id})
    return TokenResponse(access_token=token)
