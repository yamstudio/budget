# CLAUDE.md

## What this is
Personal budgeting web app (expenses, incomes, monthly comparison and year-to-date dashboards). Single user. Public repo. Active in 2024–2025; since then only dependency/toolchain bumps (last commit May 2026, 38 commits total).

## Layout
- `src/WebApi/`: ASP.NET Core (net10.0) Web API, EF Core + SQL Server, Swashbuckle for Swagger. One controller per entity in `Controllers/`, models in `Models/`, `Data/BudgetDbContext.cs`, EF migrations in `Migrations/`. In production it also serves the built UI from a `static/` folder next to the app.
- `src/UI/`: React 19 + TypeScript + Vite, Ant Design, AG Grid, Chart.js, TanStack Query, React Router. Data access lives in `src/Queries.ts`.
- `src/UI/src/gensrc/Api.ts`: **generated** TypeScript client (swagger-typescript-api) from the API's Swagger JSON. Don't hand-edit; regenerate after API changes.
- `.azure/`: ARM template/parameters for the hosting resources. `.github/workflows/deploy.yml`: CI/CD.
- `Budget.sln` at root.

## Environments
- Dev: WSL2 on Arch Linux, zsh. dotnet 10 SDK and node 26 are installed there. (Machine facts verified; CI pins node 25.x and dotnet 10.0.x.)
- Production: an Azure App Service (Windows/Linux not verified) with a SQL Server database (EF Core `UseSqlServer`; where it is hosted is unverified), deployed from GitHub Actions on every push to `master`. Access is restricted by the App Service's Azure AD sign-in (per the owner) to the owner's personal account only; the API itself has no auth or user model, so never expose it outside that layer.
- Local DB: a throwaway SQL Server container run by Podman (rootless), managed by `scripts/dev-db.zsh`; its generated password lives outside the repo in `~/.config/budget-dev/db.env`. Use `scripts/dev-api.zsh` to run the API against it. The owner's user-secrets may still hold the **production** connection string; the env var from the script overrides it, and the guard below blocks it.
- Prod database facts (checked via az CLI, read-only): small Basic-tier SQL database, 7-day point-in-time restore, no long-term backup, Azure AD-only auth, public network access enabled.

## Data safety rules (read first)
- Never run the API, tests, `dotnet ef`, or any script against a non-local database. `LocalDatabaseGuard` enforces this at startup (only Azure App Service or `BUDGET_ALLOW_REMOTE_DB=1` bypasses it). Never set that variable yourself.
- Never apply migrations to production, deploy, merge to `master`, or touch CI/infra/secrets without the owner's explicit say-so. Migration procedure: `docs/migrations.md`.
- Never print or commit connection strings, even the local one. Never commit real financial data.
- Design and rollout plan: `docs/repo-hardening-design.md`.

## Commands
Verified (2026-11-26, WSL2 Arch): `dotnet build -warnaserror`, `dotnet format --verify-no-changes` (`dotnet format` to fix), in `src/UI`: `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npx prettier --check .`, `npm test`, `npm run build`, `scripts/dev-db.zsh up|down|reset|status`, `scripts/test-api.zsh` (API integration tests, 8 passing; creates and drops its own database on the local dev server), `scripts/dev-api.zsh` (API on http://localhost:5054, auto-migrates and seeds synthetic data, swagger at `/swagger`). First `up` pulls a large image and starts slowly.
Unverified:
- UI dev server: `cd src/UI && npm start` (Vite proxies `/api` to localhost:5054); the UI against the local API has not been exercised.
- Regenerate client: `npm run genclient` in `src/UI`. It reads `src/UI/swagger/swagger.json` (gitignored), so first save the running API's Swagger JSON there. Unverified.
- EF migrations: `dotnet ef` (not verified that the tool is installed).
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

## Testing
- Run API tests: `scripts/test-api.zsh` (starts the local DB if needed). Add tests for any API change; follow `tests/WebApi.Tests/ExpenseApiTests.cs` (each test owns its data: unique lookup rows and its own date range).
- The tests read the server from `ConnectionStrings__BudgetDbConnection` and replace only the database name; `LocalDatabaseGuard` still blocks non-local servers. In CI a throwaway SQL Server container is started with a runtime-generated password.
- `dotnet publish` must target `src/WebApi` (the solution now has a test project).
- **Open bug** (verified locally): every `PUT` endpoint returns the request body, not the stored row, so `expenseID`/`incomeID` come back as 0. Effects in the UI: `useUpdateExpense`/`useUpdateIncome` patch the cache by that id so they match nothing (stale cache after edits), and a saved-then-updated grid row gets row id `0`. Fix the controllers to return the stored entity, with tests.

## Conventions
- Use zsh for any shell scripts.
- Prettier config in `src/UI/package.json` (no semicolons, single quotes, width 140); keep UI code formatted and lint-clean.
- Old code is not a style guide. Direction: add features, and improve where touched (add tests for new logic, tidy, add error handling). Avoid sweeping unrelated refactors.
- C#: nullable enabled, implicit usings, root namespace `YamStudio.Budget.WebApi`.

## Git workflow
Branch off `master`, open a PR, squash-merge (confirmed; commit titles end with `(#N)`). Pushing to `master` triggers a production deploy, so don't merge without the user's say-so. Commit messages: short imperative summary.

## Known deficiencies / risks
- API has integration tests (`tests/WebApi.Tests`, xunit v3 on Microsoft.Testing.Platform, opted in via `global.json`): the real API against real SQL Server with the real migrations, one fresh database per run. They cover migrations applying cleanly, no missing migration for model changes, and expense CRUD/summary/templates. Everything else (other controllers, budget, income) and the whole UI are untested.
- CI (`.github/workflows/ci.yml`, required before deploy and on PRs) runs build with `-warnaserror` (includes the NuGet vulnerability audit), `dotnet format --verify-no-changes`, `tsc`, eslint, prettier check and the UI build. Branch protection making it required for merging is a GitHub setting owned by the owner (verify it is on).
- ESLint has 2 existing warnings (deprecated React 19 patterns: `forwardRef` in `AutoCompleteCellEditor.tsx`, `Context.Provider` in `App.tsx`). `npm run lint` is a ratchet: `--max-warnings 2`. Lower the number as they are fixed; never raise it.
- Dependencies are bleeding edge on purpose (owner prefers newest that works: net10, TypeScript 6, ESLint 10, Vite 8, node 26) and bumped frequently with few tests to catch breakage. EF Core 11 exists but needs .NET 11; stay on the latest 10.x patch until moving the TFM.
- `src/UI/README.md` is stale Create React App boilerplate (mentions yarn); root README is two lines. Both should be replaced.
- Swagger/SwaggerUI are enabled in all environments, and `AllowedHosts` is `*`.
- Controllers are repetitive per-entity CRUD (not audited in depth; validation and error handling not yet reviewed).
- Deploy workflow runs ARM deployment on every push to `master` (after checks pass).
- The generated API client depends on a gitignored swagger file, so regenerating is a manual step easily forgotten after API changes.
- `npm audit` reports 20 vulnerabilities (10 moderate, 10 high; includes vite dev-server advisories and zod) in the UI dependency tree as of 2026-11-26. Not yet fixed or gated in CI; try `npm audit fix` in its own PR.
