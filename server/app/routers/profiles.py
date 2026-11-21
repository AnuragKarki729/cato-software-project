# Responsibility 2: Applicant profile and resume
# Owner: Nusrat Begam (6638009)
"""Applicant profile and resume.

GET    /api/profiles/me          the applicant's own profile (404 until something is saved)
PUT    /api/profiles/me          save the full profile (every field required)
PUT    /api/profiles/me/draft    "Save draft": save whatever is filled in so far
POST   /api/profiles/me/resume   upload the resume (PDF only, up to 5 MB)
DELETE /api/profiles/me/resume   remove the resume
GET    /api/profiles/{id}        read-only profile (recruiters, the video feed, "Preview as recruiter")
"""
import re

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import Session, select

from app.database import get_session
from app.models import ApplicantProfile, User
from app.models.applicant_profile import utcnow
from app.schemas.profile import ProfileDraftIn, ProfileIn, ProfileOut
from app.services import storage_service
from app.services.auth_service import get_current_applicant, get_current_user
from app.services.matching_service import split_skills

router = APIRouter(prefix="/profiles", tags=["profiles"])

MAX_RESUME_BYTES = 5 * 1024 * 1024  # 5 MB
RESUME_TYPE = "raw"  # Cloudinary resource type for PDFs


def profile_out(profile: ApplicantProfile, user: User) -> ProfileOut:
    return ProfileOut(
        user_id=user.id,
        name=user.name,
        university=profile.university,
        field_of_study=profile.field_of_study,
        year=profile.year,
        gpa=profile.gpa,
        skills=split_skills(profile.skills),
        internships=profile.internships,
        resume_url=storage_service.get_url(profile.resume_location, RESUME_TYPE) if profile.resume_location else None,
        resume_name=profile.resume_name,
        resume_size=profile.resume_size,
        resume_uploaded_at=profile.resume_uploaded_at,
        details_complete=profile.details_complete,
        onboarding_complete=profile.onboarding_complete,
        updated_at=profile.updated_at,
    )


def find_profile(session: Session, user_id: int) -> ApplicantProfile | None:
    return session.exec(select(ApplicantProfile).where(ApplicantProfile.user_id == user_id)).first()


def get_or_create_profile(session: Session, user_id: int) -> ApplicantProfile:
    # Lock the user row so two quick saves cannot both create a profile (MySQL).
    session.exec(select(User).where(User.id == user_id).with_for_update()).one()
    return find_profile(session, user_id) or ApplicantProfile(user_id=user_id)


def apply_fields(profile: ApplicantProfile, body: ProfileDraftIn) -> None:
    profile.university = body.university
    profile.field_of_study = body.field_of_study
    profile.year = body.year
    profile.gpa = body.gpa
    profile.skills = ",".join(body.skills)
    profile.internships = body.internships
    profile.updated_at = utcnow()


def clean_filename(name: str | None) -> str:
    name = (name or "").rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    name = re.sub(r"[^\w.\- ]+", "_", name).strip() or "resume.pdf"
    if not name.lower().endswith(".pdf"):
        name += ".pdf"
    return name[-120:]


@router.get("/me", response_model=ProfileOut)
def get_my_profile(user: User = Depends(get_current_applicant), session: Session = Depends(get_session)):
    profile = find_profile(session, user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="You have not filled in your profile yet")
    return profile_out(profile, user)


@router.put("/me", response_model=ProfileOut)
def save_my_profile(body: ProfileIn, user: User = Depends(get_current_applicant), session: Session = Depends(get_session)):
    profile = get_or_create_profile(session, user.id)
    apply_fields(profile, body)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile_out(profile, user)


@router.put("/me/draft", response_model=ProfileOut)
def save_my_draft(body: ProfileDraftIn, user: User = Depends(get_current_applicant), session: Session = Depends(get_session)):
    profile = get_or_create_profile(session, user.id)
    apply_fields(profile, body)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile_out(profile, user)


@router.post("/me/resume", response_model=ProfileOut, status_code=201)
def upload_resume(file: UploadFile = File(...), user: User = Depends(get_current_applicant),
                  session: Session = Depends(get_session)):
    name = clean_filename(file.filename)
    if file.content_type not in {"application/pdf", "application/x-pdf"} and not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Please upload your resume as a PDF")
    data = file.file.read(MAX_RESUME_BYTES + 1)
    if len(data) > MAX_RESUME_BYTES:
        raise HTTPException(status_code=413, detail="Your resume must be 5 MB or smaller")
    if not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=422, detail="That file is not a valid PDF")

    key = storage_service.save(data, f"v1_cato/users/{user.id}/resume", "pdf", resource_type=RESUME_TYPE)
    profile = get_or_create_profile(session, user.id)
    old_key = profile.resume_location
    profile.resume_location = key
    profile.resume_name = name
    profile.resume_size = len(data)
    profile.resume_uploaded_at = utcnow()
    profile.updated_at = utcnow()
    session.add(profile)
    session.commit()
    session.refresh(profile)
    if old_key and old_key != key:
        try:
            storage_service.delete(old_key, RESUME_TYPE)
        except Exception:
            pass  # the new resume is saved; a leftover old file is harmless
    return profile_out(profile, user)


@router.delete("/me/resume", response_model=ProfileOut)
def delete_resume(user: User = Depends(get_current_applicant), session: Session = Depends(get_session)):
    profile = find_profile(session, user.id)
    if profile is None or profile.resume_location is None:
        raise HTTPException(status_code=404, detail="You have not uploaded a resume")
    old_key = profile.resume_location
    profile.resume_location = profile.resume_name = profile.resume_size = profile.resume_uploaded_at = None
    profile.updated_at = utcnow()
    session.add(profile)
    session.commit()
    session.refresh(profile)
    try:
        storage_service.delete(old_key, RESUME_TYPE)
    except Exception:
        pass
    return profile_out(profile, user)


@router.get("/{applicant_id}", response_model=ProfileOut)
def get_profile(applicant_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Read-only profile for any logged-in user: recruiters, applicants browsing the video feed
    (the Figma feed card shows field, year, GPA and skills) and "Preview as recruiter".
    The applicant's email and resume are only included for recruiters and the applicant themself."""
    applicant = session.get(User, applicant_id)
    profile = find_profile(session, applicant_id) if applicant and applicant.role == "applicant" else None
    if profile is None:
        raise HTTPException(status_code=404, detail="Applicant profile not found")
    out = profile_out(profile, applicant)
    if user.role != "recruiter" and user.id != applicant_id:
        out.resume_url = out.resume_name = out.resume_size = out.resume_uploaded_at = None
    return out
