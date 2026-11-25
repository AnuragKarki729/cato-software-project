import os

from sqlmodel import Session, select

from app.database import engine
from app.models import ApplicantProfile, RecruiterFilter, User
from app.services.auth_service import hash_password

# Local demo password for every seeded account.
DEMO_PASSWORD = "password1"

RECRUITERS = [
    # name, email, company
    ("Aye Myo Myat", "aye@cato.test", "Cato"),
    ("Siwakorn P.", "siwakorn@cato.test", "Cato"),
    ("Sarah Chen", "amazon@cato.test", "Amazon"),
    ("James Park", "google@cato.test", "Google"),
    ("Lisa Wang", "nvidia@cato.test", "NVIDIA"),
    ("Somchai Prasert", "scb@cato.test", "SCB"),
    ("Pimchanok Lert", "agoda@cato.test", "Agoda"),
    ("Tanawat Siri", "line@cato.test", "Line Company"),
    ("Natthapong Krit", "true@cato.test", "True Digital"),
    ("Warunee Chai", "grab@cato.test", "Grab"),
    ("Priya Sharma", "microsoft@cato.test", "Microsoft"),
    ("Kanya Thong", "dtac@cato.test", "dtac"),
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


# Responsibilities 2 and 5 — Nusrat Begam (6638009)
# Demo applicants with complete profiles, so ranked results have candidates to rank.
# (name, email, university, field of study, year, GPA, internships, skills)
DEMO_PROFILES = [
    ("Lin Htet", "lin@cato.test", "Mahidol University", "Computer Science", 3, 3.85, 3, "Python,SQL,Docker,Java,Git"),
    ("Kittipat Somsak", "kittipat@cato.test", "Chulalongkorn University", "Computer Science", 4, 3.20, 1, "Python,SQL,React,Docker,AWS"),
    ("Ploy Charoen", "ploy@cato.test", "Thammasat University", "Computer Science", 3, 3.74, 2, "Python,React,Figma,Excel,Tableau"),
    ("Ravi Kumar", "ravi@cato.test", "Mahidol University", "Computer Science", 4, 3.10, 1, "SQL,Docker,Linux,C++"),
    ("Mei Chen", "mei@cato.test", "Kasetsart University", "Computer Science", 5, 3.55, 2, "Python,SQL,React,Docker,Node.js,Git"),
    ("Thanakorn Wong", "thanakorn@cato.test", "King Mongkut's University of Technology Thonburi", "Engineering", 4, 3.40, 2, "Python,C++,Linux,Git"),
    ("Sara Ahmed", "sara@cato.test", "Assumption University", "Business", 3, 3.65, 1, "Excel,Tableau,SQL"),
    ("Arif Rahman", "arif@cato.test", "Chiang Mai University", "Computer Science", 2, 3.90, 0, "Python,JavaScript,React"),
    # The eleventh applicant: the feed pages ten at a time, so one page of demo data would
    # never show the paging working. Deliberately outside the Computer Science searches the
    # other tests make, so adding them changes no existing count.
    ("Nicha Pongtham", "nicha@cato.test", "Assumption University", "Design", 1, 2.40, 0, "Figma,Excel"),
]

# Anurag's seeded account gets a profile without a resume, so onboarding still asks for one.
SEEDED_APPLICANT_PROFILES = {
    "anurag@cato.test": ("Mahidol University", "Computer Science", 4, 3.30, 1, "Python,React,Node.js,Git"),
}

# A current search for Siwakorn's recruiter account, so ranked results can be demoed before
# the filter page (Responsibility 4) is built. Same filters as the Figma results screen.
DEMO_FILTERS = {
    "siwakorn@cato.test": dict(field_of_study="Computer Science", min_year=3, min_gpa=3.0, min_internships=1,
                               skills="Python,SQL,React,Docker"),
}


def seed_vocabulary():
    """Put the original fixed lists in as the starting vocabulary. Safe on every start."""
    from app.services import options_service, vocabulary_service

    with Session(engine) as session:
        vocabulary_service.seed(session, vocabulary_service.UNIVERSITY, options_service.UNIVERSITIES)
        vocabulary_service.seed(session, vocabulary_service.FIELD_OF_STUDY, options_service.FIELDS_OF_STUDY)
        vocabulary_service.seed(session, vocabulary_service.SKILL, options_service.SKILLS)


def seed_demo_profiles():
    """Add the demo profiles and filter if they are missing. Safe to run on every start."""
    if os.getenv("SEED_DUMMY_DATA", "true").lower() == "false":
        return
    with Session(engine) as session:
        def profile_for(user, university, field, year, gpa, internships, skills):
            if session.exec(select(ApplicantProfile).where(ApplicantProfile.user_id == user.id)).first() is None:
                session.add(ApplicantProfile(user_id=user.id, university=university, field_of_study=field, year=year,
                                             gpa=gpa, internships=internships, skills=skills))

        for name, email, *profile in DEMO_PROFILES:
            user = session.exec(select(User).where(User.email == email)).first()
            if user is None:
                user = User(name=name, email=email, role="applicant", password_hash=hash_password(DEMO_PASSWORD))
                session.add(user)
                session.flush()
            profile_for(user, *profile)

        for email, profile in SEEDED_APPLICANT_PROFILES.items():
            user = session.exec(select(User).where(User.email == email)).first()
            if user is not None:
                profile_for(user, *profile)

        for email, fields in DEMO_FILTERS.items():
            user = session.exec(select(User).where(User.email == email)).first()
            if user is not None and session.exec(
                    select(RecruiterFilter).where(RecruiterFilter.recruiter_id == user.id)).first() is None:
                session.add(RecruiterFilter(recruiter_id=user.id, **fields))

        session.commit()
