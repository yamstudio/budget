# CLAUDE.md

## What this is
Personal budgeting web app (expenses, incomes, monthly comparison and year-to-date dashboards). Single user. Public repo. Built in 2024–2025, then infrastructure, CI and tests were hardened in late 2026.

## Status and handoff
The engineering foundation is done (local DB + prod guard, CI gates, API and UI tests, release-tag deploys, approval-gated infra and migrations, infrastructure in Terraform, no stored cloud credentials). Start feature work from here; do not redo the foundation.
- **How to work:** branch, make the change with tests, run the checks (Commands), open a PR, wait for `api`/`ui`, merge only when the owner says. Look at UI changes with `scripts/ui-screenshot.zsh` (desktop and `390x844`).
- **Next roadmap item: better visualization of where money comes from and goes.** Not started. Ask the owner first: what question it should answer (category breakdown, income-to-spending flow, trends), phone vs desktop use, whether vendor/payment method matter, and whether to extend the two existing dashboards (`MonthlyComparisonDashboard.tsx`, `YearToDateProgressDashboard.tsx`, still duplicated code) or add a page. Known: charts and grids overflow horizontally on a phone.
- **Not proven yet:** interactive browser behavior (no Playwright; screenshots only).
- **Owner item still open:** remove the production connection string from local user-secrets (the guard makes it inert).
- **Background reading:** `docs/releasing.md`, `docs/migrations.md`, `docs/identities.md`, `infra/README.md`.

## Layout
- `src/WebApi/`: ASP.NET Core (net10.0) Web API, EF Core + SQL Server, Swashbuckle for Swagger. One controller per entity in `Controllers/`, models in `Models/`, `Data/BudgetDbContext.cs`, EF migrations in `Migrations/`. In production it also serves the built UI from a `static/` folder next to the app.
- `src/UI/`: React 19 + TypeScript + Vite, Ant Design, AG Grid, Chart.js, TanStack Query, React Router. Data access lives in `src/Queries.ts`.
- `src/UI/src/gensrc/Api.ts`: **generated** TypeScript client (swagger-typescript-api) from the API's Swagger JSON. Don't hand-edit; regenerate after API changes.
- `.github/workflows/`: `ci.yml` (PR and master checks, reused by the release), `deploy.yml` (release: infra, migrations, deploy), `infra-plan.yml` (read-only Terraform plan on PRs touching `infra/`), `verify-prod-db.yml`, `dependency-audit.yml`; composite actions in `.github/actions/` (`prod-sql`, `tf-config`).
- `infra/`: Terraform, in two layers: `infra/` (web app, plan, SQL server and database; applied by the release workflow after approval) and `infra/identity/` (the CI identities, their GitHub OIDC trust and roles, and the Entra sign-in app; **applied only by the owner from a laptop**). Read `docs/identities.md` and `infra/README.md` before touching any of it or any Azure role. Never run `terraform apply` (or `destroy`, `import`, `state`) without the owner's explicit say-so; `plan` is fine. Environment names and IDs live in gitignored `terraform.tfvars`/`backend.hcl` locally and in the `TF_VARS`/`TF_BACKEND` GitHub secrets in CI; the repo is public, so never commit or paste them, and do not paste plan output.
- `Budget.sln` at root.

## Environments
- Dev: WSL2 on Arch Linux, zsh. dotnet 10 SDK and node 26 are installed there. (Machine facts verified; CI pins node 26.x and dotnet 10.0.x.)
- Production: an Azure App Service (Windows, Free tier) with an Azure SQL database (Basic tier, on its own SQL server in the same resource group), deployed from GitHub Actions only when the owner publishes a GitHub Release (tag `v*`); merging to `master` does not deploy (`docs/releasing.md`). Access is restricted by the App Service's Azure AD sign-in (per the owner) to the owner's personal account only; the API itself has no auth or user model, so never expose it outside that layer.
- Local DB: a throwaway SQL Server container run by Podman (rootless), managed by `scripts/dev-db.zsh`; its generated password lives outside the repo in `~/.config/budget-dev/db.env`. Use `scripts/dev-api.zsh` to run the API against it. The owner's user-secrets may still hold the **production** connection string; the env var from the script overrides it, and the guard below blocks it.
- Prod database facts: small Basic-tier SQL database, 7-day point-in-time restore, no long-term backup, Azure AD-only auth, public network access enabled.
- GitHub holds **no cloud credentials**. Workflows log in to Azure with GitHub OIDC as one of four per-purpose identities (`docs/identities.md`). The only secrets are `TF_VARS` and `TF_BACKEND` (the contents of the local gitignored files, masked in logs); the rest is plain variables (the OIDC client ids). The web app has no secrets either: passwordless SQL and managed-identity sign-in, and its SCM/FTP basic authentication is disabled (deploys use Entra).

## Data safety rules (read first)
- Never run the API, tests, `dotnet ef`, or any script against a non-local database. `LocalDatabaseGuard` enforces this at startup (only Azure App Service or `BUDGET_ALLOW_REMOTE_DB=1` bypasses it). Never set that variable yourself.
- Never apply migrations to production, approve the `production-migrations` or `production-infra` environment, create a tag/release, run the deploy workflow, merge to `master`, or touch CI/infra/secrets without the owner's explicit say-so. Production migrations run from CI after owner approval; procedure and rollback: `docs/migrations.md`.
- Never print or commit connection strings, even the local one. Never commit real financial data.
- This repo is public and the owner's other projects are not. Never write the names of those projects, their repos, databases, resource groups or other resources into any committed file, workflow, PR title/body or commit message (the existence of a project or database is itself private). Say "other, non-public projects". Same for the SQL server, resource group and state account names.

## Commands
Verified (2026-11-26, WSL2 Arch): `dotnet build -warnaserror`, `dotnet format --verify-no-changes` (`dotnet format` to fix), in `src/UI`: `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npx prettier --check .`, `npm test`, `npm run build`, `scripts/dev-db.zsh up|down|reset|status`, `scripts/test-api.zsh` (API integration tests, 8 passing; creates and drops its own database on the local dev server), `scripts/dev-api.zsh` (API on http://localhost:5054, auto-migrates and seeds synthetic data, swagger at `/swagger`). First `up` pulls a large image and starts slowly.
Unverified:
- (Verified 2026-11-26) UI dev server: `cd src/UI && npm start` (Vite proxies `/api` to localhost:5054); with `scripts/dev-api.zsh` running, the UI renders against the seeded local DB (see "Looking at the UI").
- Regenerate client: `npm run genclient` in `src/UI`. It reads `src/UI/swagger/swagger.json` (gitignored), so first save the running API's Swagger JSON there. Unverified.
- EF migrations: `dotnet tool restore` then `dotnet tool run dotnet-ef ...` (local tool pinned in `dotnet-tools.json`; verified: `database update` on a fresh local DB, twice, and `migrations script --idempotent`). Production path: `docs/migrations.md`; the read-only "Verify production DB access" workflow exercises it without changing anything.
- UI tests: Vitest + Testing Library (jsdom), `npm test` in `src/UI`; 26 tests: `Queries.test.tsx` (cache-patching mutation hooks, API client mocked with `vi.mock('./gensrc/Api')`), `gridRows.test.ts` and `useEditableRows.test.ts` (grid logic), `Grids.test.tsx` (smoke: Expenses/Incomes mount with AG Grid in jsdom; no cleanup is automatic, so tests call `cleanup`). Interactions, dashboards and real browser behavior are untested. Config lives in the `test` block of `vite.config.ts`.

## Roadmap (owner's stated direction, in rough order)
1. Raise UI code quality (see below), alongside any feature touching that code.
2. Better visualization of where money comes from and goes.
3. Better mobile experience.
4. Better prefill support (builds on the existing expense-template logic).
5. Reconciliation against external data: bank/credit-card activity, brokerage, payroll stubs, pre-tax benefit accounts. Import formats, auth and how to avoid storing credentials are undecided. Ask before designing; never commit real financial data or sample files containing it.
6. Long term: investment portfolio tracking.

## UI code quality
The owner was an Angular dev when writing the UI; much of it was copy-pasted between files. Treat it as a starter, not a style guide.
- The editable grids are now shared: `Expenses.tsx` and `Incomes.tsx` are thin pages over `BudgetGrid.tsx` (layout), `gridColumns.tsx` (column factories), `useEditableRows.ts` (row state hook) and `gridRows.ts` (pure, tested row logic). Build any new editable grid from these; do not copy. Still duplicated: the two dashboards, and the per-entity hooks in `Queries.ts`.
- Prefer small function components, typed props, TanStack Query for server state, derived values over `useState`+`useEffect`, and the generated client types instead of redefining shapes.
- When touching a file, leave it cleaner (dedupe, types, naming, lint). Keep refactors scoped to the feature at hand, in separate commits from behavior changes where practical.
- Add tests for new logic (UI: Vitest + Testing Library would fit Vite; API: xUnit). Neither is set up yet; ask before choosing.

## Looking at the UI (verified 2026-11-26)
Claude cannot see a browser by default. Use `scripts/ui-screenshot.zsh <url> <WxH> <out.png>`: it drives the **Windows** Edge/Chrome from WSL headlessly (no install, no debug port), then you read the PNG. Start `scripts/dev-api.zsh` and `npm start` in `src/UI` first (Windows reaches WSL servers at `localhost`; WSL runs in NAT mode). Seeded synthetic data makes the pages realistic. Always check a phone size (`390x844`) as well as desktop for UI changes; known today: the grids and charts overflow horizontally on a phone. Limits: screenshots only, no clicking or typing. Interactive browser tests (Playwright) are not set up because WSL NAT mode makes a Windows browser's debug port unreachable from WSL; options if needed: WSL mirrored networking, or a Linux Chromium inside WSL.

## Testing
- Run API tests: `scripts/test-api.zsh` (starts the local DB if needed). Add tests for any API change; follow `tests/WebApi.Tests/ExpenseApiTests.cs` (each test owns its data: unique lookup rows and its own date range).
- The tests read the server from `ConnectionStrings__BudgetDbConnection` and replace only the database name; `LocalDatabaseGuard` still blocks non-local servers. In CI a throwaway SQL Server container is started with a runtime-generated password.
- `dotnet publish` must target `src/WebApi` (the solution now has a test project).
- PUT endpoints return the stored row with its real id (fixed; `UpdateResponseTests` covers all eight). The UI relies on this to patch its query caches by id.

## Conventions
- Use zsh for any shell scripts.
- Prettier config in `src/UI/package.json` (no semicolons, single quotes, width 140); keep UI code formatted and lint-clean.
- Old code is not a style guide. Direction: add features, and improve where touched (add tests for new logic, tidy, add error handling). Avoid sweeping unrelated refactors.
- C#: nullable enabled, implicit usings, root namespace `YamStudio.Budget.WebApi`.

## Workflow (GitHub Actions) pitfalls, learned the hard way
- Default `run` steps use `bash -e` without `pipefail`: `failing-command | tee` reports success. Use `shell: bash` and capture output (`out="$(cmd 2>&1)"`) instead of piping.
- `actions/checkout` wipes the workspace. Never download an artifact into the workspace before a checkout, and deploy from a dedicated directory (`artifact/`), never `.`: that once published the repository (and the CI config files) as the web app and took the site down while the smoke check still passed.
- `dotnet ef` does not restore: run `dotnet restore src/WebApi` first on a fresh checkout.
- `dotnet ef migrations list` swallows connection errors (warns, still lists, exits 0). Check its output for "An error occurred while accessing the database". `database update` does fail loudly.
- The repo and its Actions logs and job summaries are **public**. Never print server names, runner IPs, or raw driver/EF error text in a workflow (an earlier verify run leaked the SQL server name this way). Use `.github/actions/prod-sql` for anything that touches the production database: it masks the server name, opens and closes a per-run firewall rule, and prints only classified generic failure reasons.
- Never write `cmd || echo "...ok"` to "tolerate" a failure: it hid a failed firewall-rule delete (`az sql server firewall-rule delete` has no `--yes`) and left a rule behind. Check state first, act, then verify the end state. Wrap `az` calls so their raw errors (subscription and resource ids) are never printed.
- A green workflow run is not proof the step did its job; assert on real output, and test the step script in a fresh clone (`git clone` to a scratch dir) including a deliberate failure.
- The .NET SDK is pinned to the 10.0 band in `global.json` (the runner default moved to SDK 11); change it together with the target framework.

## Git workflow
Branch off `master`, open a PR, squash-merge (confirmed; commit titles end with `(#N)`). Merging does not deploy; CI runs on the PR and again on `master`. Production deploys only on a published release tag, semver `v0.1.0`-style (`docs/releasing.md`). Claude never creates tags or releases and never runs the deploy workflow, and does not merge without the user's say-so. Commit messages: short imperative summary.

## Known deficiencies / risks
- API has integration tests (`tests/WebApi.Tests`, xunit v3 on Microsoft.Testing.Platform, opted in via `global.json`): the real API against real SQL Server with the real migrations, one fresh database per run. They cover migrations applying cleanly, no missing migration for model changes, and expense CRUD/summary/templates. Everything else (other controllers, budget, income) and the whole UI are untested.
- CI (`.github/workflows/ci.yml`, required before deploy and on PRs) runs build with `-warnaserror` (includes the NuGet vulnerability audit), `dotnet format --verify-no-changes`, `tsc`, eslint, prettier check, the UI build, and `terraform fmt`/`validate` for both layers. Branch protection making it required for merging is a GitHub setting owned by the owner (verify it is on).
- ESLint has 2 existing warnings (deprecated React 19 patterns: `forwardRef` in `AutoCompleteCellEditor.tsx`, `Context.Provider` in `App.tsx`). `npm run lint` is a ratchet: `--max-warnings 2`. Lower the number as they are fixed; never raise it.
- Dependencies are bleeding edge on purpose (owner prefers newest that works: net10, TypeScript 6, ESLint 10, Vite 8, node 26) and bumped frequently with few tests to catch breakage. EF Core 11 exists but needs .NET 11; stay on the latest 10.x patch until moving the TFM.
- `src/UI/README.md` is stale Create React App boilerplate (mentions yarn); root README is two lines. Both should be replaced.
- Swagger/SwaggerUI are enabled in all environments, and `AllowedHosts` is `*`.
- Controllers are repetitive per-entity CRUD (not audited in depth; validation and error handling not yet reviewed).
- A release runs, in order: checks, then Terraform (only if `infra/` changed since the last release; approval-gated; refuses to delete or replace anything), migrations (only if they changed; approval-gated), then the deploy. The release-time smoke check proves little: the sign-in redirect answers even when the app behind it is broken. Open the site after every release.
- The generated API client depends on a gitignored swagger file, so regenerating is a manual step easily forgotten after API changes.
- Dependency advisories: `npm audit` was cleaned to 0 on 2026-11-26 (`npm audit fix`, lockfile only). PR CI fails on high-severity advisories in production npm dependencies (`npm audit --omit=dev --audit-level=high`) and on any NuGet advisory (via `-warnaserror`). `dependency-audit.yml` runs weekly (Mondays) over everything including dev tooling. A new advisory can therefore block a deploy until dependencies are bumped; fix with `npm audit fix` or a package bump rather than loosening the gate.
- The app's SQL server has only the "Allow Azure services" firewall rule; CI opens a per-run rule for its migration step and removes it.

## Accepted risks (owner decision, 2026-11-26)
- Rules in this file are instructions, not enforced: there are no project permission rules (`.claude/settings.json`) blocking merges, `az` writes or the DB-guard override. Master branch protection (required `api`/`ui` checks, up-to-date branch, applies to admins, no force-push) is the one hard control.
- No single local "run every CI check" command; run the checks listed under Commands by hand before pushing.
- The generated API client (`Api.ts`) is regenerated by hand and CI does not detect drift from the API.
- API test coverage is narrow (expenses and PUT responses); other controllers and bad-input handling are untested and unreviewed.
- The owner's local user-secrets may still contain the production connection string (owner to remove; the guard makes it inert).

## Long-term plans (not scheduled)
- **Azure access:** the `az` login on the dev machine is Owner on the whole subscription. Plan: Claude sessions use a separate, limited (read-only or narrowly scoped) Azure identity, not this account.
- **Production observability:** the app runs on the Free App Service tier with no logs, metrics or alerts Claude can read, so prod-only bugs are invisible and rollback is manual. Plan: move hosting to an Azure VM with Docker and a proper log setup, which also enables a staging copy. Until then the smoke check (app answers) and manual restore points are the only safety net.
