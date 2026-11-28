import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
# Salts the per-user Cloudinary folder name so it cannot be derived from an email alone.
# Keep the same value across deployments or everyone's files move to a new folder.
STORAGE_SALT = os.getenv("STORAGE_SALT", "cato-v1")
STORAGE_URL = os.getenv("STORAGE_URL")
CLOUDINARY_URL= os.getenv("CLOUDINARY_URL")

# Resume parsing with Claude, through Anthropic's own API. The key lives in .env as
# CLAUDE_API_KEY (ANTHROPIC_API_KEY also works) and is never committed.
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
# Claude Haiku 5.5: the smallest current model ($0.10 / $0.50 per million tokens, about
# $0.0005 a resume). Pulling five fields out of a resume is simple extraction, and every value
# is re-checked by resume_ai_service.clean() anyway. Override with CLAUDE_MODEL in .env.
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-haiku-5-5")
CLAUDE_TIMEOUT = 60  # seconds; parsing is a background job, so it can afford to wait

# Responsibility 1 — video limits (supervisor change request, issue #3).
MAX_VIDEO_SECONDS = 60  # hard limit for every video, enforced on upload
RECOMMENDED_PITCH_SECONDS = 20  # guidance shown on the onboarding pitch page, not enforced
MAX_EXTRA_VIDEOS = 3  # extra videos per applicant, not counting the pitch
MAX_VIDEO_CAPTION = 200  # characters; the applicant writes this, it is never AI generated
# characters; only a "Free topic" video carries the applicant's own wording, and only they
# write it. The three fixed titles are longer than nothing and shorter than this.
MAX_VIDEO_TITLE = 80