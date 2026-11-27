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

def test_a_bookmark_keeps_the_search_it_was_saved_under(client, users):
    """The score on a saved card is worked out against the filter that was current when the
    candidate was bookmarked, and the card carries that filter so the number can be read.

    It used to be scored against whatever filter was current at READ time, so editing your
    search silently rewrote the score of every candidate you had already saved — and
    `meets_requirements` flipped with it, making a saved candidate appear to fail a search
    nobody had run on them.
    """
    from app.models import RecruiterFilter
    headers = as_user(users['recruiter'])
    with Session(engine) as s:
        s.add(RecruiterFilter(recruiter_id=users['recruiter']['id'], field_of_study='Computer Science',
                              min_year=1, min_gpa=0, min_internships=0, skills='Python,SQL'))
        s.commit()

    saved = client.post('/api/saved/bookmarks', headers=headers,
                        json={'applicant_id': users['applicant']['id']}).json()
    assert saved['searched'] is True
    assert saved['searched_field_of_study'] == 'Computer Science'
    assert saved['searched_skills'] == ['Python', 'SQL']
    score_when_saved = saved['match_score']

    # Move the search somewhere completely different.
    client.put('/api/filters/me', headers=headers, json={
        'field_of_study': 'Design', 'min_year': 5, 'min_gpa': 4, 'min_internships': 5, 'skills': ['Figma']})

    again = client.get('/api/saved/bookmarks', headers=headers).json()[0]
    assert again['match_score'] == score_when_saved
    assert again['searched_field_of_study'] == 'Computer Science'
    assert again['searched_skills'] == ['Python', 'SQL']


def test_a_bookmark_taken_without_a_search_has_no_score(client, users):
    """Explore has no filter at all, so there is nothing to score against and nothing to show
    beside a score. Better than a 0 that looks like a bad match."""
    headers = as_user(users['recruiter'])
    saved = client.post('/api/saved/bookmarks', headers=headers,
                        json={'applicant_id': users['applicant']['id']}).json()
    assert saved['searched'] is False
    assert saved['match_score'] is None
    assert saved['meets_requirements'] is None
    assert saved['searched_skills'] == []


def test_recruiter_only_access(client, users):
    for path in ['/api/saved/searches', '/api/saved/bookmarks', '/api/saved/current-filter']:
        assert client.get(path).status_code == 401
        assert client.get(path, headers=as_user(users['applicant'])).status_code == 403
    assert client.get('/api/saved/current-filter', headers=as_user(users['recruiter'])).status_code == 404


def test_bookmark_details_reuse_existing_matching_and_video_services(client, users, monkeypatch):
    """A bookmark holds only the pair of ids, so everything shown about the candidate has to
    be read back through the services that own it: matching for the score, storage for the
    pitch link, Responsibility 8 for whether they have been invited."""
    from app.models import ApplicantProfile, Invitation, SavedSearch, Video
    from app.services import storage_service
    from app.services.matching_service import match_score, passes_hard_filters, split_skills
    # Files live in Cloudinary now, so the link is whatever storage_service hands back rather
    # than the "/api/files/..." path this test was written against.
    monkeypatch.setattr(storage_service, 'get_url',
                        lambda key, resource_type='video': f'https://files.test/{key}')
    recruiter, applicant = users['recruiter'], users['applicant']
    headers = as_user(recruiter)
    with Session(engine) as s:
        current = RecruiterFilter(recruiter_id=recruiter['id'], skills='Python,SQL')
        s.add(current)
        s.add(Video(applicant_id=applicant['id'], kind='pitch', duration_seconds=12,
                    file_location='test/pitch.mp4'))
        # The invitation model calls this created_at; the test was written before it existed.
        s.add(Invitation(recruiter_id=recruiter['id'], applicant_id=applicant['id'],
                         message='Demo invitation'))
        s.commit()
        profile = s.exec(select(ApplicantProfile).where(ApplicantProfile.user_id == applicant['id'])).one()
        expected = match_score(profile, current)
        # Worked out from the seeded profile rather than written in: which skills this
        # applicant happens to have is seed data, and the thing being tested is that the
        # bookmark reports the overlap with the recruiter's filter.
        theirs = split_skills(profile.skills)
        overlap = [skill for skill in ['Python', 'SQL'] if skill in theirs]
        passing = sum(passes_hard_filters(p, SavedSearch(**{**BASE, 'skills': ','.join(BASE['skills']),
                                                            'recruiter_id': recruiter['id']}))
                      for p in s.exec(select(ApplicantProfile)).all())
    bookmark = client.post('/api/saved/bookmarks', headers=headers, json={'applicant_id': applicant['id']}).json()
    assert bookmark['match_score'] == expected
    assert bookmark['matched_skills'] == overlap
    assert bookmark['pitch_url'] == 'https://files.test/test/pitch.mp4'
    assert bookmark['invited'] is True
    # The address is Responsibility 8's to release, and only once an invitation is accepted.
    assert 'email' not in bookmark
    # match_count is Responsibility 5's hard filters, not a number this page counts itself.
    saved = client.post('/api/saved/searches', headers=headers, json=BASE).json()
    assert saved['match_count'] == passing
