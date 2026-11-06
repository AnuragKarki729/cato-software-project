from sqlmodel import Session, select

from app.database import engine
from app.models import User
from app.services.auth_service import hash_password

# Local demo password for every seeded account.
DEMO_PASSWORD = "password1"

RECRUITERS = [
    # name, email, company
    ("Aye Myo Myat", "aye@cato.test", "Cato"),
    ("Siwakorn P.", "siwakorn@cato.test", "Cato"),
]

APPLICANTS = [
    # name, email
    ("Anurag Karki", "anurag@cato.test"),
    ("Nusrat Begam", "nusrat@cato.test"),
]


def seed_if_empty():
    """Add the dummy users the first time the database is empty."""
    with Session(engine) as session:
        if session.exec(select(User)).first() is not None:
            return

        for name, email, company in RECRUITERS:
            session.add(User(name=name, email=email, role="recruiter", company_name=company,
                             password_hash=hash_password(DEMO_PASSWORD)))

        for name, email in APPLICANTS:
            session.add(User(name=name, email=email, role="applicant",
                             password_hash=hash_password(DEMO_PASSWORD)))

        session.commit()