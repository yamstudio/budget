# Design: make the repo safe and pleasant to iterate on

Status: proposed. Audience: the owner and future Claude sessions.
Goal: let Claude (and the owner) change, test and ship this app quickly without risking production data. Priority is data integrity; brief downtime or breakage is acceptable (single-user app).

## Problems today
1. Local development can point at the production database, so running the app, tests or a migration locally can damage real data.
2. Migrations are applied to prod by hand with `dotnet ef`, from memory, with no documented procedure or backup step.
3. CI only builds and deploys on push to `master`. Nothing checks lint, format, types or behavior before prod.
4. No tests in either project. No C# style/analyzer config.

## Non-goals (for now)
- A staging App Service/slot or second cloud environment. Revisit if Claude is ever allowed to merge on its own.
- New features, and the UI refactor (it comes after tests exist).

## 1. Dev/prod data isolation
- Local dev and tests use a **local, disposable SQL Server** with fake seed data. The app and Vite still run directly in WSL; only the database needs somewhere to run.
- Why SQL Server specifically: the app uses the EF Core SQL Server provider and the migrations are SQL Server-specific. A different engine (SQLite, in-memory) would not exercise real migrations or SQL translation.
- Where it runs (**decided: option A, Podman**, implemented in `scripts/dev-db.zsh`):
  - A. SQL Server container via Podman or Docker (recommended: reproducible, also what Testcontainers uses in CI and locally). Cost: install a container runtime once.
  - B. A separate small Azure SQL database used only for dev. No local install, but costs money, needs network, and is easy to confuse with prod.
  - C. Native SQL Server on Linux. Unsupported on this distro; not recommended.
- The connection string comes from user-secrets or an environment variable and is never committed. Docs must only ever show the local one.
- Safety rails: `Program.cs` should refuse to start in Development if the connection string's server is not local (allow-list), and `CLAUDE.md` states: never run the app, tests, or `dotnet ef database update` against a non-local database.

## 2. Migrations
- Replace "by hand from memory" with a documented, repeatable flow:
  1. Author migration locally against the local DB (`dotnet ef migrations add`), commit it with the PR.
  2. CI generates an idempotent script (`dotnet ef migrations script --idempotent`) and uploads it as a build artifact, and applies all migrations to a fresh container DB to prove they run.
  3. Applying to prod: **phase 1** a wrapper script (`scripts/`, zsh) that takes an explicit target, prints the pending migrations, requires typed confirmation, and refuses to run without a recent backup marker. **Phase 2** a deploy-workflow step that applies the idempotent script, gated by the existing `production` GitHub environment with required reviewer.
- Data integrity rules: take a backup (or confirm point-in-time restore covers the moment) before every prod migration; destructive changes (drop/rename column, type narrowing) are split into expand then contract across two releases.
- Open items to verify with the owner: the prod DB tier and its backup/restore retention, and how the deployed app's DB credential is held (never document values).

## 3. CI gates (PR workflow, required before merge)
- .NET: `dotnet build -warnaserror`, `dotnet format --verify-no-changes`, tests.
- UI: `npm ci`, `tsc`, `eslint`, `prettier --check`, tests.
- `deploy.yml`: deploy job `needs` the checks; switch UI install to `npm ci`.
- Branch protection on `master`: PR required, checks required. Merge style stays squash (confirmed by the owner; update `CLAUDE.md`).
- C# style: add `.editorconfig` and enable analyzers, starting at warnings so the baseline can be cleaned in one PR. TypeScript linting already exists; tighten rules as the UI is refactored.

## 4. Tests
- **API integration tests first** (done): xunit v3 + `WebApplicationFactory` against a real SQL Server applying the real migrations. Implemented without Testcontainers: tests take the server from `ConnectionStrings__BudgetDbConnection` (local dev container via `scripts/test-api.zsh`, a plain `docker run` in CI) and create/drop a uniquely named database per run. This avoids Podman-socket setup for Testcontainers. Highest value, because the API is thin CRUD plus summary/budget/template queries.
- **UI unit tests**: Vitest for pure logic (query cache helpers in `Queries.ts`, colour and date helpers). Component tests after that. A Playwright smoke test is a later step.
- Tests must be written before the Expenses/Incomes dedupe so the refactor has a safety net.
- Never commit real financial data; fixtures are synthetic.

## 5. Autonomy policy for Claude
- Allowed without asking: branch, edit, run local checks and tests against the local DB, open PRs.
- Needs the owner: merging to `master` (it deploys to prod), applying any migration to prod, changing CI/deploy/infra files, touching secrets.
- Revisit auto-merge once required checks and a post-deploy smoke check exist.

## Rollout (one PR each)
1. Local DB setup + safety guard + `CLAUDE.md` rules + migration runbook and script (phase 1).
2. PR CI workflow, `.editorconfig`/analyzers, `npm ci`, branch protection (owner action).
3. API integration test harness with a first few tests; CI runs them and applies migrations to a fresh DB.
4. UI Vitest harness with a first few tests.
5. Migration step in deploy (phase 2) and post-deploy smoke check.
6. UI dedupe/refactor under test cover, then features.

## Facts checked (read-only, 2026-11-26)
- Prod DB: Basic tier, 7-day point-in-time restore, no long-term retention, local backup redundancy; server is Azure AD-auth only with public network access enabled. Web app is on the Free tier.
- The owner's local user-secrets held a connection string (presumably prod). It was not modified. The guard makes it inert for local runs.

## Open questions
- Which migration-apply tool for prod (Azure AD auth from WSL is unverified).
- Whether to remove the prod connection string from local user-secrets once the migration flow is settled.
