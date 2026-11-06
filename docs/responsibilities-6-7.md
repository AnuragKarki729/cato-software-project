# Responsibilities 6 and 7

Owner: **Aye Myo Myat (6837919)**

## Implemented

| Feature | Code | Behavior |
| --- | --- | --- |
| Signup and login | `routers/auth.py`, `schemas/user.py`, SignUp/LogIn pages | Validated role, normalized email, duplicate checks, recruiter company required, salted password hashes |
| Sessions and logout | `services/auth_service.py`, `models/auth_session.py`, AuthContext | Random bearer token, digest stored in DB, 24-hour expiry, server-side revocation |
| Access by role | App route guards, existing server auth dependencies | Guests must log in; applicant/recruiter pages are separated; old ID-header impersonation removed |
| Onboarding routing | `/auth/me`, `homeFor()` | Uses existing applicant profile, resume and pitch to choose next page |
| Saved searches | `routers/saved.py`, `schemas/saved.py`, Saved page | Create/list/delete named fixed filters; run restores current filter in DB |
| Bookmarks | Saved page, BookmarkButton, saved endpoints | Add/list/remove applicant bookmarks; duplicate POST returns existing bookmark; only owner can delete |
| Existing demo accounts | `app/set_password.py` | Assign password interactively without deleting user/profile/video data; revoke existing sessions |

## Integration boundaries

- Cloudinary, video upload/retrieval, matching formula, and shared profile tables are reused.
- This branch does not complete responsibilities 2, 4, 5 or 8. Their pages/endpoints are still
  placeholders on the starting main branch.
- `/find` receives a saved-search confirmation and the applied parameters in router state;
  the actual recruiter filter form still belongs to Responsibility 4. It should load the
  persisted `/filters/me` values when implemented.
- BookmarkButton is inserted above the existing applicant-profile placeholder. The profile
  content remains Responsibility 2/1/8; use the same button after replacing that placeholder.
- No existing table definitions are modified. The new authsession table is created on startup.
  **Do not use `docker compose down -v` to install this branch.**
- Seeded accounts do not have passwords by default. Register a new account, or run the password
  command in README to use an existing seeded account for the demo.
- Browser tokens use sessionStorage, so refresh keeps login in the same tab. Closing the tab
  clears the browser copy; the server token expires independently after 24 hours. Log out
  explicitly to revoke it immediately.

## Run / test

```bash
cp .env.example .env                  # first setup only; preserve an existing .env
# Keep your existing Cloudinary settings.
docker compose up --build
docker compose run --rm server uv run pytest
```

Web: http://localhost:5173. Existing Dockerfiles use `--legacy-peer-deps` for the video trimmer.
Local client install: `npm ci --legacy-peer-deps`; build: `npm run build`.
Server tests without Docker: `cd server`, `uv sync --frozen`, `uv run pytest`.
Tests use temporary SQLite only; the application Compose database remains MySQL.

## Demo / proof-of-work checklist

1. Open `/saved` while logged out: redirected to Log in.
2. Register a recruiter with a company name: opens Find candidates.
3. Open Saved. Create a named search with fixed field/year/GPA/skill choices.
4. Refresh: the saved search remains. Run it: current DB filter is updated and Find candidates
   shows the applied-search confirmation.
5. Choose an applicant and bookmark them; refresh and open their profile; remove the bookmark.
6. Delete a saved search. Its card disappears and stays deleted after refresh.
7. Log out. The old bearer token no longer works, including in direct API requests.
8. Log in with a wrong password: show the error. Correct it: log in successfully.
9. Register an applicant: opens onboarding. Opening `/saved` redirects to their own portal.
10. Show the automated tests: other recruiters cannot read/delete/run your saved items,
    applicant/guest requests are denied, invalid filters are rejected, and video tests still pass.

For the progress report use branch `aye-myo-myat/resp-6-7`, its commits, and your recorded demo.
The repository's existing deployment workflow runs only for main; this branch does not deploy.

## Validation performed

- `uv run pytest -q --tb=short`: **37 passed**, including existing video, matching and storage tests.
- `npm run build`: successful production build. Vite reports the existing video-trimmer bundle
  exceeds its 500 kB warning threshold.
- Headless Chromium against the real local React client and FastAPI server: guest redirect,
  recruiter signup, saved-search create/reload/run/delete, bookmark add/remove from a profile,
  wrong-role redirect, logout token revocation, bad/good password login, applicant signup and
  onboarding redirect, and no horizontal overflow at 390 px width all passed.
- Browser verification used a throwaway SQLite database and local storage, not production data
  or Cloudinary. Docker/MySQL startup could not be exercised because Docker is unavailable in
  the coding environment. The existing Compose files were not changed.
