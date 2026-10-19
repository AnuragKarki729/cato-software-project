import os
import tempfile

# Use a throwaway database and storage folder for every test run.
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["STORAGE_DIR"] = f"{_tmp}/uploads"
os.environ["SEED_DUMMY_DATA"] = "true"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def users(client):
    """Seeded dummy users, split by role."""
    all_users = client.get("/api/dev/users").json()
    return {
        "recruiter": next(u for u in all_users if u["role"] == "recruiter"),
        "applicant": next(u for u in all_users if u["role"] == "applicant"),
    }


def as_user(user: dict) -> dict:
    """Headers for the temporary development login."""
    return {"X-User-Id": str(user["id"])}
