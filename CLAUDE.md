# CLAUDE.md

## What this is
Personal budgeting web app, single user, public repo. Three pages: **Activity** (one feed of expenses and incomes: search, filters, quick-add with suggestions, edit panel), **Insights** (where money goes and comes from: breakdown, income-to-spending flow, monthly trends, budget vs. actual) and **Lists** (rename, add and delete vendors, payment methods, categories and income sources). The goal is that the owner never needs raw SQL or the Swagger page for day-to-day use.

## Status and next steps
The engineering foundation is done (local DB + prod guard, CI gates, API and UI tests, release-tag deploys, approval-gated infra and migrations, Terraform, no stored cloud credentials). Build features on it; do not redo it.
- **How to work:** branch, make the change with tests, run the checks (Commands), open a PR, wait for `api`/`ui`, merge only when the owner says. Look at UI changes in a real browser (see "Looking at the UI"), at desktop and phone width.
- **Next: a budgets UI, soft deadline 2026-12-31 (not urgent).** Budgets (`Budget`: expense category, amount, `FromDate`..`ToDate`) can only be created through the API or SQL today; Insights reads them. Wanted: create, edit and delete budgets in the app, ideally with "start the next period from the last one" (prefill-style). Ask the owner before designing: monthly vs. annual periods, whether to prorate, how budget vs. actual should appear next to the entry views. Follow the Lists page (`reference/`) and Activity page shapes.
- **Owner item still open:** remove the production connection string from local user-secrets (the guard makes it inert).
- **Background reading:** `docs/releasing.md`, `docs/migrations.md`, `docs/identities.md`, `infra/README.md`.

## What exists (map)
- **Routes** (`src/UI/src/App.tsx`): `/activity` (home), `/insights`, `/lists`. `/expenses` and `/incomes` redirect to filtered Activity, `/dashboards/*` to Insights.
- **Activity** (`src/UI/src/activity/`): pure, tested logic in `activityItems.ts` (merge expenses and incomes, filter by type, text, card, vendor and category, group by day), `entryValues.ts` (form values, validation, suggestions from expense templates and recent incomes) and `activityParams.ts` (URL state). UI: `Activity.tsx`, `ActivityList.tsx`, `EntryDrawer.tsx` (add, edit, duplicate, delete; a side panel on desktop, a bottom sheet on a phone), `LookupSelect.tsx` (searchable dropdown that can create a missing vendor). Card, vendor and category filters apply to expenses, so incomes are hidden while one is set.
- **Insights** (`src/UI/src/insights/`): Apache ECharts via `EChart.tsx`; `insightsCharts.ts` builds chart options (validated categorical palette, top 7 plus "Other"), `insightsParams.ts` holds URL state. API: `api/insights/expenses|incomes|budget` (`InsightsApiController`). Budget semantics: a budget applies to its `FromDate`..`ToDate` period; budgets overlapping the chosen range are summed in full (not prorated) and compared with spending in the range. `ExpenseCategory.Necessity` (enum, stored as int: Unclassified, Essential, Discretionary) drives the essential/discretionary grouping.
- **Lists** (`src/UI/src/reference/`): `referenceRows.ts` and `referenceParams.ts` (pure, tested), `referenceTables.ts` (the five tables' API calls and hooks, sharing the pickers' query keys), `ReferenceData.tsx`. Expense categories also carry the necessity setting there.
- **Shared UI:** `dateRange.ts` and `DateRangeControl.tsx` (range presets in the URL), `FilterPanel.tsx` (multi-select filters), `urlParams.ts`, `Queries.ts` (data access; per-entity hooks are still repetitive).
- **Data safety rule specific to lookups:** every foreign key from expenses, incomes and budgets to the lookup tables **cascades on delete**. The five lookup controllers therefore refuse (409) to delete a row that is still used. Keep that check; never rely on the UI alone, and do not add a delete path that skips it.
- **Deliberately absent:** bulk edit (the owner does that in SQL), a data grid (AG Grid was removed; new list or form UIs should follow the feed-and-panel shape), the old Chart.js dashboards.

## Roadmap (owner's stated direction, in rough order)
1. Budgets UI (above), soft deadline 2026-12-31.
2. Better mobile experience: Activity, Insights and Lists are responsive; keep checking phone width on every UI change, and fix what is left (for example the floating add button covers the right edge of the row under it while scrolling).
3. Better prefill: builds on `expenseSuggestions` and `incomeSuggestions` in `activity/entryValues.ts` and the Duplicate action.
4. Small Lists gaps: merge two entries (duplicate vendors), show how many entries use each row.
5. Reconciliation against external data: bank/credit-card activity, brokerage, payroll stubs, pre-tax benefit accounts. Import formats, auth and how to avoid storing credentials are undecided. Ask before designing; never commit real financial data or sample files containing it.
6. Long term: investment portfolio tracking.

## Layout
- `src/WebApi/`: ASP.NET Core (net10.0) Web API, EF Core + SQL Server, Swashbuckle for Swagger. One controller per entity in `Controllers/`, models in `Models/`, `Data/BudgetDbContext.cs`, EF migrations in `Migrations/`. In production it also serves the built UI from a `static/` folder next to the app.
- `src/UI/`: React 19 + TypeScript + Vite, Ant Design, Apache ECharts, TanStack Query, React Router, dayjs. Data access lives in `src/Queries.ts`.
- `src/UI/src/gensrc/Api.ts`: **generated** TypeScript client (swagger-typescript-api) from the API's Swagger JSON. Don't hand-edit; regenerate after API changes (see Commands).
- `tests/WebApi.Tests/`: API integration tests.
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
- Never apply migrations to production, approve the `production-migrations` or `production-infra` environment, run the deploy workflow, merge to `master`, or touch CI/infra/secrets without the owner's explicit say-so. Creating a tag/release also needs the owner's explicit request in that session (see Git workflow). Production migrations run from CI after owner approval; procedure and rollback: `docs/migrations.md`.
- Never print or commit connection strings, even the local one. Never commit real financial data.
- This repo is public. Never write into a committed file, workflow, PR title/body or commit message anything that identifies the production environment (subscription and tenant ids, resource group, SQL server and state-account names, the owner's login), or anything outside this app. Those values live only in gitignored `tfvars`/`backend.hcl` and the `TF_VARS`/`TF_BACKEND` secrets.

## Commands
All verified on WSL2 Arch. In `src/UI`: `npm ci`, `npx tsc --noEmit`, `npm run lint` (zero warnings allowed), `npx prettier --check .`, `npm test`, `npm run build`, `npm start` (Vite dev server, proxies `/api` to localhost:5054). At the root: `dotnet build -warnaserror`, `dotnet format --verify-no-changes` (`dotnet format` to fix), `scripts/dev-db.zsh up|down|reset|status` (first `up` pulls a large image and is slow), `scripts/dev-api.zsh` (API on http://localhost:5054 against the local DB, auto-migrates and seeds synthetic data, swagger at `/swagger`), `scripts/test-api.zsh` (API integration tests; creates and drops its own database on the local dev server), `scripts/ui-screenshot.zsh`.
- **Regenerate the client** after any API change: run the API (`scripts/dev-api.zsh`), save `http://localhost:5054/swagger/v1/swagger.json` to `src/UI/swagger/swagger.json` (gitignored), then in `src/UI`: `npm run genclient` and `npx prettier --ignore-path /dev/null --write src/gensrc/Api.ts` (the folder is prettier-ignored, so without the explicit run the file comes out in the generator's style and the diff is huge). The diff should be only the real API change.
- **EF migrations:** `dotnet tool restore`, then `dotnet tool run dotnet-ef ...` (local tool pinned in `dotnet-tools.json`). The design-time context honors `LocalDatabaseGuard`, so first load the local connection string without printing it: `set -a; source ~/.config/budget-dev/db.env; set +a`. Production path: `docs/migrations.md`; the read-only "Verify production DB access" workflow exercises it without changing anything. Migrations should be additive.
- **UI tests:** Vitest (jsdom), config in the `test` block of `vite.config.ts`. They cover the pure logic of each page (`activity/`, `insights/`, `reference/`, `dateRange.test.ts`) and the cache-patching mutation hooks (`Queries.test.tsx`, API client mocked with `vi.mock('./gensrc/Api')`). Rendered components and real browser behavior are checked by hand with Playwright, not by committed tests.

## Looking at the UI (verified 2026-11-27)
Claude cannot see a browser by default. Use `scripts/ui-screenshot.zsh <url> <WxH> <out.png> [--full-page]` (Playwright's Chromium inside WSL, any viewport size, waits for loading spinners), then read the PNG. Start `scripts/dev-api.zsh` and `npm start` in `src/UI` first; seeded synthetic data makes the pages realistic. Always check a phone size (`390x844`) as well as desktop; the script warns when the page is wider than the viewport (horizontal overflow).
- One-time setup: `npm ci` then `npx playwright install chromium` in `src/UI`, plus Chromium's system libraries (Arch: `at-spi2-core libxcomposite libxdamage libxfixes libxrandr mesa libxkbcommon alsa-lib`, needs sudo).
- For interaction (click, type, URL and persistence checks) write a throwaway Playwright script in the session scratchpad that imports `playwright` from `src/UI/node_modules`. Page state lives in the URL, which makes it easy to test. Drive Ant dropdowns through the visible `.ant-select-item-option[title=...]` elements, not `getByRole('option')` (Ant renders a hidden accessibility copy). Put short waits between rapid actions; React Router updates the URL asynchronously.
- Test against the seeded local DB only, and clean up what a script creates.

## Testing
- Run API tests: `scripts/test-api.zsh` (starts the local DB if needed). Add tests for any API change; follow `tests/WebApi.Tests/ExpenseApiTests.cs` (each test owns its data: unique lookup rows and its own date range). The tests read the server from `ConnectionStrings__BudgetDbConnection` and replace only the database name; `LocalDatabaseGuard` still blocks non-local servers. In CI a throwaway SQL Server container is started with a runtime-generated password.
- `dotnet publish` must target `src/WebApi` (the solution has a test project).
- PUT endpoints return the stored row with its real id (`UpdateResponseTests` covers all eight). The UI relies on this to patch its query caches by id.
- Add tests for new logic in the same change (UI: pure functions in their own module; API: xUnit).

## Conventions
- Use zsh for any shell scripts.
- Prettier config in `src/UI/package.json` (no semicolons, single quotes, width 140); keep UI code formatted and lint-clean.
- C#: nullable enabled, implicit usings, root namespace `YamStudio.Budget.WebApi`.
- UI: small function components, typed props, TanStack Query for server state, derived values over `useState`+`useEffect`, the generated client types instead of redefining shapes. Keep each page's logic in pure, tested modules and its state in the URL (a `parse*`/`to*Search` pair). Do not call `new Date()` during render (lint enforces this).
- Improve code where you touch it (dedupe, types, naming, error handling), scoped to the feature at hand and in separate commits from behavior changes where practical. Avoid sweeping unrelated refactors.

## Workflow (GitHub Actions) pitfalls
- Default `run` steps use `bash -e` without `pipefail`: `failing-command | tee` reports success. Use `shell: bash` and capture output (`out="$(cmd 2>&1)"`) instead of piping.
- `actions/checkout` wipes the workspace. Never download an artifact into the workspace before a checkout, and deploy from a dedicated directory (`artifact/`), never `.`: otherwise the deploy publishes the repository instead of the build, and the smoke check still passes because the sign-in redirect answers regardless.
- `dotnet ef` does not restore: run `dotnet restore src/WebApi` first on a fresh checkout.
- `dotnet ef migrations list` swallows connection errors (warns, still lists, exits 0). Check its output for "An error occurred while accessing the database". `database update` does fail loudly.
- The repo and its Actions logs and job summaries are **public**. Never print server names, runner IPs, or raw driver/EF error text in a workflow. Use `.github/actions/prod-sql` for anything that touches the production database: it masks the server name, opens and closes a per-run firewall rule, and prints only classified generic failure reasons.
- Never write `cmd || echo "...ok"` to "tolerate" a failure: it can hide a failed firewall-rule delete (`az sql server firewall-rule delete` has no `--yes`) and leave a rule behind. Check state first, act, then verify the end state. Wrap `az` calls so their raw errors (subscription and resource ids) are never printed.
- A green workflow run is not proof the step did its job; assert on real output, and test the step script in a fresh clone (`git clone` to a scratch dir) including a deliberate failure.
- The .NET SDK is pinned to the 10.0 band in `global.json` (the runner's default SDK is newer than the project's); change it together with the target framework.

## Git workflow
Branch off `master`, open a PR, squash-merge (commit titles end with `(#N)`). Master requires up-to-date branches, so after another PR merges, rebase or update before merging yours. Merging does not deploy; CI runs on the PR and again on `master`. Production deploys only on a published release tag, semver `vMAJOR.MINOR.PATCH` (`docs/releasing.md`). Claude merges only when the owner says so, and creates a tag/release only when the owner asks for one in that session; it never approves environments. Commit messages: short imperative summary.

## Known deficiencies / risks
- API integration tests (`tests/WebApi.Tests`, xunit v3 on Microsoft.Testing.Platform, opted in via `global.json`) run the real API against real SQL Server with the real migrations, one fresh database per run. They cover migrations, expense CRUD and templates, PUT responses, the insights endpoints, and the lookup tables (rename, delete and the in-use refusal). Budget and income CRUD and bad-input handling elsewhere are untested.
- CI (`.github/workflows/ci.yml`, required before deploy and on PRs) runs build with `-warnaserror` (includes the NuGet vulnerability audit), `dotnet format --verify-no-changes`, `tsc`, eslint, prettier check, the UI build, and `terraform fmt`/`validate` for both layers. Branch protection making it required for merging is a GitHub setting owned by the owner (verify it is on).
- Dependencies are bleeding edge on purpose (owner prefers newest that works: net10, TypeScript 6, ESLint 10, Vite 8, node 26) and bumped frequently. EF Core 11 exists but needs .NET 11; stay on the latest 10.x patch until moving the TFM.
- `src/UI/README.md` is stale Create React App boilerplate (mentions yarn); root README is two lines. Both should be replaced.
- Swagger/SwaggerUI are enabled in all environments, and `AllowedHosts` is `*`.
- Controllers are repetitive per-entity CRUD (not audited in depth; validation and error handling not yet reviewed).
- A release runs, in order: checks, then Terraform (only if `infra/` changed since the last release; approval-gated; refuses to delete or replace anything), migrations (only if they changed; approval-gated), then the deploy. The release-time smoke check proves little: the sign-in redirect answers even when the app behind it is broken. Open the site after every release.
- The generated API client depends on a gitignored swagger file, so regenerating is a manual step easily forgotten after API changes, and CI does not detect drift from the API.
- Dependency advisories: PR CI fails on high-severity advisories in production npm dependencies (`npm audit --omit=dev --audit-level=high`) and on any NuGet advisory (via `-warnaserror`). `dependency-audit.yml` runs weekly (Mondays) over everything including dev tooling. A new advisory can therefore block a deploy until dependencies are bumped; fix with `npm audit fix` or a package bump rather than loosening the gate.
- The app's SQL server has only the "Allow Azure services" firewall rule; CI opens a per-run rule for its migration step and removes it.
- The lookup foreign keys cascade on delete at the database level (see "What exists"); only the API check protects against it. Manual SQL can still cascade.

## Accepted risks (owner decision)
- Rules in this file are instructions, not enforced: there are no project permission rules (`.claude/settings.json`) blocking merges, `az` writes or the DB-guard override. Master branch protection (required `api`/`ui` checks, up-to-date branch, applies to admins, no force-push) is the one hard control.
- No single local "run every CI check" command; run the checks listed under Commands by hand before pushing.
- The owner's local user-secrets may still contain the production connection string (owner to remove; the guard makes it inert).

## Long-term plans (not scheduled)
- **Azure access:** the `az` login on the dev machine is Owner on the whole subscription. Plan: Claude sessions use a separate, limited (read-only or narrowly scoped) Azure identity, not this account.
- **Production observability:** the app runs on the Free App Service tier with no logs, metrics or alerts Claude can read, so prod-only bugs are invisible and rollback is manual. Plan: move hosting to an Azure VM with Docker and a proper log setup, which also enables a staging copy. Until then the smoke check (app answers) and manual restore points are the only safety net.
