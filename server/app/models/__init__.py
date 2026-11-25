from app.models.user import User
from app.models.video import Video
from app.models.auth_session import AuthSession
from app.models.registration_consent import RegistrationConsent
from app.models.applicant_profile import ApplicantProfile  # Responsibility 2
from app.models.recruiter_filter import RecruiterFilter  # Responsibility 4 (read by matching, Responsibility 5)
from app.models.vocabulary import VocabularyTerm  # growing lists: university, field of study
from app.models.invitation import Invitation  # Responsibility 8
from app.models.saved_search import SavedSearch  # Responsibility 6
from app.models.bookmark import Bookmark  # Responsibility 6
