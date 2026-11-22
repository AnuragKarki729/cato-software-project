# Workflows

Owner: AnuragKarki729 · Last updated: 2026-11-21

## Run the app

Requires Docker Desktop and a `.env` file in the repository root (get it from Anurag).

```bash
docker compose up --build
```

- Web app: http://localhost:5173
- API docs: http://localhost:8000/docs
- Stop: `Ctrl+C`
- Wipe the database and start fresh: `docker compose down -v`

Set a password for a seeded user:

```bash
docker compose exec server python -m app.set_password <email>
```

## Test and check

Server tests (from `server/`; they use SQLite, so MySQL is not needed):

```bash
PYTHONPATH=. uv run --with pytest --with httpx pytest -q
```

`pytest` is not yet a declared dependency, which is why `--with` is needed.

Client (from `client/`):

```bash
npm ci --legacy-peer-deps
npm run lint
npm run build
```

## Branch and pull request

```bash
git fetch origin
git switch -c <your-name>/resp-<n> origin/main     # or <your-name>/issue-<n>
# ...work, commit...
git fetch origin && git merge origin/main          # bring your branch up to date
git push -u origin <your-name>/resp-<n>
```

Then open a pull request into `main` on GitHub. In the description:

- name the responsibility or issue number,
- list what you tested,
- confirm you updated `AI-USAGE-DECLARATION.md` and any affected `harness/` or `docs/` file.

Anurag reviews and merges. Do not merge your own pull request.

The pull request is the evidence of your work for the project, so open it from your own account and
keep its title and description specific (see `policy.md` section 1).

## Deployment

`main` is the deployed branch and Anurag handles deployment. There is no CI workflow in the repository
at the moment (see the drift table in `architecture.md`).
