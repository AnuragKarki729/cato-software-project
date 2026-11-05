"""Dummy data so every responsibility can be built and tested from day one."""
from sqlmodel import Session, select

from app.models import ApplicantProfile, User

RECRUITERS = [
    ("Aye Myo Myat", "aye@cato.test", "Cato"),
    ("Siwakorn P.", "siwakorn@cato.test", "Cato"),
]

APPLICANTS = [
    # name, email, university, field of study, year, gpa, skills, internships
    ("Anurag Karki", "anurag@cato.test", "Kasetsart University", "Computer Science", 4, 3.5, "Python,React,SQL", 1),
    ("Nusrat Begam", "nusrat@cato.test", "Mahidol University", "Information Technology", 4, 3.6, "Python,Data Analysis,SQL", 1),
]


def seed_if_empty(session: Session):
    if session.exec(select(User)).first() is not None:
        return

    for name, email, company in RECRUITERS:
        session.add(User(name=name, email=email, role="recruiter", company_name=company))

    for name, email, university, field, year, gpa, skills, internships in APPLICANTS:
        user = User(name=name, email=email, role="applicant")
        session.add(user)
        session.commit()
        session.refresh(user)
        session.add(ApplicantProfile(
            user_id=user.id, university=university, field_of_study=field,
            year=year, gpa=gpa, skills=skills, internships=internships,
        ))

    session.commit()
