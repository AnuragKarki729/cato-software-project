"""Settings -> Delete account (DELETE /api/auth/me), for applicants and recruiters."""
from sqlmodel import Session, select

from app.database import engine
from app.models import (ApplicantProfile, AuthSession, Bookmark, Invitation, RecruiterFilter,
                        SavedSearch, User, Video)
from tests.conftest import as_user

PASSWORD = 'Test-password-123'


def count(model, *conditions):
    with Session(engine) as s:
        return len(s.exec(select(model).where(*conditions)).all())


def test_the_wrong_password_deletes_nothing(client, users):
    applicant = users['applicant']
    r = client.request('DELETE', '/api/auth/me', json={'password': 'not-it'}, headers=as_user(applicant))
    assert r.status_code == 403
    assert count(User, User.id == applicant['id']) == 1


def test_an_applicant_takes_everything_of_theirs_with_them(client, users, monkeypatch):
    from app.services import storage_service
    removed = []
    monkeypatch.setattr(storage_service, 'delete', lambda key, kind='video': removed.append((key, kind)))
    monkeypatch.setattr(storage_service, 'get_url', lambda key, resource_type='video': f'https://files.test/{key}')
    applicant, recruiter = users['applicant'], users['recruiter']
    with Session(engine) as s:
        s.add(Video(applicant_id=applicant['id'], kind='pitch', duration_seconds=12, file_location='x/pitch.mp4'))
        profile = s.exec(select(ApplicantProfile).where(ApplicantProfile.user_id == applicant['id'])).one()
        profile.resume_location = 'x/resume.pdf'
        s.add(profile); s.commit()
    client.post('/api/invitations', json={'applicant_id': applicant['id']}, headers=as_user(recruiter))
    client.post('/api/saved/bookmarks', json={'applicant_id': applicant['id']}, headers=as_user(recruiter))

    r = client.request('DELETE', '/api/auth/me', json={'password': PASSWORD}, headers=as_user(applicant))
    assert r.status_code == 204
    uid = applicant['id']
    assert count(User, User.id == uid) == 0
    assert count(ApplicantProfile, ApplicantProfile.user_id == uid) == 0
    assert count(Video, Video.applicant_id == uid) == 0
    assert count(Invitation, Invitation.applicant_id == uid) == 0
    assert count(Bookmark, Bookmark.applicant_id == uid) == 0
    assert count(AuthSession, AuthSession.user_id == uid) == 0
    assert ('x/pitch.mp4', 'video') in removed and ('x/resume.pdf', 'raw') in removed
    # Gone for good: the old token no longer works, and neither does the password.
    assert client.get('/api/auth/me', headers=as_user(applicant)).status_code == 401
    assert client.post('/api/auth/login', json={'email': applicant['email'], 'password': PASSWORD}).status_code == 401
    # The recruiter is unaffected.
    assert client.get('/api/saved/bookmarks', headers=as_user(recruiter)).status_code == 200


def test_a_recruiter_takes_their_searches_and_invitations_with_them(client, users):
    recruiter, applicant = users['recruiter'], users['applicant']
    headers = as_user(recruiter)
    client.put('/api/filters/me', headers=headers, json={'field_of_study': 'Computer Science', 'skills': ['Python']})
    client.post('/api/saved/searches', headers=headers, json={'name': 'Mine', 'skills': ['Python']})
    client.post('/api/saved/bookmarks', headers=headers, json={'applicant_id': applicant['id']})
    client.post('/api/invitations', headers=headers, json={'applicant_id': applicant['id']})

    assert client.request('DELETE', '/api/auth/me', json={'password': PASSWORD}, headers=headers).status_code == 204
    rid = recruiter['id']
    for model, column in [(RecruiterFilter, RecruiterFilter.recruiter_id), (SavedSearch, SavedSearch.recruiter_id),
                          (Bookmark, Bookmark.recruiter_id), (Invitation, Invitation.recruiter_id)]:
        assert count(model, column == rid) == 0, model.__name__
    assert count(User, User.id == rid) == 0
    # The applicant they had invited is still there, with an empty inbox.
    assert client.get('/api/invitations/received', headers=as_user(applicant)).json() == []
