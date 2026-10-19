"""Fixed options shared by the applicant profile form and the recruiter filter form.

There is no free-text search: both forms must pick from these same lists, so that
skills and fields match exactly during matching.
"""

FIELDS_OF_STUDY = [
    "Computer Science",
    "Information Technology",
    "Business",
    "Engineering",
    "Design",
    "Communication Arts",
]

SKILLS = [
    "Python",
    "JavaScript",
    "React",
    "SQL",
    "Java",
    "Figma",
    "Data Analysis",
    "Marketing",
    "Public Speaking",
    "Project Management",
]

YEARS = [1, 2, 3, 4, 5]  # 5 = graduated


def get_options() -> dict:
    return {"fields_of_study": FIELDS_OF_STUDY, "skills": SKILLS, "years": YEARS}
