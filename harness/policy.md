# Policy

Owner: AnuragKarki729 · Last updated: 2026-11-21

These rules apply to every team member and every AI agent working in this repository.

## 1. Branches and merging

- `main` is the deployed branch. Only Anurag (`AnuragKarki729`) pushes or merges to it.
- Work on a branch named `<your-name>/resp-<numbers>` (for example `nusrat-begum/resp-2-5`) or
  `<your-name>/issue-<number>` for a supervisor change request.
- Start the branch from the latest `origin/main` and rebase or merge `origin/main` into it before
  opening a pull request. Why: branches cut from an old `main` caused the large conflicts in commit `232707e`.
- Open a pull request into `main`. Do not merge your own pull request.
- **Your pull requests are the evidence of your work for the project.** All work reaches `main`
  through a pull request opened from your own GitHub account, with commits authored by you. Work that
  is merged any other way has no pull request to show for it.
- Keep one pull request per responsibility or change request where possible, and write a description
  that says what you built, so the evidence is clear.
- Do not commit another member's work under your account, and do not ask someone else to push yours.
- Anurag confirms the owner of a change request when he merges its pull request, and updates
  `change-requests.md` and `responsibilities.md` then.
- Agents never force-push, never rewrite history on a shared branch and never push to `main`.

## 2. Ownership

- Each responsibility has one owner, listed in `responsibilities.md`. The owner's files are listed in
  their `people/` file.
- Change only files you own. Why: every responsibility is full stack, so two people editing the same
  page or router is the main source of merge conflicts.
- Shared files (`server/app/main.py`, `server/app/models/__init__.py`, `server/app/seed.py`,
  `client/src/App.jsx`, `client/src/api.js`, shared styles and components) may be edited only to
  register your own feature: add your router, model, route or seed rows. Do not restructure them.
- If your task needs a change in a file someone else owns, ask the owner or Anurag first. An agent
  that reaches this point stops and reports it to the person.

## 3. Keeping documentation current

- A pull request that makes any file in `harness/` or `docs/` inaccurate must fix that file in the same
  pull request.
- Update `responsibilities.md` when a responsibility changes status or owner.
- Update `change-requests.md` when a supervisor issue is opened, assigned, started or closed.
- Update your own `people/` file when your tasks or owned files change.
- Update `architecture.md` and `workflows.md` when you add or change a service, folder, env variable,
  port, dependency or command.
- Change the `Last updated` date on every harness file you edit.
- When the code and a document disagree, the code is right. Fix the document or report the mismatch
  to Anurag.
- Anurag reviews the harness folder before each merge to `main` and rejects pull requests that leave it stale.

## 4. AI usage declaration

The supervisor requires an AI usage declaration (GitHub issue #2). It lives in
`AI-USAGE-DECLARATION.md` at the repository root, and the end of `README.md` links to it.

- Every member who uses an AI tool for work that is committed must record it in
  `AI-USAGE-DECLARATION.md`, in the same pull request as the work.
- Record: the member, the tool and model, what it was used for, and the extent (see the scale in that file).
- An AI agent that writes or edits committed files adds or updates the entry for its person before
  finishing the task, and tells the person it did so.
- Declare honestly. Do not understate the extent of AI use.
- If no AI was used for a pull request, no entry is needed.
- Anurag checks the declaration against the pull request before merging.

## 5. Secrets and data

- Never commit `.env`, credentials, tokens or Cloudinary keys. `.env` is gitignored; keep it that way.
- Do not paste secrets into prompts, issues, pull requests or documentation.
- Seed and demo accounts use fake `@cato.test` addresses only.

## 6. Quality before a pull request

- The server tests pass (see `workflows.md`).
- The client builds and lints.
- New endpoints have tests in `server/tests/`.
- The pull request description names the responsibility or issue number it addresses.
