"""Mock data, so no responsibility waits for another.

Import from here while the code you depend on is unfinished, then swap it for the real call.
"""

MOCK_RANKED_RESULTS = [
    {"applicant_id": 3, "name": "Alex Kim", "field_of_study": "Computer Science", "year": 4, "match_score": 91.3},
    {"applicant_id": 4, "name": "Bea Santos", "field_of_study": "Computer Science", "year": 2, "match_score": 75.5},
]

MOCK_FILTER = {
    "recruiter_id": 1, "field_of_study": "Computer Science", "min_year": 2,
    "min_internships": 0, "skills": ["Python"], "min_gpa": 3.0,
}

MOCK_PROFILE = {
    "user_id": 3, "university": "Mahidol University", "field_of_study": "Computer Science", "year": 4,
    "gpa": 3.6, "skills": ["Python", "React", "SQL"], "internships": 2, "resume_url": None,
}
