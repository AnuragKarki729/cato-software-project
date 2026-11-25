# Cato – Software App Dev Project

A recruitment web app built around short videos and resumes. Applicants onboard with a resume
and a 60-second elevator pitch video; recruiters set the parameters of their ideal candidate and
get a ranked list of applicants. There are no job posts. Recruiters invite the applicants they like.

Stack: **React + Vite** (`client/`) · **FastAPI + SQLModel** (`server/`) · **MySQL** (database) · **Cloudinary** (video and resume storage) · **Docker Compose** (everything runs in containers).

Styling is plain CSS in `client/src/styles/` with a shared design system in `client/src/components/ui/`.

## Documentation

- [docs/overview.md](docs/overview.md) – the whole app: parts, flow, responsibilities, matching
- [docs/server.md](docs/server.md) – FastAPI server and endpoints
- [docs/database.md](docs/database.md) – MySQL tables
- [docs/client.md](docs/client.md) – React pages and components
- [docs/responsibilities-2-5.md](docs/responsibilities-2-5.md) – applicant profile, resume and matching (Nusrat)
- [docs/responsibilities-6-7.md](docs/responsibilities-6-7.md) – auth and saved searches (Aye)

## Run it

You only need Docker Desktop.

```bash
docker compose up --build
```

Get the `.env` file from Anurag — it contains the database credentials, Cloudinary keys and
OpenRouter API key. There is no `.env.example` in the repository.

- Web app: http://localhost:5173
- API docs (try every endpoint): http://localhost:8000/docs

Stop with `Ctrl+C`. Your database is kept in a Docker volume.
MySQL runs in its own `db` container and is not exposed on your machine; only the server talks to it.
Tests use a temporary SQLite file, so they run without MySQL.
To wipe the database and start fresh with the seed data: `docker compose down -v`.

Videos and resumes are stored in Cloudinary through `server/app/services/storage_service.py`.

To open the app from other devices (e.g. the demo), expose port 5173 with a Cloudflare Tunnel
(`cloudflared tunnel --url http://localhost:5173`) or an nginx reverse proxy.

## Logging in

Use **Sign up** to create an applicant or recruiter account, then log in with email and password.
Recruiters must supply a company name. Applicants are directed to the appropriate onboarding
step, and recruiters to Find candidates. Protected API endpoints use a bearer token.

Tokens last 24 hours, are stored in the browser tab's session storage, and are revoked by **Log out**.

Seed data runs on every start (unless `SEED_DUMMY_DATA=false`). The demo password for every
seeded account is `password1`. To set a different password for a seeded user:

```bash
docker compose exec server uv run python -m app.set_password aye@cato.test
```

See [Responsibilities 6 and 7](docs/responsibilities-6-7.md) and [Responsibilities 2 and 5](docs/responsibilities-2-5.md) for implementation details and demo checklists.

## Folder structure

```
cato-software-project/
├── server/                         FastAPI (Python)
│   ├── app/
│   │   ├── main.py                 creates the app and plugs in every router
│   │   ├── config.py               settings from .env
│   │   ├── database.py             MySQL connection, get_session()
│   │   ├── seed.py                 demo users, applicant profiles, vocabulary
│   │   ├── models/                 database tables (SQLModel), one file per table
│   │   ├── schemas/                request / response shapes (Pydantic)
│   │   ├── routers/                API endpoints, one file per feature
│   │   └── services/               logic shared by routers (matching, storage, auth, options, resume AI)
│   ├── tests/                      pytest tests (SQLite, no MySQL needed)
│   ├── requirements.txt            server dependencies (used by Dockerfile)
│   └── Dockerfile
├── client/                         React (Vite)
│   ├── src/
│   │   ├── App.jsx                 page routes and role guards
│   │   ├── api.js                  api.get / post / put / delete helpers
│   │   ├── components/             shared components and design system (components/ui/)
│   │   ├── pages/                  one file per page (public/, applicant/, recruiter/)
│   │   ├── styles/                 CSS (ui.css, pages.css, public.css)
│   │   ├── context/                AuthContext
│   │   └── utils/                  format.js, filters.js, media.js
│   ├── package.json                client dependencies
│   └── Dockerfile
├── docker-compose.yml              starts server + client + db together
├── harness/                        agent and team context
├── docs/                           technical documentation
├── pyproject.toml                  root uv project for running the server locally
└── AI-USAGE-DECLARATION.md         AI usage declaration (see below)
```

## Who builds what

Every responsibility is full stack: the React page(s), the FastAPI endpoints and the tables.
Search the code for `Responsibility N` to find the files. See `harness/responsibilities.md` for
current status and ownership.

| # | Responsibility | Owner | Server | Client |
|---|---|---|---|---|
| 1 | Video upload and video retrieval | Anurag | `routers/videos.py`, `services/storage_service.py` | `OnboardingVideo.jsx`, `VideoFeed.jsx` |
| 2 | Applicant profile and resume | Nusrat | `routers/profiles.py` | `OnboardingProfile.jsx`, `MyProfile.jsx`, `ApplicantProfile.jsx` |
| 3 | Short-form video feed | Anurag | `routers/feed.py` | `VideoFeed.jsx`, `ExploreCandidates.jsx` |
| 4 | Recruiter filter page | Siwakorn | `routers/filters.py` | `FindCandidates.jsx` |
| 5 | Candidate matching and ranked results | Nusrat | `routers/matching.py`, `services/matching_service.py` | `RankedResults.jsx` |
| 6 | Saved searches and bookmarks *(optional)* | Aye | `routers/saved.py` | `Saved.jsx` |
| 7 | Sign up, log in and roles | Aye | `routers/auth.py`, `services/auth_service.py` | `SignUp.jsx`, `LogIn.jsx` |
| 8 | Invitations | Siwakorn | `routers/invitations.py` | `Invitations.jsx`, `SentInvitations.jsx` |

## Ready-made pieces you should reuse

- **Fixed options** – `GET /api/options` returns the fields of study, skills, years, video titles and limits.
  Both the applicant profile form and the recruiter filter form use these (there is no free-text search).
- **Storage** – `storage_service.save(data, folder, resource_type)`, `get_url(key)`, `delete(key)`.
  Files go to Cloudinary. Used for videos and resumes.
- **Matching** – `matching_service.passes_hard_filters(profile, recruiter_filter)` and
  `matching_service.match_score(profile, recruiter_filter)` follow the formula in the project document.
- **Current user** – add `user: User = Depends(get_current_user)`, `Depends(get_current_applicant)` or
  `Depends(get_current_recruiter)` to an endpoint.
- **Skills** are stored as one comma-separated string in the database (`"Python,React"`) and sent as a
  list in the API (`["Python", "React"]`).
- **Design system** – `client/src/components/ui/` has Button, Dialog, Toast, Avatar, Badge, Tag,
  SelectField, TextField, VideoViewer, ResumeViewer and more. Reuse them.

## Tests

```bash
docker compose run --rm server uv run pytest
```

Or without Docker, from the repo root: `uv run python -m pytest server/tests/` (with `PYTHONPATH=server`).

For a local client install without Docker, use `npm ci --legacy-peer-deps` in `client/`,
matching the existing Dockerfiles (the video-trimming dependency declares a React 19 peer).

## AI Usage Declaration

This project uses AI tools as declared in [AI-USAGE-DECLARATION.md](AI-USAGE-DECLARATION.md).
Every team member who uses AI for committed work records it there, in the same pull request as the
work. See `harness/policy.md` section 4 for the rule.
