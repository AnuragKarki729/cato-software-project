# Responsibility 8: Invitations
# Owner: Siwakorn P. (6600139)
from tests.conftest import as_user


def test_send_invitation(client, users):
    h = as_user(users['recruiter'])
    applicant_id = users['applicant']['id']
    r = client.post('/api/invitations', json={'applicant_id': applicant_id}, headers=h)
    assert r.status_code == 201
    data = r.json()
    assert data['status'] == 'pending'
    assert data['company']
    assert data['id']


def test_cannot_invite_twice(client, users):
    h = as_user(users['recruiter'])
    applicant_id = users['applicant']['id']
    client.post('/api/invitations', json={'applicant_id': applicant_id}, headers=h)
    r = client.post('/api/invitations', json={'applicant_id': applicant_id}, headers=h)
    assert r.status_code == 409


def test_sent_invitations(client, users):
    h = as_user(users['recruiter'])
    applicant_id = users['applicant']['id']
    client.post('/api/invitations', json={'applicant_id': applicant_id}, headers=h)
    r = client.get('/api/invitations/sent', headers=h)
    assert r.status_code == 200
    assert len(r.json()) >= 1
    assert r.json()[0]['applicant_id'] == applicant_id
    assert r.json()[0]['email'] is None  # not accepted yet


def test_received_invitations(client, users):
    h_rec = as_user(users['recruiter'])
    h_app = as_user(users['applicant'])
    applicant_id = users['applicant']['id']
    client.post('/api/invitations', json={'applicant_id': applicant_id}, headers=h_rec)
    r = client.get('/api/invitations/received', headers=h_app)
    assert r.status_code == 200
    assert len(r.json()) >= 1
    assert r.json()[0]['status'] == 'pending'


def test_accept_invitation(client, users):
    h_rec = as_user(users['recruiter'])
    h_app = as_user(users['applicant'])
    applicant_id = users['applicant']['id']
    inv = client.post('/api/invitations', json={'applicant_id': applicant_id}, headers=h_rec).json()
    r = client.post(f'/api/invitations/{inv["id"]}/accept', headers=h_app)
    assert r.status_code == 200
    assert r.json()['status'] == 'accepted'
    # Recruiter now sees the email
    sent = client.get('/api/invitations/sent', headers=h_rec).json()
    accepted = [s for s in sent if s['applicant_id'] == applicant_id]
    assert accepted[0]['email'] == users['applicant']['email']


def test_decline_invitation(client, users):
    h_rec = as_user(users['recruiter'])
    h_app = as_user(users['applicant'])
    applicant_id = users['applicant']['id']
    inv = client.post('/api/invitations', json={'applicant_id': applicant_id}, headers=h_rec).json()
    r = client.post(f'/api/invitations/{inv["id"]}/decline', headers=h_app, json={'reason': 'Not interested'})
    assert r.status_code == 200
    assert r.json()['status'] == 'declined'


def test_cannot_answer_twice(client, users):
    h_rec = as_user(users['recruiter'])
    h_app = as_user(users['applicant'])
    applicant_id = users['applicant']['id']
    inv = client.post('/api/invitations', json={'applicant_id': applicant_id}, headers=h_rec).json()
    client.post(f'/api/invitations/{inv["id"]}/accept', headers=h_app)
    r = client.post(f'/api/invitations/{inv["id"]}/decline', headers=h_app)
    assert r.status_code == 409


def test_applicant_cannot_send(client, users):
    h = as_user(users['applicant'])
    r = client.post('/api/invitations', json={'applicant_id': users['applicant']['id']}, headers=h)
    assert r.status_code == 403


def test_recruiter_cannot_receive(client, users):
    h = as_user(users['recruiter'])
    r = client.get('/api/invitations/received', headers=h)
    assert r.status_code == 403


# ---------- asking again after a no ----------
# The recruiter's card reads "Invitation declined · Invite again?", so a declined invitation
# has to be re-sendable. It reuses the same row rather than stacking up, so the applicant sees
# one invitation per company instead of a list of repeats.

def test_a_declined_invitation_can_be_sent_again(client, users):
    h_rec = as_user(users['recruiter'])
    h_app = as_user(users['applicant'])
    applicant_id = users['applicant']['id']
    first = client.post('/api/invitations', json={'applicant_id': applicant_id}, headers=h_rec).json()
    client.post(f'/api/invitations/{first["id"]}/decline', headers=h_app)

    again = client.post('/api/invitations', json={'applicant_id': applicant_id}, headers=h_rec)
    assert again.status_code == 201
    assert again.json()['status'] == 'pending'
    assert again.json()['id'] == first['id']  # the same row, not a second invitation

    received = client.get('/api/invitations/received', headers=h_app).json()
    assert len([i for i in received if i['id'] == first['id']]) == 1
    assert received[0]['status'] == 'pending'


def test_asking_again_clears_the_decline_reason(client, users):
    h_rec = as_user(users['recruiter'])
    h_app = as_user(users['applicant'])
    applicant_id = users['applicant']['id']
    inv = client.post('/api/invitations', json={'applicant_id': applicant_id}, headers=h_rec).json()
    client.post(f'/api/invitations/{inv["id"]}/decline', headers=h_app, json={'reason': 'Not interested'})
    client.post('/api/invitations', json={'applicant_id': applicant_id}, headers=h_rec)
    # Pending again, so the applicant may answer it a second time.
    assert client.post(f'/api/invitations/{inv["id"]}/accept', headers=h_app).status_code == 200


def test_an_accepted_invitation_cannot_be_sent_again(client, users):
    h_rec = as_user(users['recruiter'])
    h_app = as_user(users['applicant'])
    applicant_id = users['applicant']['id']
    inv = client.post('/api/invitations', json={'applicant_id': applicant_id}, headers=h_rec).json()
    client.post(f'/api/invitations/{inv["id"]}/accept', headers=h_app)
    assert client.post('/api/invitations', json={'applicant_id': applicant_id},
                       headers=h_rec).status_code == 409


def test_the_email_is_released_only_once_accepted(client, users):
    """What the recruiter's card is for: the applicant's address appears when, and only when,
    they have said yes."""
    h_rec = as_user(users['recruiter'])
    h_app = as_user(users['applicant'])
    applicant_id = users['applicant']['id']
    inv = client.post('/api/invitations', json={'applicant_id': applicant_id}, headers=h_rec).json()

    pending = client.get('/api/invitations/sent', headers=h_rec).json()[0]
    assert pending['status'] == 'pending' and pending['email'] is None

    client.post(f'/api/invitations/{inv["id"]}/accept', headers=h_app)
    accepted = client.get('/api/invitations/sent', headers=h_rec).json()[0]
    assert accepted['status'] == 'accepted'
    assert accepted['email'] == users['applicant']['email']


def test_a_declined_invitation_never_releases_the_email(client, users):
    h_rec = as_user(users['recruiter'])
    h_app = as_user(users['applicant'])
    applicant_id = users['applicant']['id']
    inv = client.post('/api/invitations', json={'applicant_id': applicant_id}, headers=h_rec).json()
    client.post(f'/api/invitations/{inv["id"]}/decline', headers=h_app)
    sent = client.get('/api/invitations/sent', headers=h_rec).json()[0]
    assert sent['status'] == 'declined'
    assert sent['email'] is None
