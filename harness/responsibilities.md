# Responsibilities

Owner: AnuragKarki729 · Last updated: 2026-11-21

Each responsibility is full stack: the React pages, the FastAPI endpoints and the tables.

## Team

| Name | Student ID | GitHub login | Person file | Responsibilities |
|---|---|---|---|---|
| Anurag Karki | 6838852 | `AnuragKarki729` | `people/anuragkarki729.md` | 1, 3, DevOps, merges to `main` |
| Nusrat Begum | 6638009 | `NusratBegum` | `people/nusratbegum.md` | 2, 5 |
| Aye Myo Myat | 6837919 | `avocado-00` | `people/avocado-00.md` | 6, 7 |
| Siwakorn P. | 6600139 | `mumoo21` | `people/mumoo21.md` | 4, 8 |

Supervisor: `northanapon`.

## Status (as of 2026-11-21)

| # | Responsibility | Owner | Status |
|---|---|---|---|
| 1 | Video upload and video retrieval | `AnuragKarki729` | Working. Pages restyled on Nusrat's branch. Change request #3 open. |
| 2 | Applicant profile and resume | `NusratBegum` | Merged from `nusrat-begum/resp-2-5` (PR #7). `recruiter/ApplicantProfile.jsx` was then restructured by `AnuragKarki729` — see "Work that crossed responsibility lines". |
| 3 | Short-form video feed (optional) | `AnuragKarki729` | Working, and now two pages. `/feed` is the applicant feed (other people's pitches, newest first). `/explore` is the recruiter one: every candidate with a pitch, no filters, paged, with a field-of-study tab row; down the candidates, sideways through one candidate's videos. Both on the shared pager. No longer uses `SAMPLE_SEARCHES`. |
| 4 | Recruiter filter page | `mumoo21` | Backend not built: no `routers/filters.py`. `models/recruiter_filter.py` exists and `FindCandidates.jsx` is already styled, both from Nusrat's branch. |
| 5 | Candidate matching and ranked results | `NusratBegum` | Merged from `nusrat-begum/resp-2-5` (PR #7). Change request #6 mostly covered, see `change-requests.md`. `/results` was then rebuilt as a one-candidate-at-a-time feed by `AnuragKarki729`, which replaces the Figma "P8" list and no longer renders `CandidateCard`. |
| 6 | Saved searches and bookmarks (optional) | `avocado-00` | Not live. `routers/saved.py` is written but not mounted, and the `savedsearch` and `bookmark` models do not exist. `Saved.jsx` is styled and runs on sample data. Waits on 4. |
| 7 | Sign up, log in and roles | `avocado-00` | Merged in PR #1 and working. Sign-up and log-in pages restyled on Nusrat's branch, and `auth.py` now routes onboarding through the profile step. |
| 8 | Invitations | `mumoo21` | Not built. No router, service or model. Both pages are styled and run on sample data. Change request #4 open. |

## Files by responsibility

| # | Server (`server/app/`) | Client (`client/src/pages/`) |
|---|---|---|
| 1 | `routers/videos.py`, `services/storage_service.py`, `models/video.py`, `schemas/video.py` | `applicant/OnboardingVideo.jsx`, video parts of `applicant/MyProfile.jsx` |
| 2 | `routers/profiles.py`, `models/applicant_profile.py`, `schemas/profile.py` | `applicant/OnboardingProfile.jsx`, `applicant/MyProfile.jsx`, `recruiter/ApplicantProfile.jsx` (the row of cards on it is Responsibility 1) |
| 3 | `routers/feed.py` | `applicant/VideoFeed.jsx`, `recruiter/ExploreCandidates.jsx` |
| 4 | `routers/filters.py` (to create), `models/recruiter_filter.py` | `recruiter/FindCandidates.jsx` |
| 5 | `routers/matching.py`, `services/matching_service.py`, `schemas/matching.py` | `recruiter/RankedResults.jsx` |
| 6 | `routers/saved.py`, `schemas/saved.py` | `recruiter/Saved.jsx` |
| 7 | `routers/auth.py`, `services/auth_service.py`, `models/user.py`, `models/auth_session.py`, `models/registration_consent.py`, `schemas/user.py` | `public/SignUp.jsx`, `public/LogIn.jsx`, route guards in `App.jsx` |
| 8 | `routers/invitations.py`, `services/invitation_service.py`, `models/invitation.py` (all to create) | `applicant/Invitations.jsx`, `recruiter/SentInvitations.jsx`, Invite button on `recruiter/ApplicantProfile.jsx` |

## Work that crossed responsibility lines

It has gone both ways. `AnuragKarki729` rebuilt the way `recruiter/ApplicantProfile.jsx` presents a
candidate, which is `NusratBegum`'s file:

| What changed on her page | Why | What she needs to know |
|---|---|---|
| The pitch figure and the "More videos" section became one row of cards (`.cp-reel`): every video, then an About card, then a resume card, all the same size, the middle one sharp and its neighbours scaled down and blurred | Video presentation is Responsibility 1, and two sections for the same thing read as two kinds of thing. Moving About and the resume into the row took the page off a scrollbar. | The page is now `100dvh` with no page scroll above 767px; the sidebar (Interested, score breakdown) scrolls on its own. Her data, props and endpoints are untouched — only the presentation changed. Below 767px it stacks and scrolls as before. |
| `.cp-pitch`, `.cp-pitch__caption`, `.cp-more*` and `.cp-resume` CSS removed | Nothing referenced them once the row replaced those sections. | If she re-adds a section, the class names are gone. |
| In `preview` mode the About card is editable in place: the same fields the onboarding review uses, saved with `PUT /api/profiles/me/draft` | `/profile/preview` exists so an applicant can see what a recruiter sees. Sending them to `/profile/edit` to change something loses that, and they lose their place in the row of cards. | `NusratBegum` — this is a second way into profile editing beside `OnboardingProfile editing`. It writes through her endpoint and her schema, adds no server code, and the recruiter view is unchanged because every bit of it is behind `preview`. **The draft endpoint, not `PUT /me`:** the strict one rejects a null GPA with 422, so an applicant whose resume never yielded a GPA could not have saved a change to anything else. Worth folding into her edit page eventually rather than keeping two forms. |
| New shared `components/ProfileCards.jsx`: `AboutCard` and `ResumeCard`. `applicant/MyProfile.jsx` now shows both in its row of videos, before the "+" card, and its Skills and Resume sidebar cards are gone | The applicant's own page, their preview of it, and the recruiter's view of it are the same two cards rather than three drawings of the same thing. It also took two sections off the sidebar, which is what was making the page long on a phone. | `NusratBegum` — `MyProfile.jsx` is her page and `ResumeUpload` stays in its sidebar for upload and replace, which a card cannot do. The About editor lives in the shared component now, so there is one form, not one per page. |

Two shared components changed with it:

| What changed | Why | Who else it affects |
|---|---|---|
| `components/ui/VideoPoster.jsx` — the click area now fills the poster (`.ui-poster__hit`) | Pressing anywhere on a video card should play it, not only the 48px disc. `.ui-poster__play` is untouched, because `AuthShell`, `Landing` and the video feed render that disc on its own as decoration. | Everyone — every poster in the app is now clickable edge to edge. The hover preview stays muted: it was tried with sound and reverted, because a browser refuses audio before the page has been interacted with, which made the first hover silent and the rest loud. |
| `components/ui/VideoViewer.jsx` — circular, and takes optional `extra` cards that are not videos (`node`, and `wide` for a landscape frame) | The candidate profile pages its About sheet and resume through the same viewer as the videos. The resume needs a wide frame: a PDF is scaled to the frame's width, and 9:16 makes it a column of small print. | `NusratBegum` and `avocado-00` — `applicant/MyProfile.jsx` passes no `extra`, so it is unchanged except that its videos now loop. |
| `components/AppHeader.jsx` gains a PDPA badge beside the bell, opening a dialog with the privacy wording for that role. The card on `MyProfile` is gone | A quarter of My profile was a notice read once. In the header it is on every page and in the way of nothing. | Everyone. The wording is per role: what an applicant's profile shows recruiters, and that a candidate's videos and resume are for Cato only. `.pf-privacy__head` is kept — `Invitations` and `FindCandidates` still use it. |
| `.ui-tabbar` in `styles/ui.css` is a floating pill — inset 12px, fully rounded, raised — instead of a bar welded to the bottom edge | Asked for. | Everyone, on every logged-in page below 767px. |
| New token `--ui-tabbar-space` in `styles/ui.css`: 0 on a desktop, `84px + safe-area` where the nav appears | The pages that fill the window (`/explore`, `/results`, `/feed`, the candidate profile) ran their video under the nav. They now pad their bottom by this token, in their **base** rules rather than inside a breakpoint — the nav appears at 767px while those pages switch at 760px, so a value set only at 760px would leave a 7px-wide window where the video hides behind the nav. `.ui-main` and `.ui-toast` read the token too, replacing hardcoded 96px and 88px. | Anyone adding a full-height page: pad its bottom by `var(--ui-tabbar-space)` rather than a number. |

The branch `nusrat-begum/resp-2-5` went beyond Responsibilities 2 and 5. This was agreed after the
fact, but everyone needs to know what it changed, because it affects files you own:

| What she added or changed | Who it affects |
|---|---|
| A client design system (`components/ui/`, `AppHeader`, `AuthShell`, `CandidateCard`, `utils/`, `styles/ui.css`) | Everyone. Reuse it; do not start a second set of components. |
| Restyled every page, including the public, applicant and recruiter pages owned by others | Everyone. Build on her version of your page, not the old one. |
| `data/samples.js`, placeholder data for Responsibilities 6 and 8 | `avocado-00`, `mumoo21`. Replace it with real endpoints; do not ship it. |
| `storage_service.py` now takes `resource_type` ("video" or "raw"), defaulting to "video" | `AnuragKarki729`. Existing video calls are unaffected. |
| `routers/auth.py` sends applicants to the profile step before the video step | `avocado-00` |
| `seed.py` adds eight demo applicants, a profile for `anurag@cato.test` and a filter for `siwakorn@cato.test` | Everyone, for demos and tests |
| `tests/conftest.py` rebuilds and reseeds the database for every test | Everyone writing tests |
| New routes `/profile/edit` and `/profile/preview` in `App.jsx` | `NusratBegum` |

Shared, registration-only files: `server/app/main.py`, `server/app/models/__init__.py`,
`server/app/seed.py`, `client/src/App.jsx`, `client/src/api.js`, `client/src/styles/`,
`client/src/components/`, `services/options_service.py`, `routers/options.py`. See `policy.md` section 2.

## Changes to shared files, registered

`policy.md` section 2 makes `client/src/components/` and `client/src/styles/` shared: anyone may
change them, `AnuragKarki729` has the final say, and the change is written down here.

| What changed | Why | Who else it affects |
|---|---|---|
| `components/ui/ResumeViewer.jsx` now loads the PDF with `#toolbar=0&navpanes=0&view=FitH` | The dialog already has a title, a close button and a link out to a new tab, so the browser's own PDF toolbar was a second set of controls. `FitH` scales the page to the frame, which is what makes the text readable without zooming. Scrolling is untouched, so a resume of several pages still scrolls. | `NusratBegum` — the same dialog opens from `recruiter/ApplicantProfile.jsx` and `applicant/MyProfile.jsx`. The "open in a new tab" link still uses the plain URL. |
| `.ui-viewer` in `styles/ui.css` widened from 760px to 1000px, body padding cut to 16px | An A4 page is 794px wide at full size. A 760px dialog minus 80px of padding rendered every resume below 100%, so it had to be zoomed. | `NusratBegum`, same two pages. |
| `components/ui/ResumeViewer.jsx` takes an optional `actions` prop, rendered in the head beside Close | A recruiter reading a resume on `/explore` can save or invite without closing it first. Additive: left out, the head is exactly as it was. | `NusratBegum` — her two pages pass nothing, so they are unchanged. |
| `.ui-viewer` scales in (`ui-viewer-in`), with a `prefers-reduced-motion` opt-out | The dialog grows out of the card that was clicked instead of appearing on top of it. | `NusratBegum`, same two pages. |

## Branches

| Branch | State |
|---|---|
| `main` | Deployed branch. |
| `aye-myo-myat/resp-6-7` | Merged (PR #1). |
| `nusrat-begum/resp-2-5` | Pushed 2026-11-21; merges cleanly into `main`. Waiting for `NusratBegum` to open the pull request. |
| `feature/recruiter-filter` | Created by `mumoo21` on 2026-11-06; has no commits beyond `main`. |
