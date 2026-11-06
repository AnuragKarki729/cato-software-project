import os
import tempfile
_tmp = tempfile.mkdtemp()
os.environ['DATABASE_URL'] = f'sqlite:///{_tmp}/test.db'
os.environ['STORAGE_DIR'] = f'{_tmp}/uploads'
os.environ['SEED_DUMMY_DATA'] = 'true'
os.environ['CLOUDINARY_URL'] = ''

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, select
from app.database import engine
from app.main import app
from app.models import User
from app.services.auth_service import hash_password

@pytest.fixture
def client():
    SQLModel.metadata.drop_all(engine)
    with TestClient(app) as c:
        yield c

@pytest.fixture
def users(client):
    with Session(engine) as session:
        seeded = session.exec(select(User).order_by(User.id)).all()
        encoded = hash_password('Test-password-123')
        for user in seeded:
            user.password_hash = encoded
            session.add(user)
        session.commit()
        accounts = [dict(id=u.id, email=u.email, role=u.role, name=u.name) for u in seeded]
    for user in accounts:
        user['token'] = client.post('/api/auth/login', json={
            'email': user['email'], 'password': 'Test-password-123'}).json()['access_token']
    recruiters = [u for u in accounts if u['role'] == 'recruiter']
    return {'recruiter': recruiters[0], 'other_recruiter': recruiters[1],
            'applicant': next(u for u in accounts if u['role'] == 'applicant')}

def as_user(user):
    return {'Authorization': f"Bearer {user['token']}"}
