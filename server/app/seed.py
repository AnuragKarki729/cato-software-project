"""Dummy data so every responsibility can be built and tested from day one."""
from sqlmodel import Session, select

from app.models import ApplicantProfile, User

RECRUITERS = [
    ("Mia Recruiter", "mia@techcorp.test", "TechCorp"),
    ("Sam Recruiter", "sam@designhub.test", "DesignHub"),
]

APPLICANTS = [
    # name, email, university, field of study, year, gpa, skills, internships
    ("Alex Kim", "alex@uni.test", "Mahidol University", "Computer Science", 4, 3.6, "Python,React,SQL", 2),
    ("Bea Santos", "bea@uni.test", "Mahidol University", "Computer Science", 2, 3.1, "JavaScript,React", 0),
    ("Chai Wong", "chai@uni.test", "Chulalongkorn University", "Information Technology", 3, 3.4, "Python,Data Analysis,SQL", 1),
    ("Dana Lee", "dana@uni.test", "Chulalongkorn University", "Design", 5, 3.8, "Figma,Public Speaking", 3),
    ("Eli Park", "eli@uni.test", "Kasetsart University", "Business", 3, 2.9, "Marketing,Project Management", 1),
    ("Fah Narin", "fah@uni.test", "Kasetsart University", "Engineering", 4, 3.3, "Python,Java", 1),
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
