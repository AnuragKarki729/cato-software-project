# Server (FastAPI)

The server lives in `server/`. It is a FastAPI app that serves a JSON API under `/api`, talks to
MySQL through SQLModel, and saves uploaded files. Back to the [overview](overview.md).

## Folder structure

```
server/
├── app/
│   ├── main.py          creates the app, adds CORS, plugs in every router, serves /api/files
│   ├── config.py        settings read from .env
│   ├── database.py      MySQL connection, create_db_and_tables(), get_session()
│   ├── seed.py          dummy users and profiles, added on first start
│   ├── models/          database tables, one file per table      → database.md
│   ├── schemas/         what requests send and responses return (Pydantic)
│   ├── routers/         API endpoints, one file per feature
│   └── services/        shared logic used by routers
├── tests/               pytest tests
├── pyproject.toml       dependencies (managed with uv)
├── uv.lock
└── Dockerfile
```

How a request flows: **router** (receives the request, checks the user) → **service** (shared logic)
→ **model** (reads/writes the database) → **schema** (shapes the response).

## Settings (`config.py` / `.env`)

| Setting | Default in Docker | Meaning |
|---|---|---|
| `DATABASE_URL` | `mysql+pymysql://cato:cato@db:3306/cato` | MySQL connection |
| `STORAGE_DIR` | `/data/uploads` | Where uploaded files are saved |
| `SEED_DUMMY_DATA` | `true` | Add dummy users on first start |
| `MAX_VIDEO_SECONDS` | `30` (in code) | Longest allowed video |
| `MAX_EXTRA_VIDEOS` | `5` (in code) | Extra videos allowed besides the pitch |

## Startup

When the server starts (`lifespan` in `main.py`) it:

1. Creates any missing tables (`create_db_and_tables()`).
2. Adds the dummy data if the database is empty (`seed_if_empty()`): 2 recruiters and 6 applicants with profiles.

## Authentication (Responsibility 7)

Sign up with `POST /api/auth/signup`; log in with `POST /api/auth/login` to receive an
`access_token` and public user information. Send `Authorization: Bearer TOKEN` for protected
endpoints. `POST /api/auth/logout` revokes that session. Tokens expire after 24 hours.

Passwords use salted scrypt hashes. Random session tokens are stored only as SHA-256 digests
in the additive `authsession` table. Existing `user` columns are unchanged. The public
`/api/dev/users` account-switching route is no longer registered, and `X-User-Id` is ignored.

Keep using `get_current_user`, `get_current_applicant`, and `get_current_recruiter` dependencies.
Missing/invalid/expired tokens return 401; the wrong role returns 403. `/auth/me` also returns
`onboarding_step` based on the applicant's existing profile, resume and pitch.

## Services

| File | What it gives you | Status |
|---|---|---|
| `auth_service.py` | `get_current_user`, `get_current_applicant`, `get_current_recruiter` | ✅ bearer login and role checks |
| `options_service.py` | Fixed lists: fields of study, skills, years | ✅ |
| `storage_service.py` | `save`, `get_url`, `delete` for files → [uploads.md](uploads.md) | ✅ |
| `matching_service.py` | `passes_hard_filters(profile, filter)`, `match_score(profile, filter)`, `split_skills(text)` | ✅ |
| `invitation_service.py` | `build_message(recruiter, applicant)` | ✅ |

## Endpoints

All paths start with `/api`. Try them at http://localhost:8000/docs.
"501" means the endpoint exists but is not built yet.

| Method | Path | Who | Responsibility | Status |
|---|---|---|---|---|
| GET | `/health` | anyone | – | ✅ |
| GET | `/options` | anyone | shared | ✅ |
| POST | `/auth/logout` | logged in | 7 | ✅ |
| POST | `/auth/signup` | anyone | 7 | ✅ |
| POST | `/auth/login` | anyone | 7 | ✅ |
| GET | `/auth/me` | logged in | 7 | ✅ |
| GET | `/profiles/me` | applicant | 2 | 501 |
| PUT | `/profiles/me` | applicant | 2 | 501 |
| POST | `/profiles/me/resume` | applicant | 2 | 501 |
| GET | `/profiles/{applicant_id}` | logged in | 2 | 501 |
| POST | `/videos` | applicant | 1 | 501 |
| GET | `/videos/applicant/{applicant_id}` | logged in | 1 | 501 |
| GET | `/videos/{video_id}` | logged in | 1 | 501 |
| DELETE | `/videos/{video_id}` | applicant | 1 | 501 |
| GET | `/feed?page=1` | logged in | 3 (optional) | 501 |
| GET | `/filters/me` | recruiter | 4 | 501 |
| PUT | `/filters/me` | recruiter | 4 | 501 |
| GET | `/matching/results` | recruiter | 5 | 501 |
| POST | `/invitations` | recruiter | 8 | 501 |
| GET | `/invitations/received` | applicant | 8 | 501 |
| GET | `/invitations/sent` | recruiter | 8 | 501 |
| GET | `/saved/searches` | recruiter | 6 (optional) | ✅ |
| POST | `/saved/searches` | recruiter | 6 (optional) | ✅ |
| DELETE | `/saved/searches/{search_id}` | recruiter | 6 (optional) | ✅ |
| GET | `/saved/bookmarks` | recruiter | 6 (optional) | ✅ |
| POST | `/saved/bookmarks` | recruiter | 6 (optional) | ✅ |
| DELETE | `/saved/bookmarks/{bookmark_id}` | recruiter | 6 (optional) | ✅ |
| GET | `/files/{key}` | anyone | uploads | ✅ |

Each unbuilt endpoint has a `# TODO` comment describing what it should do.

## Schemas

Schemas in `app/schemas/` describe the JSON going in and out. `...In` is what the client sends,
`...Out` is what the server returns.

| File | Schemas |
|---|---|
| `user.py` | `UserOut`, `SignUpIn`, `LogInIn` |
| `profile.py` | `ProfileIn`, `ProfileOut` |
| `video.py` | `VideoOut` |
| `filter.py` | `FilterIn`, `FilterOut` |
| `matching.py` | `MatchResult` |
| `invitation.py` | `InvitationIn`, `InvitationOut` |

Skills are a **list** in the API (`["Python", "React"]`) but one **comma separated string** in the
database (`"Python,React"`). Convert with `",".join(skills)` and `split_skills(text)`.

## Adding an endpoint (example)

```python
# app/routers/filters.py
@router.get("/me", response_model=FilterOut)
def get_my_filter(user: User = Depends(get_current_recruiter), session: Session = Depends(get_session)):
    f = session.exec(select(RecruiterFilter).where(RecruiterFilter.recruiter_id == user.id)).first()
    if f is None:
        raise HTTPException(status_code=404, detail="No filter saved yet")
    return FilterOut(recruiter_id=f.recruiter_id, field_of_study=f.field_of_study, min_year=f.min_year,
                     min_internships=f.min_internships, skills=split_skills(f.skills), min_gpa=f.min_gpa)
```

A new router file must also be added in `main.py` with `api.include_router(...)`.

## Tests

Tests are in `server/tests/` and use a temporary SQLite file, so MySQL is not needed.

| File | Checks |
|---|---|
| `test_framework.py` | health, dummy data, dev login, role checks, options |
| `test_matching.py` | the matching formula and hard filters |
| `test_storage.py` | saving, serving and deleting files |

```bash
docker compose run --rm server uv run pytest     # in Docker
cd server && uv sync && uv run pytest            # without Docker
```

Add tests for your endpoints in a new `tests/test_<feature>.py`. Use the `client` and `users`
fixtures from `conftest.py`, and `as_user(user)` for the login header.

### Saved-search additions

- `POST /api/saved/searches/{id}/run`: checks ownership and copies saved parameters into
  the recruiter's current `recruiterfilter`, returning `FilterOut`.
- `GET /api/saved/current-filter`: reads only this recruiter’s persisted current filter for the
  reusable SaveSearchButton; returns 404 if Responsibility 4 has not saved any filters yet.
- Bookmark responses include applicant `name`, `field_of_study`, and `year`.
- Existing bookmarks are returned on repeated POSTs. Recruiter row locking serializes these
  attempts on MySQL. Delete/run operations on another recruiter's saved items return 404.

`tests/conftest.py` now authenticates test accounts with real bearer sessions. Use `as_user(user)`
as before. All tests use an isolated database reset per test, with Cloudinary disabled.

### Registration consent and Saved card metadata

Applicant signup must include `sharing_consent: true` and an 8–128 character password containing
at least one number. The checkbox is unchecked by default in the client. Consent scope, notice
version and timestamp are persisted atomically in the additive registrationconsent table.
Recruiter signup requires company_name and does not require applicant-sharing consent.

Saved search responses include the computed hard-filter match_count. Bookmark responses also
include profile fields, skills, matched_skills, required_skills_count, match_score,
meets_requirements, pitch_url/duration and whether an invitation already exists. Data is read
from the existing tables/services, without rewriting those owners' implementations.
