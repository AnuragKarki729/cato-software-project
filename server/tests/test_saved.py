"""Responsibility 6 — Aye Myo Myat (6837919)."""
import pytest
from sqlmodel import Session, select
from app.database import engine
from app.models import RecruiterFilter
from tests.conftest import as_user
BASE = {'name': 'Python graduates', 'field_of_study': 'Computer Science', 'min_year': 4, 'min_gpa': 3, 'min_internships': 1, 'skills': ['Python', 'SQL']}

def test_saved_search_round_trip_and_run(client, users):
    headers = as_user(users['recruiter'])
    assert client.get('/api/saved/searches', headers=headers).json() == []
    response = client.post('/api/saved/searches', headers=headers, json=BASE)
    assert response.status_code == 201
    item = response.json()
    assert item['skills'] == BASE['skills']
    assert client.get('/api/saved/searches', headers=headers).json() == [item]
    for _ in range(2):
        r = client.post(f"/api/saved/searches/{item['id']}/run", headers=headers)
        assert r.status_code == 200 and r.json()['min_gpa'] == 3
        assert client.get('/api/saved/current-filter', headers=headers).json() == r.json()
    with Session(engine) as s:
        current = s.exec(select(RecruiterFilter).where(RecruiterFilter.recruiter_id == users['recruiter']['id'])).one()
        assert current.skills == 'Python,SQL' and current.min_year == 4
    assert client.delete(f"/api/saved/searches/{item['id']}", headers=headers).status_code == 204
    assert client.get('/api/saved/searches', headers=headers).json() == []

def test_saved_items_are_private(client, users):
    first, second = as_user(users['recruiter']), as_user(users['other_recruiter'])
    item = client.post('/api/saved/searches', headers=first, json=BASE).json()
    assert client.get('/api/saved/searches', headers=second).json() == []
    for method, suffix in [('delete', ''), ('post', '/run')]:
        assert getattr(client, method)(f"/api/saved/searches/{item['id']}{suffix}", headers=second).status_code == 404
    bookmark = client.post('/api/saved/bookmarks', headers=first, json={'applicant_id': users['applicant']['id']}).json()
    assert client.get('/api/saved/bookmarks', headers=second).json() == []
    assert client.delete(f"/api/saved/bookmarks/{bookmark['id']}", headers=second).status_code == 404

@pytest.mark.parametrize('changes', [{'min_year': 0}, {'min_year': 6}, {'min_gpa': 4.1}, {'min_internships': -1}, {'field_of_study': 'unknown'}, {'skills': ['unknown']}, {'name': '  '}])
def test_validate_saved_filters(client, users, changes):
    assert client.post('/api/saved/searches', headers=as_user(users['recruiter']), json={**BASE, **changes}).status_code == 422

def test_bookmarks_validate_target_and_deduplicate(client, users):
    headers = as_user(users['recruiter']); body = {'applicant_id': users['applicant']['id']}
    first = client.post('/api/saved/bookmarks', headers=headers, json=body)
    assert first.status_code == 201 and first.json()['name'] == users['applicant']['name']
    assert client.post('/api/saved/bookmarks', headers=headers, json=body).json()['id'] == first.json()['id']
    assert len(client.get('/api/saved/bookmarks', headers=headers).json()) == 1
    for target in [users['recruiter']['id'], 999999]:
        assert client.post('/api/saved/bookmarks', headers=headers, json={'applicant_id': target}).status_code == 404
    assert client.delete(f"/api/saved/bookmarks/{first.json()['id']}", headers=headers).status_code == 204
    assert client.get('/api/saved/bookmarks', headers=headers).json() == []
    assert client.delete('/api/saved/bookmarks/999999', headers=headers).status_code == 404

def test_recruiter_only_access(client, users):
    for path in ['/api/saved/searches', '/api/saved/bookmarks', '/api/saved/current-filter']:
        assert client.get(path).status_code == 401
        assert client.get(path, headers=as_user(users['applicant'])).status_code == 403
    assert client.get('/api/saved/current-filter', headers=as_user(users['recruiter'])).status_code == 404
