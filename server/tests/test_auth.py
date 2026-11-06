"""Responsibility 7 — Aye Myo Myat (6837919)."""
from datetime import timedelta
import pytest
from sqlmodel import Session, select
from app.database import engine
from app.models import ApplicantProfile, AuthSession, User, Video
from app.services.auth_service import token_digest, utcnow, verify_password
from tests.conftest import as_user

def registration(**changes):
    return {'name': 'New Applicant', 'email': 'new@example.com', 'password': 'Strong-pass-123', 'role': 'applicant', **changes}

def test_signup_login_me_and_logout(client):
    body = registration(email=' NEW@Example.com ')
    response = client.post('/api/auth/signup', json=body)
    assert response.status_code == 201
    user = response.json()
    assert user['email'] == 'new@example.com' and user['onboarding_step'] == 'profile'
    assert 'password_hash' not in user and 'password' not in user
    with Session(engine) as s:
        stored = s.get(User, user['id'])
        assert stored.password_hash != body['password']
        assert verify_password(body['password'], stored.password_hash)
    assert client.post('/api/auth/signup', json=body).status_code == 409
    response = client.post('/api/auth/login', json={'email': body['email'], 'password': body['password']})
    assert response.status_code == 200
    token = response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    assert client.get('/api/auth/me', headers=headers).json()['id'] == user['id']
    with Session(engine) as s:
        stored = s.exec(select(AuthSession).where(AuthSession.user_id == user['id'])).one()
        assert stored.token_hash == token_digest(token) and stored.token_hash != token
    assert client.post('/api/auth/logout', headers=headers).status_code == 204
    assert client.get('/api/auth/me', headers=headers).status_code == 401

@pytest.mark.parametrize('changes', [{'role': 'admin'}, {'role': 'recruiter'}, {'role': 'recruiter', 'company_name': '   '}, {'name': '   '}, {'email': 'bad-email'}, {'password': 'short'}, {'password': 'x' * 129}])
def test_invalid_registration(client, changes):
    assert client.post('/api/auth/signup', json=registration(**changes)).status_code == 422

def test_recruiter_registration(client):
    response = client.post('/api/auth/signup', json=registration(role='recruiter', company_name=' New Co '))
    assert response.status_code == 201
    assert response.json()['company_name'] == 'New Co' and response.json()['onboarding_step'] == 'complete'

def test_invalid_passwords_tokens_and_dev_header(client, users):
    for email in [users['recruiter']['email'], 'absent@example.com']:
        r = client.post('/api/auth/login', json={'email': email, 'password': 'incorrect'})
        assert r.status_code == 401 and r.json()['detail'] == 'Incorrect email or password'
    assert client.get('/api/auth/me', headers={'X-User-Id': str(users['recruiter']['id'])}).status_code == 401
    assert client.get('/api/auth/me', headers={'Authorization': 'Bearer forged'}).status_code == 401
    with Session(engine) as s:
        login = s.exec(select(AuthSession).where(AuthSession.token_hash == token_digest(users['recruiter']['token']))).one()
        login.expires_at = utcnow() - timedelta(seconds=1)
        s.add(login); s.commit()
    assert client.get('/api/auth/me', headers=as_user(users['recruiter'])).status_code == 401

def test_seeded_accounts_have_no_default_password(client):
    assert client.post('/api/auth/login', json={'email': 'aye@cato.test', 'password': 'anything'}).status_code == 401

def test_applicant_onboarding_progress(client, users):
    applicant = users['applicant']; headers = as_user(applicant)
    assert client.get('/api/auth/me', headers=headers).json()['onboarding_step'] == 'profile'
    with Session(engine) as s:
        profile = s.exec(select(ApplicantProfile).where(ApplicantProfile.user_id == applicant['id'])).one()
        profile.resume_location = 'resumes/demo.pdf'; s.add(profile); s.commit()
    assert client.get('/api/auth/me', headers=headers).json()['onboarding_step'] == 'video'
    with Session(engine) as s:
        s.add(Video(applicant_id=applicant['id'], kind='pitch', file_location='video/test.mp4', duration_seconds=10)); s.commit()
    assert client.get('/api/auth/me', headers=headers).json()['onboarding_step'] == 'complete'

def test_logout_only_revokes_current_session(client, users):
    user = users['recruiter']
    second = client.post('/api/auth/login', json={'email': user['email'], 'password': 'Test-password-123'}).json()
    assert client.post('/api/auth/logout', headers=as_user(user)).status_code == 204
    assert client.get('/api/auth/me', headers={'Authorization': f"Bearer {second['access_token']}"}).status_code == 200
