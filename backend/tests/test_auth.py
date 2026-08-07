import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.models.organization import Organization
from app.services import auth_service


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    org = Organization(name="Test", industry="Tech", employee_count=5)
    session.add(org)
    session.commit()
    yield session, org
    session.close()


def test_auth_roundtrip(db):
    session, org = db
    user = auth_service.register_user(session, "a@b.com", "secret", org.id)
    assert user.email == "a@b.com"
    token = auth_service.authenticate_user(session, "a@b.com", "secret")
    assert token.access_token
