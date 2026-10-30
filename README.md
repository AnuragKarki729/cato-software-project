# Cato – Software App Dev Project

A recruitment web app built around short videos and resumes. Applicants onboard with a resume
and a 30 second elevator pitch video; recruiters set the parameters of their ideal candidate and
get a ranked list of applicants. There are no job posts. Recruiters invite the applicants they like.

Stack: **React + Tailwind CSS** (`client/`) · **FastAPI** (`server/`) · **MySQL + SQLModel** (database) · **Docker** (everything runs in containers).

Style pages with Tailwind classes (`className="rounded-lg bg-white p-4"`); there is no separate CSS per page.

## Documentation

- [docs/overview.md](docs/overview.md) – the whole app: parts, flow, responsibilities, matching
- [docs/server.md](docs/server.md) – FastAPI server and endpoints
- [docs/database.md](docs/database.md) – MySQL tables
- [docs/uploads.md](docs/uploads.md) – video and resume storage
- [docs/client.md](docs/client.md) – React pages and components

## Run it

You only need Docker Desktop.

```bash
cp .env.example .env        # first time only
docker compose up --build
```

- Web app: http://localhost:5173
- API docs (try every endpoint): http://localhost:8000/docs

Stop with `Ctrl+C`. Your database and uploaded files are kept in Docker volumes.
MySQL runs in its own `db` container and is not exposed on your machine; only the server talks to it.
Tests use a temporary SQLite file, so they run without MySQL.
To wipe them and start fresh with the dummy data: `docker compose down -v`.

To open the app from other devices (e.g. the demo), expose port 5173 with a Cloudflare Tunnel
(`cloudflared tunnel --url http://localhost:5173`) or an nginx reverse proxy.

## Deployment

Just push to `main`. GitHub Actions (`.github/workflows/deploy.yml`) runs the tests, builds the images,
pushes them to GHCR, and updates the app on the team leader's PC (the host).
The live app runs on port 80 of that PC, with nginx serving the React files and forwarding `/api` to the server.

## Logging in while real login is not built yet

The navbar has an **"Acting as (dev)"** dropdown. Pick any dummy user (recruiters and applicants are
seeded on first start) and the app behaves as if you are logged in as them. Behind the scenes the
client sends `X-User-Id` with every request.

When Responsibility 7 finishes real login, only `server/app/services/auth_service.py` and `client/src/api.js`
change. Your routers keep using `get_current_user` / `require_role` as they are.

## Folder structure

```
Cato-SoftwareAppDev-Project/
├── server/                         FastAPI (Python)
│   ├── app/
│   │   ├── main.py                 creates the app and plugs in every router
│   │   ├── config.py               settings from .env
│   │   ├── database.py             MySQL connection, get_session()
│   │   ├── seed.py                 dummy users and profiles
│   │   ├── models/                 database tables (SQLModel), one file per table
│   │   ├── schemas/                request / response shapes (Pydantic)
│   │   ├── routers/                API endpoints, one file per feature
│   │   └── services/               logic shared by routers (matching, storage, login, options)
│   ├── tests/                      pytest tests
│   ├── pyproject.toml              server dependencies
│   └── Dockerfile
├── client/                         React (Vite)
│   ├── src/
│   │   ├── App.jsx                 page routes
│   │   ├── api.js                  api.get / post / put / delete helpers
│   │   ├── components/             NavBar, TodoPage, and your reusable parts
│   │   └── pages/                  one file per page
│   ├── package.json                client dependencies
│   └── Dockerfile
├── docker-compose.yml              starts server + client together
└── .env.example
```

## Who builds what

Every responsibility is full stack: the React page(s), the FastAPI endpoints and the tables.
Search the code for `Responsibility N` to find your files. Unbuilt endpoints return
**501 Not built yet (Responsibility N)**, and unbuilt pages show a dashed placeholder box.

| # | Responsibility | Server (`server/app/`) | Client (`client/src/pages/`) |
|---|---|---|---|
| **Group A – Applicant profile and videos** ||||
| 1 | Video upload and video retrieval | `routers/videos.py`, `services/storage_service.py` ✅ | `OnboardingVideo.jsx`, `MyProfile.jsx` |
| 2 | Applicant profile and resume | `routers/profiles.py` | `OnboardingProfile.jsx`, `MyProfile.jsx`, `ApplicantProfile.jsx` |
| 3 | Short-form video feed *(optional)* | `routers/feed.py` | `VideoFeed.jsx` |
| **Group B – Recruiter search and matching** ||||
| 4 | Recruiter filter page | `routers/filters.py` | `FindCandidates.jsx` |
| 5 | Candidate matching and ranked results | `routers/matching.py`, `services/matching_service.py` ✅ | `RankedResults.jsx` |
| 6 | Saved searches and bookmarks *(optional)* | `routers/saved.py` | `Saved.jsx` |
| **Group C – Accounts and invitations** ||||
| 7 | Sign up, log in and roles | `routers/auth.py`, `services/auth_service.py` | `SignUp.jsx`, `LogIn.jsx` |
| 8 | Invitations | `routers/invitations.py`, `services/invitation_service.py` | `Invitations.jsx`, `SentInvitations.jsx`, Invite button on `ApplicantProfile.jsx` |

✅ = already written and tested, ready to use.

## Ready-made pieces you should reuse

- **Fixed options** – `GET /api/options` returns the fields of study, skills and years.
  Both the applicant profile form and the recruiter filter form must use these (there is no free-text search).
- **Storage** – `storage_service.save(data, folder, extension)`, `get_url(key)`, `delete(key)`.
  Files go to the Docker volume and are served at `/api/files/...`. Used for videos and resumes.
- **Matching** – `matching_service.passes_hard_filters(profile, recruiter_filter)` and
  `matching_service.match_score(profile, recruiter_filter)` follow the formula in the project document.
- **Invitation message** – `invitation_service.build_message(recruiter, applicant)`.
- **Current user** – add `user: User = Depends(get_current_user)`, `Depends(get_current_applicant)` or
  `Depends(get_current_recruiter)` to an endpoint.
- **Skills** are stored as one comma separated string in the database (`"Python,React"`) and sent as a
  list in the API (`["Python", "React"]`).

## Tests

```bash
docker compose run --rm server uv run pytest
```

Or without Docker, from the `server/` folder: `uv sync` then `uv run pytest`.
