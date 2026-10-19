from tests.conftest import as_user


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_dummy_users_are_seeded(client):
    roles = {u["role"] for u in client.get("/api/dev/users").json()}
    assert roles == {"applicant", "recruiter"}


def test_dev_login_and_roles(client, users):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers=as_user(users["applicant"])).json()["role"] == "applicant"
    # An applicant cannot use recruiter-only endpoints.
    assert client.get("/api/matching/results", headers=as_user(users["applicant"])).status_code == 403


def test_options(client):
    options = client.get("/api/options").json()
    assert "Python" in options["skills"]
    assert options["years"] == [1, 2, 3, 4, 5]
