"""Options shared by the applicant profile form (Responsibility 2) and the recruiter filter
form (Responsibility 4).

There is still no free-text search: both forms pick from the same lists, so fields of study
and skills match exactly during matching (Responsibility 5).

Universities and fields of study are no longer frozen here. The lists below seed a database
vocabulary that grows as applicants add terms, which is why `get_options` needs a session.
See `vocabulary_service`. Skills are still a fixed list.
"""

# Starting values only. Once the database is seeded, vocabulary_service owns these two.
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

# Responsibility 1 — every video picks one of these as its title (issue #3).
# The pitch and the extra videos use the same list.
# Issue #3: every video is titled. The first three are fixed, because they are the questions
# a recruiter is looking for an answer to. "Free topic" is the applicant's own, and they may
# write their own wording over it; left blank it stays as it reads here.
FREE_TOPIC = "Free topic"
VIDEO_TITLES = [
    "About me",
    "A project I'm proud of",
    "Why this field",
    FREE_TOPIC,
]


def get_options(session=None) -> dict:
    # Imported here so the lists above stay free of settings and database imports.
    from app.config import (MAX_EXTRA_VIDEOS, MAX_VIDEO_CAPTION, MAX_VIDEO_SECONDS,
                            MAX_VIDEO_TITLE, RECOMMENDED_PITCH_SECONDS)
    from app.services import vocabulary_service

    # Without a session (a few tests) fall back to the seed lists.
    universities = vocabulary_service.list_terms(session, vocabulary_service.UNIVERSITY) if session else UNIVERSITIES
    fields = vocabulary_service.list_terms(session, vocabulary_service.FIELD_OF_STUDY) if session else FIELDS_OF_STUDY
    skills = vocabulary_service.list_terms(session, vocabulary_service.SKILL) if session else SKILLS
    return {
        "universities": universities or UNIVERSITIES,
        "fields_of_study": fields or FIELDS_OF_STUDY,
        "skills": skills or SKILLS,
        "years": YEARS,
        "internships": INTERNSHIPS,
        "max_skills": MAX_SKILLS,
        "video_titles": VIDEO_TITLES,
        # Which of those titles the applicant may write over, so the client does not have to
        # know the string, and how long their own wording may be.
        "free_topic_title": FREE_TOPIC,
        "max_video_title": MAX_VIDEO_TITLE,
        # Responsibility 1 limits, so the client never hardcodes them.
        "max_video_seconds": MAX_VIDEO_SECONDS,
        "recommended_pitch_seconds": RECOMMENDED_PITCH_SECONDS,
        "max_extra_videos": MAX_EXTRA_VIDEOS,
        "max_video_caption": MAX_VIDEO_CAPTION,
    }
