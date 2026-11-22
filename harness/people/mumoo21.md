# Siwakorn P.

Owner: mumoo21 · Last updated: 2026-11-21

- GitHub login: `mumoo21`
- Student ID: 6600139
- Responsibilities: 4 (recruiter filter page), 8 (invitations)

## Owns

- `server/app/routers/filters.py` (to create)
- `server/app/models/recruiter_filter.py` (already exists; added with Responsibility 5 because matching reads it)
- `server/app/routers/invitations.py`, `server/app/services/invitation_service.py`,
  `server/app/models/invitation.py` (all to create)
- `client/src/pages/recruiter/FindCandidates.jsx`
- `client/src/pages/applicant/Invitations.jsx`, `client/src/pages/recruiter/SentInvitations.jsx`
- The Invite button on `client/src/pages/recruiter/ApplicantProfile.jsx` (the rest of that page
  belongs to `NusratBegum`)

## To do

1. Start a fresh branch from the latest `origin/main`. The existing `feature/recruiter-filter` branch
   has no commits and predates the Responsibility 2 and 5 merge.
2. Responsibility 4: build the filter endpoints (`GET` and `PUT /api/filters/me`) and the filter form.
   Use the fixed options from `GET /api/options`. Read `docs/responsibilities-2-5.md` first: matching
   already reads `recruiterfilter`, and `FindCandidates.jsx` was already restyled on `main`.
3. Responsibility 8: build invitations (model, service, router, both pages, Invite button).
4. Issue #4: accept and decline with an optional reason, 14 day expiry, and statuses Sent, Viewed,
   Accepted, Declined and Expired. Build this into Responsibility 8 from the start.
5. `Invitations.jsx` and `SentInvitations.jsx` are styled and look finished, but they run on
   `sampleInvitations()` and `SAMPLE_SENT` from `client/src/data/samples.js` whenever the route is
   missing. Replace those fallbacks with your real endpoints; the screens are not done until they
   show real data.
6. Tell `avocado-00` when the filter endpoints exist; Responsibility 6 depends on them.
7. Add your rows to `AI-USAGE-DECLARATION.md`.

## What Nusrat's branch changed in your files

- `FindCandidates.jsx`, `Invitations.jsx`, `SentInvitations.jsx` and the Invite button on
  `ApplicantProfile.jsx` were restyled. Build on those versions.
- `models/recruiter_filter.py` already exists with the template's fields: `recruiter_id`,
  `field_of_study`, `min_year`, `min_internships`, `skills`, `min_gpa`. Your endpoints read and
  write this table; matching already reads it.
- `utils/filters.js` has `EMPTY_FILTER`, `toQuery`, `fromSearch`, `fromApi` and `carry` for filter
  state, and `GET /api/matching/preview` counts the matches for a filter. Reuse these.
- `seed.py` gives `siwakorn@cato.test` a saved filter, so ranked results can be demonstrated before
  your page exists.

## Do not touch without asking the owner

- Matching and profiles (`NusratBegum`).
- Auth and saved (`avocado-00`).
- Videos, feed and storage (`AnuragKarki729`).
