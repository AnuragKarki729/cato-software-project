# AI Usage Declaration

Last updated: 2026-11-25

This file declares the AI tools used in the Cato project and the extent of their use, as required by
the supervisor (GitHub issue #2). The rule for keeping it current is in `harness/policy.md` section 4:
anyone who uses AI for committed work updates this file in the same pull request.

## Extent scale

| Level | Meaning |
|---|---|
| Assist | AI answered questions, explained errors or suggested small snippets; the member wrote the code. |
| Co-write | AI wrote substantial parts; the member directed, reviewed and edited them. |
| Generate | AI wrote most or all of the work; the member reviewed and tested it. |

## Declarations

| Member | GitHub | Tool and model | Used for | Extent |
|---|---|---|---|---|
| Anurag Karki | `AnuragKarki729` | Claude | First version of the project (later scrapped and replaced, see commit `0960c24`) | Co-Write |
| Anurag Karki | `AnuragKarki729` | Cline with qwen-30b-instruct | Rebuilding the project from scratch (commit `0960c24`), Responsibilities 1 and 3 | Co-Write |
| Anurag Karki | `AnuragKarki729` | Claude Code (Claude Sonnet 5.5, Opus 5, Fable 5.2) | Merging `nusrat-begum/resp-2-5`, reviewing branches and issues, writing `AGENTS.md`, `CLAUDE.md`, `harness/`, the `docs/` corrections and this file | Generate |
| Anurag Karki | `AnuragKarki729` | Claude Code (Claude Sonnet 5.5, Opus 5, Fable 5.2) | Responsibility 1 and 3 code: the resume parser (`resume_ai_service.py`, OpenRouter), growing vocabularies (`vocabulary_service.py`), issue #3's video limits, titles and captions, in-browser recording, the 9:16 rule, the recruiter Explore feed and its endpoints, the ranked-results feed, the candidate profile's row of cards, and editing the About card in place | Co-Write |
| Anurag Karki | `AnuragKarki729` | Claude Code (Claude Opus 5) | Rebuilding the applicant Video feed on the Explore layout, opening `/api/feed/explore` to applicants, and fixing the recruiter filter to validate fields of study and skills against the growing vocabulary instead of the frozen seed lists (`routers/matching.py`, Responsibility 5, edited with the group leader's approval) | Co-Write |
| Nusrat Begum | `NusratBegum` | _to be filled in by the member_ | Responsibilities 2 and 5 | _to be filled in_ |
| Aye Myo Myat | `avocado-00` | _to be filled in by the member_ | Responsibilities 6 and 7 | _to be filled in_ |
| Siwakorn P. | `mumoo21` | _to be filled in by the member_ | Responsibilities 4 and 8 | _to be filled in_ |

Add a new row for each new tool or area of work. Write "None" in the tool column if no AI was used.
