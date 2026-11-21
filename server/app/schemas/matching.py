# Responsibility 5: Candidate matching and ranked results
# Owner: Nusrat Begum (6638009)
from pydantic import BaseModel, Field


class ScoreParts(BaseModel):
    skills: float  # out of 60
    gpa: float  # out of 20
    internships: float  # out of 20


class MatchResult(BaseModel):
    applicant_id: int
    name: str
    university: str | None = None
    field_of_study: str
    year: int
    gpa: float
    internships: int
    skills: list[str] = Field(default_factory=list)
    matched_skills: list[str] = Field(default_factory=list)
    required_skills_count: int = 0
    match_score: float
    breakdown: ScoreParts
    rank: int | None = None  # 1 = best match; None if the applicant fails a hard filter
    meets_requirements: bool = True
    pitch_url: str | None = None
    pitch_duration: float | None = None


class CurrentFilter(BaseModel):
    field_of_study: str | None = None
    min_year: int = 1
    min_internships: int = 0
    skills: list[str] = Field(default_factory=list)
    min_gpa: float = 0.0


class RankedResults(BaseModel):
    filter: CurrentFilter
    total: int  # applicants that pass the hard filters
    offset: int
    limit: int
    results: list[MatchResult]
