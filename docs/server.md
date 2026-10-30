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

## Logging in (for now)

Real login is Responsibility 7. Until then the server uses a **temporary development login**:
the client sends the chosen user's id in an `X-User-Id` header, and `services/auth_service.py` turns it
into a `User`.

Add one of these to any endpoint to get the current user:

| Dependency | Allows | Otherwise |
|---|---|---|
| `Depends(get_current_user)` | any logged-in user | 401 Not logged in |
| `Depends(get_current_applicant)` | applicants only | 403 Only applicants can do this |
| `Depends(get_current_recruiter)` | recruiters only | 403 Only recruiters can do this |

```python
@router.get("/me")
def get_my_profile(user: User = Depends(get_current_applicant), session: Session = Depends(get_session)):
    ...
```

When real login is finished, only `get_current_user` changes. Every router keeps working.

## Services

| File | What it gives you | Status |
|---|---|---|
| `auth_service.py` | `get_current_user`, `get_current_applicant`, `get_current_recruiter` | ✅ temporary dev login |
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
| GET | `/dev/users` | anyone | dev only | ✅ |
| POST | `/auth/signup` | anyone | 7 | 501 |
| POST | `/auth/login` | anyone | 7 | 501 |
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
| GET | `/saved/searches` | recruiter | 6 (optional) | 501 |
| POST | `/saved/searches` | recruiter | 6 (optional) | 501 |
| DELETE | `/saved/searches/{search_id}` | recruiter | 6 (optional) | 501 |
| GET | `/saved/bookmarks` | recruiter | 6 (optional) | 501 |
| POST | `/saved/bookmarks` | recruiter | 6 (optional) | 501 |
| DELETE | `/saved/bookmarks/{bookmark_id}` | recruiter | 6 (optional) | 501 |
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
