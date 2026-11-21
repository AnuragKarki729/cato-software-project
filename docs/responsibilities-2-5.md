# Responsibilities 2 and 5 — Nusrat Begam (6638009)

This branch implements **2: Applicant profile and resume** and **5: Candidate matching and ranked
results**, following the project document and the Figma file *Cato – Product Design (Tailwind)*,
page "3 · Screens + prototype" (frames P4a, P5, P8, P9 and the Resume viewer / Draft saved overlays).

## Responsibility 2 — Applicant profile and resume

| | |
|---|---|
| Pages | `pages/applicant/OnboardingProfile.jsx` (P4a; also `/profile/edit`), `pages/applicant/MyProfile.jsx` (P5), `pages/recruiter/ApplicantProfile.jsx` (P9; also `/profile/preview` for "Preview as recruiter") |
| Endpoints | `routers/profiles.py` |
| Table | `applicantprofile` (`models/applicant_profile.py`) |

- Every answer comes from the fixed lists in `GET /api/options` (universities, fields of study,
  years, internships, 16 skills, max 10 skills). The server rejects anything else with 422.
- **Save draft** (`PUT /profiles/me/draft`) keeps a half-filled form. **Continue** (`PUT /profiles/me`)
  needs every field and at least one skill.
- The resume is PDF only (file name/type *and* the `%PDF-` header are checked), 5 MB max, and is
  uploaded as soon as it is chosen (drag and drop or browse). Replacing it deletes the old file.
- Resumes reuse Responsibility 1's `storage_service` with `resource_type="raw"` (videos keep the
  default `"video"`), so Cloudinary serves them as `application/pdf` and the in-app viewer shows them inline.
- `GET /auth/me` now reports `onboarding_step`: `profile` until the details *and* the resume are saved,
  then `video` until there is a pitch, then `complete`.
- Recruiters never receive the applicant's email from the profile endpoint.

## Responsibility 5 — Candidate matching and ranked results

| | |
|---|---|
| Page | `pages/recruiter/RankedResults.jsx` (P8) |
| Endpoints | `routers/matching.py` |
| Logic | `services/matching_service.py` — `passes_hard_filters`, `match_score`, `score_breakdown`, `rank` |

- Step 1 drops applicants whose field of study, year, GPA or internships miss the recruiter's minimum
  (incomplete profiles are never matched). Step 2 scores the rest:
  `60 × skills matched ÷ skills required + 20 × GPA ÷ 4 + 20 × min(internships, 3) ÷ 3`.
  The document's example (Python and React of three, GPA 3.2, one internship) gives **62.7**.
- Results are sorted by score, then GPA, then newest profile, and returned five at a time
  (`offset`/`limit`) for the **Load more** button.
- `GET /matching/results/{applicant_id}` gives the "#N for your search" badge and the score
  breakdown on the candidate profile.
- Every matching endpoint also takes the filter as query parameters (`field_of_study`, `min_year`,
  `min_gpa`, `min_internships`, `skills=...`). Find candidates sends them, so Find → Ranked results →
  Candidate profile works before Responsibility 4 saves filters; without them the saved filter is used.
- `GET /matching/preview` returns the live funnel counts shown on Find candidates.
- States: loading skeletons, "Set up your search first" (no filter yet), "No candidates match", errors.
- Unit tests: `server/tests/test_matching.py` (formula, hard filters, ties, API) and
  `server/tests/test_profiles.py` (validation, drafts, resume rules, permissions).

## Full Figma UI

Every screen in the Figma is implemented: Landing, Sign up, Log in, both onboarding steps, My profile,
Invitations, Find candidates (and its cleared state), Ranked results, Candidate profile, Invite dialog,
Sent invitations, Video feed (recruiter and applicant views) and Saved, with the mobile layouts.
Teammates' logic is kept as it was (sign-up/log-in, pitch upload and trimming, the feed); only the UI changed.
The Cato logo always goes to the landing page.

Where a teammate's endpoint is not live yet, the button calls the planned route and the toast says it is
not connected, and list pages (Invitations, Sent invitations, Saved) show the design's sample content with
a one-line note. The samples are in `client/src/data/samples.js`; delete that file once the routes exist.

## Where teammates plug in

- **Responsibility 4 (filters)** — `models/recruiter_filter.py` is the template's table contract, added
  here because matching reads it. The filter page and `GET/PUT /filters/me` are still Responsibility 4.
  Until then, `seed.py` gives `siwakorn@cato.test` a demo filter (same as the Figma results screen).
- **Responsibility 6 (bookmarks, saved searches)** and **8 (invitations)** — the Bookmark, Save search
  and Invite buttons on the results and candidate pages are in place but disabled, with a tooltip.
- **Responsibility 1 (videos)** — My profile shows the pitch and extra videos, Replace goes to the
  existing video page and Delete uses `DELETE /api/videos/{id}`. "Add video" is disabled until extra
  video uploads exist.
- **Shared UI** — `components/AppHeader.jsx` (Figma navbar + mobile tab bar) and
  `components/ui/*` with `styles/ui.css` (the design-system tokens as plain CSS, all classes prefixed
  `ui-`, so existing `.btn`/`.card` styles are untouched). Any page can use them.

## Demo data

`seed_demo_profiles()` runs on every start and only adds what is missing: eight demo applicants with
complete profiles (password `password1`), a profile without a resume for `anurag@cato.test`, and the demo
filter above. `nusrat@cato.test` has no profile, so onboarding can be shown from the start.

## Demo checklist

1. Log in as `nusrat@cato.test` → onboarding. Try **Continue** empty (errors), fill the form, pick
   skills, drop a PDF, open it in the viewer, **Save draft**, then **Continue to pitch video**.
2. **My profile**: details, skills, resume (Replace/remove), **Edit profile**, **Preview as recruiter**.
3. Log in as `siwakorn@cato.test` → `/results`: ranked list, **Load 2 more**, **View profile** → score breakdown.
4. Log in as `aye@cato.test` → `/results` shows "Set up your search first" (no filter yet).
