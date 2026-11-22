"""Growing vocabularies for university and field of study.

Owner: Anurag Karki (6838852).

Both used to be fixed lists. A real resume named a university outside the eight seeded ones
and the value became invisible in the dropdown, so the lists moved into the database and now
grow: anything an applicant picks or that is read off a resume becomes an option for the
next person.

Two rules keep matching working while the list grows:

  1. Everything resolves to a CANONICAL label. Profiles and recruiter filters both store that
     label, so `profile.field_of_study != filter.field_of_study` keeps comparing exact
     strings and Responsibility 5 needs no changes.
  2. Comparison is on the NORMALIZED form, so "mahidol university" and "Mahidol University"
     are the same term and only one of them is ever stored.

There is deliberately no fuzzy matching. It would usually fold "Hardvard" into "Harvard",
but whichever spelling arrived first would become the canonical label for everyone after it,
and a typo would quietly rename a real university.
"""
import re
import unicodedata

from sqlmodel import Session, select

from app.models.vocabulary import VocabularyTerm

UNIVERSITY = "university"
FIELD_OF_STUDY = "field_of_study"
SKILL = "skill"
KINDS = (UNIVERSITY, FIELD_OF_STUDY, SKILL)

MAX_LABEL = 120

_PUNCTUATION = re.compile(r"[^\w\s]", re.UNICODE)
_SPACES = re.compile(r"\s+")


def normalize(label: str) -> str:
    """The matching key: case, accents, punctuation and spacing all removed.

    "King Mongkut's University  " and "king mongkuts university" give the same key.
    """
    text = unicodedata.normalize("NFKD", label or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = _PUNCTUATION.sub(" ", text.casefold())
    return _SPACES.sub(" ", text).strip()


def tidy(label: str) -> str:
    """Tidy a label for storage without changing how it is spelled."""
    return _SPACES.sub(" ", (label or "").strip())[:MAX_LABEL]


def list_terms(session: Session, kind: str) -> list[str]:
    """Every label of one kind, alphabetically."""
    rows = session.exec(select(VocabularyTerm).where(VocabularyTerm.kind == kind)).all()
    return sorted((row.label for row in rows), key=str.casefold)


def resolve(session: Session, kind: str, label: str | None, *, create: bool = True) -> str | None:
    """Turn whatever was typed or parsed into the canonical label for that term.

    Returns the existing label when the normalized form is already known, so a new spelling
    never creates a duplicate. With create=False an unknown term returns None instead of
    being added, which is what the recruiter filter wants: recruiters search the vocabulary,
    they do not extend it.
    """
    if kind not in KINDS:
        raise ValueError(f"unknown vocabulary kind: {kind}")

    cleaned = tidy(label)
    if not cleaned:
        return None

    key = normalize(cleaned)
    if not key:
        return None

    existing = session.exec(
        select(VocabularyTerm).where(VocabularyTerm.kind == kind, VocabularyTerm.normalized == key)
    ).first()
    if existing:
        return existing.label
    if not create:
        return None

    session.add(VocabularyTerm(kind=kind, label=cleaned, normalized=key))
    session.commit()
    return cleaned


def seed(session: Session, kind: str, labels: list[str]) -> None:
    """Put the original fixed lists in as the starting vocabulary. Safe to run repeatedly."""
    known = {row.normalized for row in
             session.exec(select(VocabularyTerm).where(VocabularyTerm.kind == kind)).all()}
    added = False
    for label in labels:
        cleaned, key = tidy(label), normalize(label)
        if key and key not in known:
            session.add(VocabularyTerm(kind=kind, label=cleaned, normalized=key))
            known.add(key)
            added = True
    if added:
        session.commit()
