# Responsibilities 6 and 7 — Aye Myo Myat (6837919)

## Scope and ownership

This branch implements **6: Saved searches and bookmarks** and **7: Signup, login and roles**.
It extends the existing React/Tailwind, FastAPI, SQLModel and Docker project.
Cloudinary, video uploading, profile editing, filter editing, the matching algorithm, invitations,
and the video feed remain with their existing owners.

## Responsibility 6

- Saved displays full-width saved-search rows, followed by bookmarked candidate cards.
- Saved searches: create, list, delete, and run. Run checks ownership and restores the saved
  parameters to the recruiter's current filter before opening Find candidates.
- SaveSearchButton is a small addition to Find candidates. It accepts a `filters` prop for the
  teammate's form, or loads `/saved/current-filter` when none is passed.
- The filter form itself is still a teammate's placeholder on the starting main branch.
  Without a current filter, saving reports that filters need to be set first. There is no
  second filter form on Saved and no invented filter values.
- Bookmarks: add via BookmarkButton on a candidate profile; list and remove via Saved.
  Only the recruiter who owns a saved item can access/delete/run it. Repeated bookmark POSTs
  return the existing bookmark; MySQL row locking serializes duplicate attempts.
- Candidate cards read real profile/skill/pitch data. Scores and matches use the existing
  matching_service functions unchanged. Video URLs use the existing storage service unchanged.
- No score is shown if there is no current filter or completed profile. Candidates who fail
  the current hard requirements remain bookmarked but are clearly labelled.
- The player on a bookmarked card plays/pauses the applicant's actual pitch. Missing/broken
  videos have an honest unavailable state. Nothing is uploaded or copied by this feature.
- Invite calls the existing Responsibility 8 endpoint. While it returns 501, the page shows
  “Invitations are not available yet” and does not pretend an invitation was sent.
- Saved-search match counts are computed from real profiles. The design's saved dates are
  omitted because the existing savedsearch model has no timestamp. No dates are fabricated.

## Responsibility 7

- Signup validates name, normalized email, password, role, recruiter company and applicant
  sharing consent. Signup passwords need 8–128 characters including a number, matching the
  supplied desktop design. Applicant consent starts unchecked and is required.
- Passwords use salted scrypt hashes. Login returns a random 24-hour bearer token; only its
  SHA-256 digest is stored. Logout revokes the current token on the server.
- AuthContext restores login on refresh in the same tab. Tokens are in sessionStorage.
  Closing a tab removes its browser copy; server expiry remains independent.
- API helpers attach the token, preserve FormData uploads, and clear expired sessions on 401.
- Client routes and server dependencies separately enforce applicant/recruiter access.
  The old X-User-Id impersonation header and public dev-user listing are retired.
- Recruiters go to Find candidates. Applicants go to profile/resume onboarding, pitch onboarding,
  or My profile based on the existing profile, resume and pitch records.
- Responsive account navigation shows the user's initials, name, role/company and logout.
  Small screens use an account menu to keep all role links and logout accessible.
- The notification icon links to the role's existing invitations page; it adds no notification system.
- Seeded accounts have no default password. Assign one interactively with the command in README;
  their existing profiles and uploaded media are retained.

## Design references and boundaries

Implemented from the user's supplied desktop/mobile screenshots:

- `184203`: desktop signup, split dark panel + role cards + form.
- `184150`: desktop login, split dark panel + form.
- `184430`: mobile signup; `184423`: mobile login.
- `184521`: desktop Saved, search rows and candidate cards.

The existing brand palette is reused. Inter is bundled locally with its license, so the
existing font token renders correctly without a network font request. Shared Icon, Brand and
AuthLayout components avoid duplicating the layout. Auth forms and Saved get the required
page width without changing other pages' content layouts.

The auth sidebar pitch card is a static illustration, not a fabricated playable user video.
Actual bookmarked pitch cards use the video owner's real stored media URLs.

Intentional differences from the screenshots:

- Sample names, dates, counts and scores are never hardcoded into product pages.
- Saved dates are omitted when unavailable in the schema.
- Signup records the applicant's sharing consent. The screenshot's claims about withdrawal,
  deletion and Terms/PDPA pages are not shown as completed controls: that profile/privacy
  workflow and the notice text must be supplied by its owner. No legal-compliance claim is made.
- The current screenshot set has no mobile Saved frame; its layout is adapted to stack cleanly.

No onboarding, profile, invitations, matching-results or feed screen has been rebuilt for this
contribution. Only the necessary save/bookmark hooks and account navigation are integrated.

## Database

Existing user, profile, savedsearch, bookmark, recruiterfilter and video schemas are unchanged.
Two additive tables are created automatically at startup:

- authsession: user_id, token_hash, expires_at, plus primary key.
- registrationconsent: user_id, consent scope, notice version and accepted timestamp, plus primary key.

Consent is saved in the same transaction as applicant registration. The profile/privacy owner
can use this record for its sharing preferences/withdrawal flow. This branch does not implement
account deletion, consent withdrawal, data export or legal notice pages.

**Keep your existing .env, Cloudinary values and Docker volumes. No database wipe is needed.**

## Validation

- **40 backend tests passed**, including existing video/storage/matching tests.
- React production build passed. The pre-existing video-trimmer bundle still triggers Vite's
  warning about a JavaScript chunk over 500 kB.
- Chromium checks against the real local React and FastAPI apps passed: signup/consent,
  applicant/recruiter routing, role guards, bad-password error, logout revocation, saved
  filters/counts/scores, save/run/reload/delete, bookmark removal, pitch playback and pause,
  and correct handling of the unfinished invitation endpoint.
- Checked no horizontal overflow at 360, 768, 1024 and 1224 pixels.
- Preview screenshots use fictional local accounts and a generated two-second test video.
  The temporary DB supplies current filters because the teammate's filter form is not built.
  No preview fixtures or fictional candidate records are inserted into the shipped app.
- Docker/MySQL startup itself is unverified here because Docker is unavailable. Compose remains unchanged.

## Run and demo

```bash
# First setup only; do not overwrite an existing .env.
cp .env.example .env
docker compose up --build
# http://localhost:5173
docker compose run --rm server uv run pytest
```

1. Register an applicant (sharing consent required) and a recruiter (company required).
2. Check each role's redirects and forbidden-page behavior.
3. Once Responsibility 4 saves a current filter, use Save search to name it.
4. Open Saved, run it, return and refresh. Delete a saved search.
5. Bookmark an applicant from their profile. View/remove the bookmark in Saved.
6. Play the stored pitch; inspect the actual skill matches and score.
7. Log out and show that the old token is rejected.

Proof of work: branch `aye-myo-myat/resp-6-7` and its feature commits. GitHub publishing still
requires a connection with write access; the downloadable bundle retains the local history.
