"""Invitations (Responsibility 8)."""
from app.models import User


def build_message(recruiter: User, applicant: User) -> str:
    return (
        f"{recruiter.name} from {recruiter.company_name} is interested in you and is sending "
        f"this invitation to {applicant.email} about a job vacancy."
    )
