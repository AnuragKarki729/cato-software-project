# Nusrat Begum

Owner: NusratBegum · Last updated: 2026-11-21

- GitHub login: `NusratBegum`
- Student ID: 6638009
- Responsibilities: 2 (applicant profile and resume), 5 (candidate matching and ranked results)
- Detail: `docs/responsibilities-2-5.md`

## Owns

- `server/app/routers/profiles.py`, `server/app/routers/matching.py`
- `server/app/services/matching_service.py`
- `server/app/models/applicant_profile.py`
- `server/app/schemas/profile.py`, `server/app/schemas/matching.py`
- `server/tests/test_profiles.py`, `server/tests/test_matching.py`
- `client/src/pages/applicant/OnboardingProfile.jsx`
- `client/src/pages/applicant/MyProfile.jsx` (except the video sections, which belong to `AnuragKarki729`)
- `client/src/pages/recruiter/ApplicantProfile.jsx` (except the Invite button, which belongs to `mumoo21`)
- `client/src/pages/recruiter/RankedResults.jsx`
- `docs/responsibilities-2-5.md`

## Also built (beyond Responsibilities 2 and 5)

The UI pass on your branch created shared work that the whole team now depends on:

- The design system: `components/ui/primitives.jsx`, `MatchScore.jsx`, `ResumeUpload.jsx`,
  `ResumeViewer.jsx`, `VideoPoster.jsx`, `AppHeader.jsx`, `AuthShell.jsx`, `CandidateCard.jsx`,
  `useCandidateActions.jsx`, `utils/format.js`, `utils/filters.js`, `styles/ui.css`, `pages.css`,
  `public.css`.
- `data/samples.js`, placeholder data for the Invitations, Sent invitations and Saved screens.
  It belongs to Responsibilities 6 and 8; hand it over to `avocado-00` and `mumoo21` to replace.
- Restyled pages owned by others, and small changes to `routers/auth.py`, `seed.py`,
  `storage_service.py` and `tests/conftest.py`.

Treat the design system as shared from now on: changes to it affect everyone's pages.

## To do

0. Open a pull request from `nusrat-begum/resp-2-5` into `main` from your own account. It is the
   evidence of your work on Responsibilities 2 and 5.
1. Issue #6: your `score_breakdown()` and `MatchScore`/`ScoreBreakdown` already show a per-criterion
   breakdown, so the code is largely done. Wait for the supervisor's answer on whether the criteria
   and weights must change to match the issue's example (see `change-requests.md`), then adjust.
2. Issue #5, profile part: add the "Open to invitations" toggle and the blocked-companies list to the
   profile (model, schema, endpoints, UI). Do this first; other members' parts read these fields.
3. Issue #5, matching part: exclude hidden and blocking applicants from matching and ranked results.
4. Add your rows to `AI-USAGE-DECLARATION.md`.

## Do not touch without asking the owner

- `server/app/models/recruiter_filter.py` and the filter page `FindCandidates.jsx` (`mumoo21`).
  The branch `nusrat-begum/resp-2-5` added the model and edited that page; from now on changes go
  through `mumoo21`.
- Auth, login, sign-up and `Saved.jsx` (`avocado-00`).
- Videos, feed and storage (`AnuragKarki729`).
- Invitations pages (`mumoo21`).
