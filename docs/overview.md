# Cato – Application Overview

Cato is a recruitment web app built around short videos and resumes. There are **no job posts**.
Applicants build a profile with their resume and a 30 second elevator pitch video. Recruiters set the
parameters of their ideal candidate, get a ranked list of matching applicants, watch their videos and
send an invitation to the ones they like.

This document explains how the whole app fits together. Each part has its own document:

| Document | What it covers |
|---|---|
| [server.md](server.md) | FastAPI server: folders, routers, services, login, endpoints |
| [database.md](database.md) | MySQL database: tables, fields, how they relate |
| [uploads.md](uploads.md) | Video and resume file storage |
| [client.md](client.md) | React client: pages, components, calling the API |

## Tech stack

| Part | Technology |
|---|---|
| Client | React (JavaScript) + Tailwind CSS, run with Vite |
| Server | Python + FastAPI |
| Database | MySQL + SQLModel (Python ORM) |
| File storage | Docker volume (Cloudflare R2 possible later) |
| Running it | Docker Compose on one PC |

## How the parts connect

```
 Browser
   │  http://localhost:5173
   ▼
┌──────────────┐   /api/...    ┌──────────────┐   SQL    ┌──────────────┐
│    client    │ ────────────► │    server    │ ───────► │      db      │
│ React + Vite │  (proxied)    │   FastAPI    │          │   MySQL 8.4  │
│  port 5173   │               │  port 8000   │          │ (no host port)│
└──────────────┘               └──────┬───────┘          └──────┬───────┘
                                      │ files                   │
                                      ▼                         ▼
                              "uploads" volume          "db-data" volume
                           (videos and resumes)        (database files)
```

- The browser only talks to the **client** on port 5173.
- Any request starting with `/api` is forwarded by the client's dev server to the **server** on port 8000.
- Only the server talks to the **database**. MySQL is not reachable from outside Docker.
- Uploaded files are saved in the `uploads` Docker volume and served back by the server at `/api/files/...`.
- Everything is defined in `docker-compose.yml` under the project name `cato-sad`.

## Folder structure

```
Cato-SoftwareAppDev-Project/
├── server/              FastAPI app, tests, Dockerfile        → server.md
│   └── app/models/      database tables                       → database.md
│   └── app/services/storage_service.py  file storage          → uploads.md
├── client/              React app, Dockerfile                 → client.md
├── docs/                these documents
├── docker-compose.yml   starts db + server + client
├── .env.example         settings (copy to .env)
└── README.md            quick start
```

## Users and roles

| Role | What they do |
|---|---|
| **Applicant** | Fills in a profile (university, field of study, year, GPA, skills, internships), uploads a resume and videos, receives invitations |
| **Recruiter** | Sets filter parameters, sees ranked applicants, views profiles and videos, sends invitations |

Every user has exactly one role. Until real login is built, the navbar's **"Acting as (dev)"**
dropdown lets you act as any dummy user (see [server.md](server.md#logging-in-for-now)).

## User flow

**Applicant:** Sign up → Onboarding (profile + resume, then pitch video) → My profile → Invitations

**Recruiter:** Sign up → Find candidates (set filters, see ranked results) → Applicant profile →
Invite → Sent invitations

## The 8 responsibilities

Each group member owns one or more responsibilities **end to end**: the React page(s), the FastAPI
endpoints and the database table(s). Search the code for `Responsibility N` to find all of its files.

| # | Responsibility | Table(s) | Endpoints | Pages |
|---|---|---|---|---|
| **Group A – Applicant profile and videos** |||||
| 1 | Video upload and video retrieval | `video` | `/api/videos` | Onboarding (step 2), My profile |
| 2 | Applicant profile and resume | `applicantprofile` | `/api/profiles` | Onboarding (step 1), My profile, Applicant profile |
| 3 | Short-form video feed *(optional)* | reads `video` | `/api/feed` | Video feed |
| **Group B – Recruiter search and matching** |||||
| 4 | Recruiter filter page | `recruiterfilter` | `/api/filters` | Find candidates (filter form) |
| 5 | Candidate matching and ranked results | reads `applicantprofile`, `recruiterfilter` | `/api/matching` | Find candidates (results) |
| 6 | Saved searches and bookmarks *(optional)* | `savedsearch`, `bookmark` | `/api/saved` | Saved |
| **Group C – Accounts and invitations** |||||
| 7 | Sign up, log in and roles | `user` | `/api/auth` | Sign up, Log in |
| 8 | Invitations | `invitation` | `/api/invitations` | Invitations, Sent invitations, Invite button |

## Matching (Responsibility 5)

There is no free-text search. Recruiters pick parameters from fixed options, and matching runs in two steps:

1. **Hard filters** – remove applicants whose field of study does not match, whose year is below the
   minimum, whose GPA is below the minimum, or who have fewer internships than the minimum.
2. **Match score (0–100)** for everyone left:

   `60 × (required skills the applicant has ÷ total required skills) + 20 × (GPA ÷ 4.0) + 20 × (min(internships, 3) ÷ 3)`

   If no skills are required, the skills part counts as the full 60. Results are sorted highest first.

The formula is already written in `server/app/services/matching_service.py` and tested.

## What is built and what is not

| Built (ready to use) | Not built yet |
|---|---|
| Docker setup (db, server, client) | All feature endpoints – they return **501 Not built yet (Responsibility N)** |
| All 7 database tables + dummy data | All feature pages – they show a dashed **Not built yet** box |
| Temporary dev login + role checks | Real sign up / log in |
| Fixed options (`/api/options`) | |
| File storage (save, get link, delete) | |
| Matching formula + invitation message | |
| Navbar, page routes, `api.js` helpers | |
| Tests for all of the above | |

## Running it

```bash
cp .env.example .env
docker compose up --build
```

- Web app: http://localhost:5173
- API docs: http://localhost:8000/docs
- Tests: `docker compose run --rm server uv run pytest`
- Wipe the database and files: `docker compose down -v`

For the demo, the app can be opened from other devices through a Cloudflare Tunnel
(`cloudflared tunnel --url http://localhost:5173`) or an nginx reverse proxy.
The app is only available while the PC and its Docker containers are running.
