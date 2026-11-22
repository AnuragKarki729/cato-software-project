# harness/

Owner: AnuragKarki729 · Last updated: 2026-11-21

This folder holds the context that AI coding agents (and people) need to work on Cato: the goal, the
architecture, the rules, and who is responsible for what. The root `AGENTS.md` routes agents here.

## Files

| File | What it answers | Update when |
|---|---|---|
| `policy.md` | What are the rules? | A team rule changes |
| `project-context.md` | What is Cato and what is it for? | The product scope changes |
| `architecture.md` | How is the code laid out and configured? | A folder, service, env var or port changes |
| `workflows.md` | How do I run, test, branch and open a PR? | A command or process changes |
| `responsibilities.md` | Who owns which responsibility, and what is its status? | Ownership or status changes |
| `change-requests.md` | What has the supervisor asked for, and who handles it? | An issue is opened, assigned or closed |
| `people/<login>.md` | What does this person build, own and avoid? | Their tasks or owned files change |

## How an agent uses it

1. Identify the person you are working for (GitHub login).
2. Read their row in `responsibilities.md`, then their file in `people/`.
3. Read `policy.md` once per session.
4. Open the other files only when the task needs them.

## Conventions

- File names are lowercase kebab-case. Files in `people/` are named after the GitHub login in lowercase.
- Every file starts with an `Owner` and `Last updated` line. Change the date when you change the file.
- These files link to `docs/` for technical detail and do not copy it.
- The code is the source of truth. A harness file that disagrees with the code is a bug to fix.
