"""The shared starting database: every demo account, profile and video, the same for everyone.

Files (resumes, videos) already live permanently in Cloudinary. MySQL does not: it is a Docker
volume on each laptop, so everybody's database drifted apart. This module copies the rows that
make up the demo into `seed_data/snapshot.json`, which is committed, and loads them back into an
empty database on start-up when SEED_DATA=true. Everyone then starts from the same accounts,
pointing at the same files.

    docker compose exec server python -m app.seed_snapshot export   # write snapshot.json
    SEED_DATA=true in .env, then docker compose down -v && docker compose up -d   # start from it

Rows are linked by EMAIL, not database id: ids are auto-increment and differ per database.
Password hashes are copied as they are, so every login works exactly as before.

Left out on purpose: invitations, bookmarks, saved searches and login sessions. Those are what
people do while testing; the starting state is the accounts and their content, nothing more.
"""
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlmodel import Session, select

from app.database import engine
from app.models import ApplicantProfile, RecruiterFilter, RegistrationConsent, User, Video, VocabularyTerm

log = logging.getLogger(__name__)

SNAPSHOT = Path(__file__).parent / "seed_data" / "snapshot.json"
VERSION = 1


def enabled() -> bool:
    return os.getenv("SEED_DATA", "false").strip().lower() in {"1", "true", "yes"}


def _row(obj, drop=()) -> dict:
    """A model as plain JSON: no id, no foreign keys (those become an email), dates as text."""
    data = obj.model_dump(exclude={"id", *drop})
    return {k: v.isoformat() if isinstance(v, datetime) else v for k, v in data.items()}


def _parse(data: dict, model) -> dict:
    """Back from JSON: turn date strings into datetimes for the fields the model has."""
    out = {}
    for key, value in data.items():
        if key not in model.model_fields:
            continue  # a column that has since been removed: ignore rather than fail
        if isinstance(value, str) and key.endswith("_at"):
            value = datetime.fromisoformat(value)
            # Two kinds of date column in this app: SQLModel's own datetime type insists on a
            # timezone (video, vocabularyterm), SQLAlchemy's DateTime(timezone=False) wants none.
            aware = type(model.__table__.c[key].type).__module__.startswith("sqlmodel")
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            value = value.astimezone(timezone.utc)
            if not aware:
                value = value.replace(tzinfo=None)
        out[key] = value
    return out


def export(path: Path = SNAPSHOT) -> dict:
    with Session(engine) as session:
        users = session.exec(select(User).order_by(User.id)).all()
        email = {u.id: u.email for u in users}
        accounts = []
        for user in users:
            account = _row(user)
            profile = session.exec(select(ApplicantProfile).where(ApplicantProfile.user_id == user.id)).first()
            consent = session.exec(select(RegistrationConsent).where(RegistrationConsent.user_id == user.id)).first()
            videos = session.exec(select(Video).where(Video.applicant_id == user.id).order_by(Video.id)).all()
            account["profile"] = _row(profile, drop={"user_id"}) if profile else None
            account["consent"] = _row(consent, drop={"user_id"}) if consent else None
            account["videos"] = [_row(v, drop={"applicant_id"}) for v in videos]
            accounts.append(account)
        filters = [{"recruiter_email": email[f.recruiter_id], **_row(f, drop={"recruiter_id"})}
                   for f in session.exec(select(RecruiterFilter)).all()]
        vocabulary = [_row(t) for t in session.exec(select(VocabularyTerm).order_by(VocabularyTerm.id)).all()]

    snapshot = {"version": VERSION, "exported_at": datetime.now().isoformat(timespec="seconds"),
                "accounts": accounts, "recruiter_filters": filters, "vocabulary": vocabulary}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n")
    return snapshot


def load_if_empty(path: Path = SNAPSHOT) -> bool:
    """Fill an EMPTY database from the snapshot. Returns True if it did.

    Never touches a database that already has users in it, so a restart does nothing and nobody
    loses what they made. To start over from the snapshot: docker compose down -v.
    """
    if not path.exists():
        log.warning("SEED_DATA is on but %s does not exist; using the built-in demo seed", path)
        return False
    with Session(engine) as session:
        if session.exec(select(User)).first() is not None:
            return False
        snapshot = json.loads(path.read_text())

        for term in snapshot.get("vocabulary", []):
            session.add(VocabularyTerm(**_parse(term, VocabularyTerm)))

        ids = {}
        for account in snapshot["accounts"]:
            user = User(**_parse(account, User))
            session.add(user)
            session.flush()  # to get the new id
            ids[user.email] = user.id
            if account.get("profile"):
                session.add(ApplicantProfile(user_id=user.id, **_parse(account["profile"], ApplicantProfile)))
            if account.get("consent"):
                session.add(RegistrationConsent(user_id=user.id, **_parse(account["consent"], RegistrationConsent)))
            for video in account.get("videos", []):
                session.add(Video(applicant_id=user.id, **_parse(video, Video)))

        for item in snapshot.get("recruiter_filters", []):
            recruiter = ids.get(item["recruiter_email"])
            if recruiter:
                session.add(RecruiterFilter(recruiter_id=recruiter, **_parse(item, RecruiterFilter)))

        session.commit()
    log.info("loaded the shared seed: %d accounts", len(snapshot["accounts"]))
    return True


if __name__ == "__main__":
    if sys.argv[1:] == ["export"]:
        data = export()
        people = data["accounts"]
        print(f"wrote {SNAPSHOT}: {len(people)} accounts, "
              f"{sum(len(a['videos']) for a in people)} videos, "
              f"{sum(1 for a in people if a['profile'] and a['profile'].get('resume_location'))} resumes, "
              f"{len(data['vocabulary'])} vocabulary terms, {len(data['recruiter_filters'])} filters")
    else:
        print("usage: python -m app.seed_snapshot export")
