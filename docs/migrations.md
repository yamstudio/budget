# Database migrations runbook

Read `docs/repo-hardening-design.md` for context. Never put connection strings, hostnames or credentials in this repo.

## Local development (safe, automated)
- `scripts/dev-db.zsh up` starts a throwaway SQL Server container (Podman). `scripts/dev-api.zsh` starts it if needed and runs the API against it.
- In Development against a local DB, the API applies pending migrations and seeds synthetic data into an empty DB on startup (`Data/DevSeeder.cs`). `scripts/dev-db.zsh reset` wipes it.
- The API refuses to start against a non-local DB unless it runs on Azure App Service (`Data/LocalDatabaseGuard.cs`). This also blocks `dotnet ef` commands, because the EF tools start the app.

## Creating a migration
1. Change the model.
2. With the local DB env loaded (`set -a; source ~/.config/budget-dev/db.env; set +a`): `dotnet ef migrations add <Name> --project src/WebApi`.
3. Start the API locally to confirm it applies cleanly, and commit the migration files with the PR.
4. Destructive changes (drop/rename column, narrowing a type) go in two releases: expand (add new, dual-write), then contract (remove old) in a later release.

## Applying to production (manual, until the deploy pipeline does it)
Status: **procedure unverified**; the owner previously ran `dotnet ef` by hand and has not done so recently. Claude must not run these steps; the owner does, or explicitly directs each one.
1. Merge and deploy are separate from migration. Prefer additive migrations that the currently deployed app tolerates, apply the migration, then deploy.
2. Backup: production has point-in-time restore (7 days at last check) and no long-term retention. Before any non-trivial migration, make a manual copy or export of the database and confirm it succeeded.
3. Generate and review the SQL: `dotnet ef migrations script --idempotent --project src/WebApi -o <file outside the repo>` (with the local DB env loaded; the script is generated from the model, it does not touch the DB).
4. Apply the reviewed script to production using an Azure AD-authenticated SQL tool. Only for this step may `BUDGET_ALLOW_REMOTE_DB=1` be set, if the tool goes through the app/EF.
5. Verify: spot-check row counts/new columns, then load the deployed app.
6. Record anything that surprised you here.

## Future
Phase 2 in the design doc: CI proves migrations on a fresh container DB and the deploy workflow applies the idempotent script behind the `production` environment approval.
