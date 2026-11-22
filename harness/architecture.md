# Architecture

Owner: AnuragKarki729 · Last updated: 2026-11-21

Detailed references: `docs/server.md`, `docs/database.md`, `docs/client.md`, `docs/overview.md`.
This file is the short map, plus the list of places where those documents are out of date.

It describes the code on `nusrat-begum/resp-2-5` and on branches based on it: `main` plus
Responsibilities 2 and 5 and a full UI pass. Until that pull request is merged, `main` itself has
neither.

## Services (docker-compose.yml, project name `cato-simple`)

| Service | Tech | Port | Notes |
|---|---|---|---|
| `client` | React + Vite, Node 20 | 5173 | Proxies `/api` to the server (`VITE_API_TARGET`) |
| `server` | FastAPI, Python 3.13 | 8000 | API docs at `/docs`; live reload from `server/app` |
| `db` | MySQL 8.4 | none exposed | Only the server connects to it |

Videos and resumes are stored in Cloudinary through `server/app/services/storage_service.py`.

## Layout

```
server/app/
  main.py            creates the app, creates tables, seeds, mounts routers
  config.py          settings from .env; MAX_VIDEO_SECONDS, MAX_EXTRA_VIDEOS
  database.py        engine and get_session()
  seed.py            demo users, applicant profiles and a demo recruiter filter
  set_password.py    set a password for a seeded user
  models/            one SQLModel table per file
  schemas/           request and response shapes
  routers/           API endpoints, one file per feature
  services/          auth, matching, options, storage
server/tests/        pytest (uses SQLite, no MySQL needed)
server/requirements.txt   what the server Docker image installs
client/src/
  App.jsx            routes and role guards
  api.js             API helpers
  components/        shared parts; components/ui/ is the design system
  data/samples.js    placeholder data for screens whose backend is not built
  pages/public|applicant|recruiter/   one file per page
  context/, utils/, styles/
docs/                technical documentation
harness/             agent and team context (this folder)
pyproject.toml, uv.lock   root uv project for running the server locally
```

## API surface

Mounted in `main.py`: `auth`, `videos`, `feed`, `options`, `profiles`, `matching`.

| Prefix | Endpoints | Responsibility |
|---|---|---|
| `/api/auth` | `POST /signup`, `POST /login`, `GET /me`, `POST /logout` | 7 |
| `/api/videos` | `POST ""`, `GET /applicant/{id}`, `GET /{video_id}`, `DELETE /{video_id}` | 1 |
| `/api/feed` | `GET ""` (applicant feed), `GET /explore`, `GET /fields` (recruiter, no filters) | 3 |
| `/api/options` | `GET ""` (universities, fields of study, skills, years) | shared |
| `/api/profiles` | `GET /me`, `PUT /me`, `PUT /me/draft`, `POST /me/resume`, `DELETE /me/resume`, `GET /{applicant_id}` | 2 |
| `/api/matching` | `GET /results`, `GET /results/{applicant_id}`, `GET /preview` | 5 |

`routers/saved.py` (Responsibility 6) has its endpoints written but is **not mounted** in `main.py`,
and its `savedsearch` and `bookmark` models do not exist. There are no routers for filters
(Responsibility 4) or invitations (Responsibility 8).

## Tables that exist

`user`, `authsession`, `registrationconsent`, `video`, `applicantprofile`, `recruiterfilter`.

- `applicantprofile` allows partly filled rows (the "Save draft" step). `details_complete` means
  matching can use the row; `onboarding_complete` also requires the resume.
- `recruiterfilter` is Responsibility 4's table. It was added by Responsibility 5 because matching
  reads it; the filter page and its save endpoints are still Responsibility 4's work.

## Client design system (added with Responsibilities 2 and 5)

Shared, and used by every page including those outside Responsibilities 2 and 5:

| Where | What |
|---|---|
| `components/ui/primitives.jsx` | `Button`, `IconButton`, `Badge`, `Tag`, `Avatar`, `Logo`, `SelectField`, `TextField`, `Checkbox`, `Toast`, `Dialog`, `ConfirmDialog` |
| `components/ui/` | `MatchScore` and `ScoreBreakdown`, `ResumeUpload`, `ResumeViewer`, `VideoPoster`, `VideoViewer`, `VideoRecorder`, `SearchSelect` |
| `components/` | `AppHeader`, `AuthShell`, `CandidateCard`, `useCandidateActions`, `OnboardingStepper`, `useVerticalPager` |
| `utils/format.js` | `yearLabel`, `gpaLabel`, `internshipsLabel`, `initials`, `firstName`, `fileSize`, `duration`, `score`, `uploadedAgo`, `shortDate` |
| `utils/filters.js` | `EMPTY_FILTER`, `toQuery`, `fromSearch`, `fromApi`, `carry` |
| `styles/ui.css` (356 lines) | the design system |
| `styles/pages.css` (317), `styles/public.css` (158) | page styles |

Reuse these rather than writing new ones. All are imported through `styles/index.css`.

### Video pages: fixed height, one card at a time (Responsibilities 1 and 3)

Every page built around a video follows the same rules. Do not reimplement them.

- **9:16 for every video.** Containers carry `aspect-ratio: var(--ui-video-ratio)` and the
  `<video>` uses `object-fit: contain`, so a landscape recording is shown whole with empty space
  above and below it, never bars at the sides.
- **The page does not scroll.** The outer element is `height: 100dvh; min-height: 0; overflow: hidden`
  (`min-height` because `.ui-app` asks for `100vh`, which is taller than `100dvh` on a phone).
  A wheel or a swipe moves to the next card; it does not move the page. Rails and panels beside
  the video may scroll on their own, so the video itself keeps its place.
- **One pager.** `components/useVerticalPager.jsx` holds the wheel, swipe, arrow-key and chevron
  behaviour and the 420 ms cooldown, with `useSmallScreen()` beside it. `VideoViewer`,
  `recruiter/RankedResults.jsx` and `applicant/VideoFeed.jsx` all use it, so a scroll on a desktop
  and a swipe on a phone mean the same thing on every screen.
- **Chevrons sit outside the frame**, above and below, and keep their place when there is nowhere
  to go (`.is-off` is `visibility: hidden`, not `display: none`), so the video never shifts.
- **Small screens are treated as phones** at `max-width: 760px`, in CSS and in `useSmallScreen`
  alike: a tap starts and stops the video, and while it is stopped the candidate's details sit
  over it. Keep the two numbers equal.
- **Nothing autoplays, and nothing is muted.** A browser refuses to start sound until the page
  has been interacted with, so an autoplaying clip could only ever have been a silent one. The
  tap that starts it is the permission, so it plays with its sound the first time and every
  time after. The one exception is the viewer dialog, which is opened by a click and so may
  start on its own. `muted` is kept only on the decorative thumbnails — the blurred slivers
  beside a clip, and the "up next" posters — which are stills and never play.
- **Text over a video is compact and never scrolls.** Overlay panels are clipped, not scrollable;
  long lists are capped in the component (`+N more`) rather than left to overflow.

## Placeholder data: `client/src/data/samples.js`

Screens whose backend is not built show sample content from the Figma so the UI can be demonstrated.
Each page calls the real endpoint first and falls back only when the route is missing
(`routeMissing()` checks for 404, 405 and 501).

| Page | Falls back to | Waiting on |
|---|---|---|
| `applicant/Invitations.jsx` | `sampleInvitations()` | Responsibility 8 |
| `recruiter/SentInvitations.jsx` | `SAMPLE_SENT` | Responsibility 8 |
| `recruiter/Saved.jsx` | `SAMPLE_SEARCHES` | Responsibility 6 |

**A screen that looks finished may be running on this fake data.** Delete the file and the fallbacks
once the real endpoints exist. For the owners of Responsibilities 6 and 8 this is the work itself,
not a shortcut to keep.

## Environment variables (`.env`, never committed)

`MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `DATABASE_URL`, `STORAGE_DIR`,
`SEED_DUMMY_DATA`, `VITE_API_TARGET`, `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
`CLOUDINARY_URL`, `OPEN_ROUTER_API_KEY_2_CLASS_KEY` (resume parsing; `OPEN_ROUTER_API_KEY_1` is the
fallback), optionally `OPENROUTER_MODEL`.

Get the values from Anurag. There is no `.env.example` in the repository.

## Seed data

`seed.py` runs on every start unless `SEED_DUMMY_DATA=false`. The demo password for every seeded
account is `password1`.

- Eight demo applicants with complete profiles (`lin@`, `kittipat@`, `ploy@`, `ravi@`, `mei@`,
  `thanakorn@`, `sara@` and `arif@cato.test`), so ranked results have candidates to rank.
- `anurag@cato.test` has a profile but no resume, so onboarding still asks for one.
- `nusrat@cato.test` has no profile, so onboarding can be shown from the start.
- `siwakorn@cato.test` has a saved recruiter filter, so ranked results work before the filter page exists.

## Authentication

Email and password login. Protected endpoints need a bearer token (24 hours, kept in the browser
tab's session storage). Use `Depends(get_current_user)`, `get_current_applicant` or
`get_current_recruiter`.

`public_user()` in `routers/auth.py` decides where an applicant lands after login:
`profile` (no complete profile and resume) → `video` (no pitch) → `complete`.

## Known documentation drift (checked 2026-11-21)

`README.md` and `docs/` describe things that are not in the repository. Trust the code.

| Document says | Actual state |
|---|---|
| `.github/workflows/deploy.yml` runs tests and pushes images to GHCR | No `.github/` folder exists |
| `docker-compose.prod.yml` for production | File does not exist |
| `cp .env.example .env` | No `.env.example` exists |
| `docs/uploads.md` | File does not exist |
| `server/pyproject.toml` | `pyproject.toml` is at the repository root; the image uses `server/requirements.txt` |
| Files are stored in a Docker `uploads` volume and served at `/api/files/...` | They are stored in Cloudinary |
| Compose project name `cato-sad` | It is `cato-simple` |
| `routers/filters.py`, `routers/invitations.py`, `services/invitation_service.py` | Not created yet |
| Models `saved_search.py`, `bookmark.py`, `invitation.py` | Not in `server/app/models/` |
| Tests run with `uv run pytest` | `pytest` is not declared in `pyproject.toml` or `requirements.txt` |
| Styling is Tailwind only, with no per-page CSS | There is no Tailwind. Styling is plain CSS in `client/src/styles/` |
| The pitch video is 30 seconds | `config.py` allows 20; the supervisor asks for 60 in issue #3 |

Remove a row when the document or the code is fixed.
