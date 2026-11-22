# Growing vocabularies: universities and fields of study.
# Owner: Anurag Karki (6838852)
#
# These started as fixed lists in options_service, which broke as soon as a real resume
# named a university that was not one of the eight seeded Thai ones: the value was stored
# but the dropdown could not show it. The list now lives in the database and grows.
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class VocabularyTerm(SQLModel, table=True):
    """One allowed value, of one kind.

    `label` is the canonical spelling everyone sees and the one written to profiles, so
    matching keeps comparing exact strings. `normalized` is what we compare on to decide
    whether a term already exists, which is why "mahidol university" and "Mahidol
    University" cannot both get in.

    Matching is by normalized form only. There is deliberately no fuzzy matching: a typo
    like "Hardvard" would be folded into "Harvard" most of the time, but if the typo were
    entered first it would become the canonical label for everyone after it.
    """
    __tablename__ = "vocabularyterm"

    id: int | None = Field(default=None, primary_key=True)
    kind: str = Field(index=True)  # "university" or "field_of_study"
    label: str  # canonical spelling, shown in the UI and stored on profiles
    normalized: str = Field(index=True)  # lowercase, punctuation-free; the matching key
    # Timezone-aware, like Video.created_at: a plain SQLModel datetime field rejects naive values.
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
