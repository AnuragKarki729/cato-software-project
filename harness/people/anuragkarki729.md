# Anurag Karki

Owner: AnuragKarki729 · Last updated: 2026-11-21

- GitHub login: `AnuragKarki729`
- Student ID: 6838852
- Roles: repository owner, DevOps, the only person who merges to `main`
- Responsibilities: 1 (video upload and retrieval), 3 (short-form video feed)

## Owns

- `server/app/routers/videos.py`, `server/app/routers/feed.py`
- `server/app/services/storage_service.py`
- `server/app/models/video.py`, `server/app/schemas/video.py`
- `client/src/pages/applicant/OnboardingVideo.jsx`, `client/src/pages/applicant/VideoFeed.jsx`,
  `client/src/pages/recruiter/ExploreCandidates.jsx`
- `client/src/components/useVerticalPager.jsx`, `client/src/components/ui/Carousel.jsx`,
  `client/src/components/ui/VideoViewer.jsx`, `client/src/components/ui/VideoRecorder.jsx`, `client/src/utils/media.js`
- The video sections of `client/src/pages/applicant/MyProfile.jsx` (the rest belongs to `NusratBegum`)
- DevOps: `docker-compose.yml`, both `Dockerfile`s, `pyproject.toml`, `uv.lock`,
  `server/requirements.txt`, CI and deployment
- `harness/`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `AI-USAGE-DECLARATION.md` (structure; each member
  fills in their own declaration rows)
- Shared files listed in `responsibilities.md` (final say on changes)

## To do

1. ~~Merge the pull request for `nusrat-begum/resp-2-5`~~ — merged as PR #7.
2. Issue #2: add the closing README section linking to `AI-USAGE-DECLARATION.md`; collect each member's rows.
   The README also still links to a `docs/uploads.md` that does not exist, and claims an
   `.env.example` and GHCR images that do not exist either. Fix those in the same pass.
3. ~~Issue #3: video limits (60 second pitch, 3 extra videos, fixed title list)~~ — done, plus a
   200-character caption, in-browser recording and the 9:16 rule.
4. Issue #5, feed part: hide applicants who are not open to invitations or who blocked the recruiter's company.
5. ~~Polish the UI of Responsibilities 1 and 3~~ — done: see "Video pages" in `architecture.md`.
6. Remove `PARSE_DELAY_SECONDS` from `routers/profiles.py` **before the demo**. It is marked
   TEMPORARY and exists only to make the background parse visible while testing.
7. Seed pitch videos for the demo applicants. `/results` is built around the video and the eight
   seeded applicants have `pitch_url: None`, so it shows an empty frame for them. `/explore`
   leaves them out instead, which is why it currently lists one candidate.
8. ~~Small screens, below 760px: decide the layout for the candidate panel~~ — decided. Every
   skill is shown wrapped at every width, and below 760px the row is never swipeable at all:
   sideways there means the previous or next video, so two things answering the same gesture in
   the same place would be a guess every time. The overlay grew to 86% of the frame to fit.
9. DevOps: fix the documentation drift listed in `architecture.md` (missing CI workflow,
   `.env.example`, production compose file, test dependencies).
10. Confirm the proposed owners in `change-requests.md`.
11. Run the test suite and the client build; neither has been run since the Responsibility 1 and 3 work.

## What Nusrat's branch changed in your files

Your branch `anurag-karki/resp-1-3` starts from hers, so you already have these:

- `OnboardingVideo.jsx`, `VideoFeed.jsx` and `MyProfile.jsx` were restyled (135 to 273 lines each).
  Build issue #3 and your UI polish on her versions.
- `storage_service.py` now takes a `resource_type` argument ("video" or "raw") on `save`, `get_url`
  and `delete`. It defaults to "video", so your existing video calls behave as before.
- `VideoFeed.jsx` used to fall back to `SAMPLE_SEARCHES` from `data/samples.js` for a
  recruiter's saved searches. It no longer does: the feed is applicant-only now and recruiters
  browse on `/explore`, so Responsibility 3 does not wait on Responsibility 6 at all.
- Reuse her design system (`components/ui/`, `utils/format.js`) rather than writing new components.

## Do not touch without asking the owner

- Profiles and matching (`NusratBegum`), auth and saved (`avocado-00`), filters and invitations (`mumoo21`).
