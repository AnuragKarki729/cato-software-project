"""Fixed options shared by the applicant profile form (Responsibility 2) and the
recruiter filter form (Responsibility 4).

There is no free-text search: both forms pick from these same lists, so skills and
fields of study match exactly during matching (Responsibility 5).
"""

UNIVERSITIES = [
    "Mahidol University",
    "Chulalongkorn University",
    "Thammasat University",
    "Kasetsart University",
    "King Mongkut's University of Technology Thonburi",
    "Chiang Mai University",
    "Assumption University",
    "Other university",
]

FIELDS_OF_STUDY = [
    "Computer Science",
    "Information Technology",
    "Data Science",
    "Engineering",
    "Business",
    "Design",
    "Communication Arts",
]

SKILLS = [
    "Python",
    "SQL",
    "React",
    "Docker",
    "Java",
    "JavaScript",
    "TypeScript",
    "C++",
    "Node.js",
    "Git",
    "Linux",
    "AWS",
    "Figma",
    "Excel",
    "Tableau",
    "Machine learning",
]

YEARS = [1, 2, 3, 4, 5]  # 5 = graduated
INTERNSHIPS = [0, 1, 2, 3, 4, 5]  # 5 = five or more
MAX_SKILLS = 10


def get_options() -> dict:
    return {
        "universities": UNIVERSITIES,
        "fields_of_study": FIELDS_OF_STUDY,
        "skills": SKILLS,
        "years": YEARS,
        "internships": INTERNSHIPS,
        "max_skills": MAX_SKILLS,
    }
