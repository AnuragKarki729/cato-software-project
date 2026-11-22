# Aye Myo Myat

Owner: avocado-00 · Last updated: 2026-11-21

- GitHub login: `avocado-00`
- Student ID: 6837919
- Responsibilities: 6 (saved searches and bookmarks, optional), 7 (sign up, log in and roles)
- Detail: `docs/responsibilities-6-7.md`

## Owns

- `server/app/routers/auth.py`, `server/app/routers/saved.py`
- `server/app/services/auth_service.py`
- `server/app/models/user.py`, `server/app/models/auth_session.py`,
  `server/app/models/registration_consent.py`
- `server/app/schemas/user.py`, `server/app/schemas/saved.py`
- `server/app/set_password.py`
- `server/tests/test_auth.py`, `server/tests/test_saved.py`
- `client/src/pages/public/SignUp.jsx`, `client/src/pages/public/LogIn.jsx`
- `client/src/pages/recruiter/Saved.jsx`
- The route guards in `client/src/App.jsx` and the auth context in `client/src/context/`
- `docs/responsibilities-6-7.md`

## To do

1. Responsibility 6 is not live: `routers/saved.py` is not mounted in `server/app/main.py`, and there
   are no `saved_search` or `bookmark` models in `server/app/models/`. Make it work once the filter
   endpoints (Responsibility 4) exist; coordinate with `mumoo21`.
2. `Saved.jsx` is styled and looks finished, but it runs on `SAMPLE_SEARCHES` from
   `client/src/data/samples.js` whenever the route is missing. `VideoFeed.jsx` uses the same
   fallback. Remove both fallbacks when your endpoints are live. The screen is not done until it is
   showing real data.
2. Issue #5, saved part: hide applicants who are not open to invitations, or who blocked the
   recruiter's company, from bookmarks and saved searches. Depends on the profile fields from `NusratBegum`.
3. Add your rows to `AI-USAGE-DECLARATION.md`.

## What Nusrat's branch changed in your files

- `SignUp.jsx`, `LogIn.jsx` and `Saved.jsx` were restyled, and they now use `AuthShell` and the
  design system in `components/ui/`. Build on those versions.
- `routers/auth.py`: `public_user()` now sends an applicant to the `profile` step first, then
  `video`, then `complete`. Previously only the pitch video decided the step.

## Do not touch without asking the owner

- Profiles and matching (`NusratBegum`).
- Videos, feed and storage (`AnuragKarki729`).
- Filters and invitations (`mumoo21`).
