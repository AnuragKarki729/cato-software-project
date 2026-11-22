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
| [responsibilities-2-5.md](responsibilities-2-5.md) | Applicant profile, resume and matching |
| [client.md](client.md) | React client: pages, components, calling the API |

## Tech stack

| Part | Technology |
|---|---|
| Client | React (JavaScript) + plain CSS, run with Vite |
| Server | Python + FastAPI |
| Database | MySQL + SQLModel (Python ORM) |
| File storage | Cloudinary (videos and resume PDFs) |
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
                                  Cloudinary            "db-data" volume
                           (videos and resume PDFs)     (database files)
```

- The browser only talks to the **client** on port 5173.
- Any request starting with `/api` is forwarded by the client's dev server to the **server** on port 8000.
- Only the server talks to the **database**. MySQL is not reachable from outside Docker.
- Uploaded files go to Cloudinary through `services/storage_service.py`, which returns the URL the
  browser uses. Videos are uploaded as `resource_type="video"` and resume PDFs as `"raw"`.
- Everything is defined in `docker-compose.yml` under the project name `cato-simple`.

## Folder structure

```
Cato-SoftwareAppDev-Project/
├── server/              FastAPI app, tests, Dockerfile        → server.md
│   └── app/models/      database tables                       → database.md
│   └── app/services/storage_service.py  Cloudinary uploads
├── client/              React app, Dockerfile                 → client.md
├── docs/                these documents
├── docker-compose.yml   starts db + server + client
├── .env                 settings (not committed; ask Anurag)
└── README.md            quick start
```

## Users and roles

| Role | What they do |
|---|---|
| **Applicant** | Fills in a profile (university, field of study, year, GPA, skills, internships), uploads a resume and videos, receives invitations |
| **Recruiter** | Sets filter parameters, sees ranked applicants, views profiles and videos, sends invitations |

Every user has exactly one role. Register or log in with email/password. The server checks an
expiring bearer token and role for protected endpoints; the old account-switching header is retired.

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

The formula is written in `server/app/services/matching_service.py` and tested.
`score_breakdown()` returns the same score part by part, so a page can show where it came from.

## Current implementation status

Updated 2026-11-21, describing `nusrat-begum/resp-2-5` and branches based on it.

| # | Responsibility | State |
|---|---|---|
| 1 | Video upload and retrieval | Working. Page restyled. |
| 2 | Applicant profile and resume | Working: `/api/profiles`, the `applicantprofile` table, onboarding, My profile, Applicant profile. |
| 3 | Short-form video feed | Working. Page restyled. |
| 4 | Recruiter filter page | **Not built.** No `routers/filters.py`. The `recruiterfilter` table exists and `FindCandidates.jsx` is styled. |
| 5 | Candidate matching and ranked results | Working: `/api/matching/results`, `/results/{id}` and `/preview`, with the ranked results page. |
| 6 | Saved searches and bookmarks | **Not live.** `routers/saved.py` is written but not mounted, and the `savedsearch` and `bookmark` models do not exist. |
| 7 | Sign up, log in and roles | Working, including the onboarding step order. |
| 8 | Invitations | **Not built.** No router, service or model. |

The pages for Responsibilities 6 and 8 are styled and look finished, but they fall back to sample
data from `client/src/data/samples.js` while their endpoints are missing. See
[client.md](client.md) for which pages and what replaces them.

A client design system was added along with Responsibilities 2 and 5: `client/src/components/ui/`,
`AppHeader`, `AuthShell`, `CandidateCard`, `utils/format.js`, `utils/filters.js` and
`styles/ui.css`. Every page uses it, so reuse it rather than adding new components.

Detail per responsibility: [responsibilities-2-5.md](responsibilities-2-5.md) and
[responsibilities-6-7.md](responsibilities-6-7.md).

## Running it

```bash
docker compose up --build
```

- Web app: http://localhost:5173
- API docs: http://localhost:8000/docs
- Tests: `docker compose run --rm server uv run pytest`
- Wipe the database and files: `docker compose down -v`

For the demo, the app can be opened from other devices through a Cloudflare Tunnel
(`cloudflared tunnel --url http://localhost:5173`) or an nginx reverse proxy.
The app is only available while the PC and its Docker containers are running.
