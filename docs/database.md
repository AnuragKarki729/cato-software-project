# Database (MySQL + SQLModel)

The database is MySQL 8.4, running in the `db` container. The server talks to it through
**SQLModel**, a Python ORM: each table is a Python class in `server/app/models/`, one file per table.
Back to the [overview](overview.md).

## Where it runs

| | |
|---|---|
| Container | `db` (image `mysql:8.4`) |
| Database / user / password | `cato` / `cato` / `cato` (from `.env`) |
| Data kept in | Docker volume `cato-sad_db-data` |
| Reachable from | the `server` container only (no port on your machine) |
| Tables created | automatically when the server starts |
| Dummy data | added when the database is empty (`server/app/seed.py`) |

To look inside:

```bash
docker compose exec db mysql -ucato -pcato cato
mysql> SHOW TABLES;
mysql> SELECT * FROM applicantprofile;
```

To start from an empty database (deletes everything, then dummy data is added again):

```bash
docker compose down -v
docker compose up
```

Tests do not use MySQL. They use a temporary SQLite file.

## Tables

```
user ─┬─< applicantprofile      (1 profile per applicant)
      ├─< video                 (pitch + up to 5 extra per applicant)
      ├─< recruiterfilter       (1 current filter per recruiter)
      ├─< invitation >─ user    (recruiter → applicant)
      ├─< savedsearch           (optional)
      └─< bookmark >─ user      (optional, recruiter → applicant)
```

Every other table points back to `user.id`.

### `user` – Responsibility 7 · `models/user.py`

| Field | Type | Notes |
|---|---|---|
| id | int | primary key |
| name | str | |
| email | str | unique |
| password_hash | str or null | null for seeded users until a demo password is assigned |
| role | str | `"applicant"` or `"recruiter"` |
| company_name | str or null | recruiters only |

### `applicantprofile` – Responsibility 2 · `models/applicant_profile.py`

| Field | Type | Notes |
|---|---|---|
| id | int | primary key |
| user_id | int | → `user.id`, unique (one profile per applicant) |
| university | str | |
| field_of_study | str | one of the fixed options |
| year | int | 1–5 (5 = graduated) |
| gpa | float | 0.0–4.0 |
| skills | str | comma separated, e.g. `"Python,React,SQL"` |
| internships | int | number completed |
| resume_location | str or null | storage key of the resume PDF → [uploads.md](uploads.md) |

### `video` – Responsibility 1 · `models/video.py`

| Field | Type | Notes |
|---|---|---|
| id | int | primary key |
| applicant_id | int | → `user.id` |
| file_location | str | storage key of the video → [uploads.md](uploads.md) |
| kind | str | `"pitch"` (one per applicant) or `"extra"` (up to 5) |
| duration_seconds | float | max 30 |
| created_at | datetime | set automatically |

### `recruiterfilter` – Responsibility 4 · `models/recruiter_filter.py`

| Field | Type | Notes |
|---|---|---|
| id | int | primary key |
| recruiter_id | int | → `user.id`, unique (one current filter per recruiter) |
| field_of_study | str or null | null = any field |
| min_year | int | default 1 |
| min_internships | int | default 0 |
| skills | str | required skills, comma separated |
| min_gpa | float | default 0.0 |

### `invitation` – Responsibility 8 · `models/invitation.py`

| Field | Type | Notes |
|---|---|---|
| id | int | primary key |
| recruiter_id | int | → `user.id` |
| applicant_id | int | → `user.id` |
| message | str | built by `invitation_service.build_message` |
| sent_at | datetime | set automatically |

The invitation message is: *"[Recruiter name] from [Company name] is interested in you and is sending
this invitation to [applicant email] about a job vacancy."*

### `savedsearch` – Responsibility 6 (optional) · `models/saved_search.py`

Same filter fields as `recruiterfilter`, plus `name`, and a recruiter can have many.

### `bookmark` – Responsibility 6 (optional) · `models/bookmark.py`

| Field | Type | Notes |
|---|---|---|
| id | int | primary key |
| recruiter_id | int | → `user.id` |
| applicant_id | int | → `user.id` |

## Matching does not have a table

Match scores are worked out every time a recruiter opens their results, from `applicantprofile` and
`recruiterfilter`. Nothing is stored. See [overview.md](overview.md#matching-responsibility-5).

## Fixed options

`field_of_study` and `skills` must use the values from `server/app/services/options_service.py`
(also available at `GET /api/options`). Both the applicant profile form and the recruiter filter form
use the same lists, so skills match exactly.

## Using the database in code

```python
from sqlmodel import Session, select
from app.database import get_session
from app.models import ApplicantProfile

# inside an endpoint with: session: Session = Depends(get_session)
profile = session.exec(select(ApplicantProfile).where(ApplicantProfile.user_id == user.id)).first()

profile.gpa = 3.5
session.add(profile)
session.commit()
session.refresh(profile)
```

## Changing a table

There are no migrations. Tables are only created when they do not exist yet, so after changing a model:

1. Change the class in `server/app/models/`.
2. Run `docker compose down -v` to delete the old database.
3. Run `docker compose up` – the new tables and dummy data are created.

Tell the group before changing a table that other responsibilities read (`user`, `applicantprofile`,
`video`, `recruiterfilter`).

### `authsession` — Responsibility 7 · `models/auth_session.py`

New additive table, created at startup. No existing tables need to be dropped or recreated.

| Field | Meaning |
| --- | --- |
| id | Primary key |
| user_id | Indexed foreign key to `user.id` |
| token_hash | Unique indexed SHA-256 digest of the random bearer token |
| expires_at | Expiry as a UTC datetime |

Logout deletes the current session. Expired tokens are rejected. Public user responses exclude
password hashes. Seeded users still have null passwords until assigned one with the interactive
`app.set_password` command; registrations receive a salted scrypt hash.
