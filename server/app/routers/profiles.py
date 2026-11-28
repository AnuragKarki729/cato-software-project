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
import logging
import re

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlmodel import Session, select

from app.database import engine, get_session
from app.models import ApplicantProfile, User
from app.models.applicant_profile import utcnow
from app.schemas.profile import PrivacyIn, ProfileDraftIn, ProfileIn, ProfileOut
from app.services import resume_ai_service, storage_service, vocabulary_service
from app.services.auth_service import get_current_applicant, get_current_user
from app.services.matching_service import split_skills

log = logging.getLogger(__name__)

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
        parse_status=profile.parse_status,
        talking_points=[p for p in (profile.talking_points or "").split("\n") if p.strip()],
        details_complete=profile.details_complete,
        onboarding_complete=profile.onboarding_complete,
        updated_at=profile.updated_at,
        hidden=profile.hidden,
        blocked_companies=split_skills(profile.blocked_companies),
    )


def find_profile(session: Session, user_id: int) -> ApplicantProfile | None:
    return session.exec(select(ApplicantProfile).where(ApplicantProfile.user_id == user_id)).first()


def get_or_create_profile(session: Session, user_id: int) -> ApplicantProfile:
    # Lock the user row so two quick saves cannot both create a profile (MySQL).
    session.exec(select(User).where(User.id == user_id).with_for_update()).one()
    return find_profile(session, user_id) or ApplicantProfile(user_id=user_id)


def apply_fields(profile: ApplicantProfile, body: ProfileDraftIn, session: Session) -> None:
    # University and field of study resolve through the growing vocabulary, so the profile
    # always stores the canonical spelling. Matching can then keep comparing exact strings,
    # and a new spelling of a term we already know does not become a second entry.
    profile.university = vocabulary_service.resolve(session, vocabulary_service.UNIVERSITY, body.university)
    profile.field_of_study = vocabulary_service.resolve(
        session, vocabulary_service.FIELD_OF_STUDY, body.field_of_study)
    profile.year = body.year
    profile.gpa = body.gpa
    # Each skill resolves through the vocabulary too, so matching keeps comparing exact
    # strings and a new spelling of a known skill does not become a second entry.
    resolved = [vocabulary_service.resolve(session, vocabulary_service.SKILL, s) for s in body.skills]
    profile.skills = ",".join([s for s in resolved if s])
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
    apply_fields(profile, body, session)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile_out(profile, user)


@router.put("/me/draft", response_model=ProfileOut)
def save_my_draft(body: ProfileDraftIn, user: User = Depends(get_current_applicant), session: Session = Depends(get_session)):
    profile = get_or_create_profile(session, user.id)
    apply_fields(profile, body, session)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile_out(profile, user)


async def fill_from_resume(user_id: int, pdf_bytes: bytes) -> None:
    """Read the resume with an LLM and fill in whatever the applicant has left blank.

    Runs in the background after the upload returns, so nothing in the UI waits on it. Only
    empty fields are written: anything the applicant has already typed wins. Field of study is
    picked from the app's own list (never invented) and the applicant confirms it on review.
    """
    def finish(status: str, values: dict | None = None) -> None:
        with Session(engine) as session:
            profile = find_profile(session, user_id)
            if profile is None:
                return
            values = dict(values or {})
            # Already one of the app's fields (the model could only pick from the list); this
            # fetches its exact stored spelling and never adds a new field.
            if values.get("field_of_study"):
                values["field_of_study"] = vocabulary_service.resolve(
                    session, vocabulary_service.FIELD_OF_STUDY, values["field_of_study"], create=False)
            # A university read off a resume joins the vocabulary like any other, so the
            # dropdown can show it and the next applicant from there picks the same spelling.
            if values.get("university"):
                values["university"] = vocabulary_service.resolve(
                    session, vocabulary_service.UNIVERSITY, values["university"])
            # Skills read off a resume join the vocabulary as well, so a recruiter can filter
            # on them and the next applicant picks the same spelling from the list.
            if values.get("skills"):
                resolved = [vocabulary_service.resolve(session, vocabulary_service.SKILL, s)
                            for s in values["skills"].split(",")]
                values["skills"] = ",".join([s for s in resolved if s])
            def blank(value) -> bool:
                # 0 internships and a 0.0 GPA are real answers, so only None and emptiness count.
                return value is None or value == "" or value == []

            # Talking points are not something the applicant typed, so the read always sets them.
            points = values.pop("talking_points", None)
            if points is not None:
                profile.talking_points = "\n".join(points)[:1000]
            for field, value in values.items():
                if blank(value) or not blank(getattr(profile, field, None)):
                    continue  # never write over something the applicant has already given
                setattr(profile, field, value)
            profile.parse_status = status
            profile.updated_at = utcnow()
            session.add(profile)
            session.commit()

    try:
        text = resume_ai_service.extract_text(pdf_bytes)
        if not text:
            # A scan with no text layer is normal, not a failure of ours.
            finish("failed")
            return
        # The fields of study the model may choose from: the app's current list.
        with Session(engine) as session:
            known_fields = vocabulary_service.list_terms(session, vocabulary_service.FIELD_OF_STUDY)
        fields = await resume_ai_service.ask_model(text, known_fields)
    except Exception as err:  # noqa: BLE001 - a failed parse must never break onboarding
        log.warning("resume parsing failed for user %s: %s", user_id, err)
        finish("failed")
        return

    skills = fields.pop("skills", [])
    if skills:
        fields["skills"] = ",".join(skills)
    finish("done", fields)


@router.post("/me/resume", response_model=ProfileOut, status_code=201)
def upload_resume(background: BackgroundTasks, file: UploadFile = File(...),
                  user: User = Depends(get_current_applicant),
                  session: Session = Depends(get_session)):
    name = clean_filename(file.filename)
    if file.content_type not in {"application/pdf", "application/x-pdf"} and not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Please upload your resume as a PDF")
    data = file.file.read(MAX_RESUME_BYTES + 1)
    if len(data) > MAX_RESUME_BYTES:
        raise HTTPException(status_code=413, detail="Your resume must be 5 MB or smaller")
    if not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=422, detail="That file is not a valid PDF")

    # Folder comes from the email, not the database id, so it survives a database wipe.
    key = storage_service.save(data, f"{storage_service.user_folder(user.email)}/resume", "pdf",
                               resource_type=RESUME_TYPE)
    profile = get_or_create_profile(session, user.id)
    old_key = profile.resume_location
    profile.resume_location = key
    profile.resume_name = name
    profile.resume_size = len(data)
    profile.resume_uploaded_at = utcnow()
    profile.parse_status = "pending"
    profile.talking_points = ""  # the new resume's read brings its own
    profile.updated_at = utcnow()
    session.add(profile)
    session.commit()
    session.refresh(profile)
    if old_key and old_key != key:
        try:
            storage_service.delete(old_key, RESUME_TYPE)
        except Exception:
            pass  # the new resume is saved; a leftover old file is harmless
    # Read the resume after the response has gone out: the applicant moves straight on to the
    # video step and the fields are waiting for them when they come back.
    background.add_task(fill_from_resume, user.id, data)
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
    # A hidden applicant is not listed anywhere, so reading them by id directly should not be
    # the way round it. They can still open their own profile, which is how Settings and the
    # preview keep working while hidden.
    if profile.hidden and user.id != applicant_id:
        raise HTTPException(status_code=404, detail="Applicant profile not found")
    if user.role == "recruiter" and profile.blocks(user.company_name):
        raise HTTPException(status_code=404, detail="Applicant profile not found")
    out = profile_out(profile, applicant)
    if user.role != "recruiter" and user.id != applicant_id:
        out.resume_url = out.resume_name = out.resume_size = out.resume_uploaded_at = None
    # Privacy is the applicant's own business: nobody else is told that they are hidden, or
    # which companies they have blocked.
    if user.id != applicant_id:
        out.hidden = False
        out.blocked_companies = []
    return out


@router.put("/me/privacy", response_model=ProfileOut)
def save_privacy(body: PrivacyIn, user: User = Depends(get_current_applicant),
                 session: Session = Depends(get_session)):
    """Issue #5 — the Settings page: hide me, and the list of companies to stay away from.

    Its own endpoint rather than part of PUT /me: these have nothing to do with whether a
    profile is complete, and an applicant changes them long after onboarding is done.
    """
    profile = get_or_create_profile(session, user.id)
    profile.hidden = body.hidden
    profile.blocked_companies = ",".join(body.blocked_companies)
    profile.updated_at = utcnow()
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile_out(profile, user)
