# Supervisor change requests

Owner: AnuragKarki729 · Last updated: 2026-11-21

Source: open GitHub issues from the supervisor (`northanapon`) at
https://github.com/AnuragKarki729/cato-software-project/issues. The issue text on GitHub is the
authority; this file tracks who handles each one and its state.

Owners below are **proposed** from who owns the affected responsibility. Anurag confirms each one
when he merges its pull request; that pull request is the owner's evidence of the work.

| Issue | Title | Proposed owner | Touches | State |
|---|---|---|---|---|
| #2 | AI Usage Declaration | `AnuragKarki729` | `README.md`, `AI-USAGE-DECLARATION.md` | In progress: declaration file created; README section still to add; members to fill in their rows |
| #3 | Video limitations | `AnuragKarki729` | Responsibility 1 | Not started |
| #4 | Invitation responses and expiry | `mumoo21` | Responsibility 8 | Not started; blocked until Responsibility 8 exists |
| #5 | Applicant visibility controls | Split, see below | Responsibilities 2, 3, 5, 6 | Not started |
| #6 | Explainable and fair match scores | `NusratBegum` | Responsibility 5 | Mostly built already on `nusrat-begum/resp-2-5`; only the criteria question is open |

## #2 AI Usage Declaration

Add an AI usage declaration at the end of the README, with at least a list of the AI tools and the
extent to which AI was used. Handled by `AI-USAGE-DECLARATION.md` plus a closing README section that
links to it. Upkeep rule: `policy.md` section 4.

## #3 Video limitations

- The intro pitch can be up to 60 seconds.
- Additional videos are capped at 3.
- Each video must have a title chosen from a fixed list: "About me", "A project I'm proud of",
  "Why this field", "Free topic".

Built, with one decision on top of the request: the first three titles stay fixed, because they are
the questions a recruiter wants answered, but "Free topic" can be written over with the applicant's
own wording (at most `MAX_VIDEO_TITLE` = 80 characters). Left blank it stays "Free topic". The server
shape-checks that wording rather than matching it against the list, the same way the growing
vocabularies are handled. `GET /api/options` names which title is editable (`free_topic_title`), so
the client never hardcodes the string.

Current code: `server/app/config.py` has `MAX_VIDEO_SECONDS = 20` and `MAX_EXTRA_VIDEOS = 5`, so both
numbers need changing. `models/video.py` has `id`, `applicant_id`, `file_location`, `kind`
("pitch" or "extra"), `duration_seconds` and `created_at`: there is no title column, so one has to be
added along with validation against the fixed list, and the list itself should go in
`services/options_service.py` next to the other fixed options.

## #4 Invitation responses and expiry

- Applicants can accept or decline an invitation. Declining offers an optional reason.
- Invitations expire after 14 days with no response.
- Recruiters see each invitation's status: Sent, Viewed, Accepted, Declined or Expired.

## #5 Applicant visibility controls

- An "Open to invitations" toggle. When off, the applicant never appears in search results or the feed.
- A blocked-companies list. Recruiters from those companies never see the applicant anywhere: search,
  feed, bookmarks or saved searches.

Proposed split:

| Part | Owner |
|---|---|
| Toggle and blocked-companies fields on the profile, and the profile UI | `NusratBegum` (2) |
| Exclude from matching and ranked results | `NusratBegum` (5) |
| Exclude from the video feed | `AnuragKarki729` (3) |
| Exclude from bookmarks and saved searches | `avocado-00` (6) |

The profile fields come first; the other three parts read them.

## #6 Explainable and fair match scores

Every match score shows a breakdown by criterion, for example: skills 40/50, field of study 20/20,
GPA 10/15, languages 5/15.

**Most of this already exists** on `nusrat-begum/resp-2-5`:

- `services/matching_service.py` has `score_breakdown()`, returning a `Breakdown` of skills (out of
  60), GPA (out of 20), internships (out of 20), plus `matched_skills` and `required_skills`.
- `components/ui/MatchScore.jsx` exports `MatchScore` and `ScoreBreakdown` to display it.

What is left is a question for the supervisor, not code. The example in the issue uses different
criteria and weights (skills 50, field of study 20, GPA 15, languages 15) from the project
document's formula (skills 60, GPA 20, internships 20), and the app has no language field at all.
Ask whether:

1. showing the existing breakdown is enough, or
2. the criteria and weights must change to match the example, which would mean a language field on
   the profile (Responsibility 2), new fixed options, and changes to the formula and its tests.

Anurag asks the supervisor on the issue. Do not change the formula until the answer arrives.
