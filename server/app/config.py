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

# Resume parsing through OpenRouter. The class key supplied by the supervisor is the one in
# use; the personal keys hit upstream rate limits on the shared free pool. Keys live in .env
# and are never committed.
OPENROUTER_API_KEY = os.getenv("OPEN_ROUTER_API_KEY_2_CLASS_KEY") or os.getenv("OPEN_ROUTER_API_KEY_1")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
# The same model the project used in Cline. Chosen because the class key's guardrails block
# Gemma, and because it held up across repeated runs of the resume prompt, including against
# instructions planted in the resume. Override with OPENROUTER_MODEL in .env.
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "qwen/qwen3-coder-30b-a3b-instruct")
OPENROUTER_TIMEOUT = 60  # seconds; parsing is a background job, so it can afford to wait

# Responsibility 1 — video limits (supervisor change request, issue #3).
MAX_VIDEO_SECONDS = 60  # hard limit for every video, enforced on upload
RECOMMENDED_PITCH_SECONDS = 20  # guidance shown on the onboarding pitch page, not enforced
MAX_EXTRA_VIDEOS = 3  # extra videos per applicant, not counting the pitch
MAX_VIDEO_CAPTION = 200  # characters; the applicant writes this, it is never AI generated
# characters; only a "Free topic" video carries the applicant's own wording, and only they
# write it. The three fixed titles are longer than nothing and shorter than this.
MAX_VIDEO_TITLE = 80