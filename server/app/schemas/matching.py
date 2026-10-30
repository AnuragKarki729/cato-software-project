# Responsibility 5: Candidate matching and ranked results
# Owner: Nusrat Begam (6638009)
from pydantic import BaseModel


class MatchResult(BaseModel):
    applicant_id: int
    name: str
    field_of_study: str
    year: int
    match_score: float
