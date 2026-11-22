# Cato – agent entry point

Cato is a recruitment web app built on short videos and resumes: applicants upload a profile, resume
and pitch video; recruiters set filters, get a ranked list and send invitations. There are no job posts.

Stack: React + Vite (`client/`), FastAPI + SQLModel (`server/`), MySQL, Cloudinary for files, Docker Compose.

## Before you write any code

1. Find out whose session this is: run `git config user.name` or ask the person for their GitHub login.
2. Open `harness/responsibilities.md` and find that person's row.
3. Open their file in `harness/people/<github-login-lowercase>.md`. It lists what to build, which files
   they own and which files to leave alone.
4. Read `harness/policy.md`. Its rules are mandatory.

## Where things are

| Need | File |
|---|---|
| How this folder works | `harness/README.md` |
| Rules (branches, ownership, doc upkeep, AI declaration) | `harness/policy.md` |
| Product goal and glossary | `harness/project-context.md` |
| Stack, layout, env vars, known doc drift | `harness/architecture.md` |
| Run, test, branch and PR commands | `harness/workflows.md` |
| Who owns which responsibility | `harness/responsibilities.md` |
| Supervisor change requests (GitHub issues) | `harness/change-requests.md` |
| Detailed technical docs | `docs/` |

## Rules that always apply

- Work on your own branch and open a pull request. Never push to `main`; Anurag (`AnuragKarki729`) merges.
- The pull request is the person's evidence of their work, so it must come from their own account and branch.
- Edit only files your person owns. If a task needs a change in someone else's file, stop and tell the person.
- Never commit `.env` or any secret.
- If you used AI to produce work that gets committed, update `AI-USAGE-DECLARATION.md` in the same pull request.
- If your change makes a file in `harness/` or `docs/` wrong, fix that file in the same pull request.
- When the code and a document disagree, the code is right. Report the mismatch.
