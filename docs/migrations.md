# Database migrations runbook

Never put connection strings, hostnames or credentials in this repo.

## Local development (safe, automated)
- `scripts/dev-db.zsh up` starts a throwaway SQL Server container (Podman). `scripts/dev-api.zsh` starts it if needed and runs the API against it.
- In Development against a local DB, the API applies pending migrations and seeds synthetic data into an empty DB on startup (`Data/DevSeeder.cs`). `scripts/dev-db.zsh reset` wipes it.
- The API refuses to start against a non-local DB unless it runs on Azure App Service (`Data/LocalDatabaseGuard.cs`). This also blocks `dotnet ef` commands, because the EF tools start the app.

## Creating a migration
1. Change the model.
2. With the local DB env loaded (`set -a; source ~/.config/budget-dev/db.env; set +a`): `dotnet tool restore` once, then `dotnet ef migrations add <Name> --project src/WebApi`.
3. Start the API locally to confirm it applies cleanly, and commit the migration files with the PR.
4. Destructive changes (drop/rename column, narrowing a type) go in two releases: expand (add new, dual-write), then contract (remove old) in a later release.

## Applying to production (automated, with approval)
Migrations are applied by `.github/workflows/deploy.yml` when a release (see `docs/releasing.md`) changes `src/WebApi/Migrations` compared with the previous release tag:
1. `changes` detects the change, generates the idempotent SQL (`dotnet ef migrations script --idempotent`) and prints it in the run summary for review.
2. `migrate` waits for a required reviewer to approve the **production-migrations** GitHub environment, logs into Azure as the `belfast-migrate` identity (GitHub OIDC, no stored credential), notes the restore point time, and runs `dotnet ef database update` against production with `BUDGET_ALLOW_REMOTE_DB=1` (the only sanctioned use of that override).
3. `deploy` runs only after `migrate` succeeded or was not needed. After deploying it smoke-checks that the app answers (a redirect to sign-in counts as up).
Releases that do not touch migrations skip the approval gate entirely.

CI also proves the exact `dotnet ef database update` command on a fresh database, twice (second run must be a no-op), on every PR.

Rules:
- Prefer additive migrations: the migration runs before the new code is deployed, so the old code must tolerate the new schema. Destructive changes are split into expand then contract across two releases.
- Rollback: the database has 7-day point-in-time restore and no long-term backup. Each migration run records its restore point (UTC) in the run summary. To roll back, restore the database to that time (Azure portal or `az sql db restore`), then redeploy the previous commit. Migrations are not reversed automatically.
- Claude must never approve the environment, run the production steps by hand, or set `BUDGET_ALLOW_REMOTE_DB`.

### Setup it relies on
All of it is described in `docs/identities.md` and nothing here is a stored secret:
- The `belfast-migrate` identity and its narrow firewall role come from Terraform (`infra/identity/`). Its database user and roles (`db_ddladmin`, `db_datareader`, `db_datawriter`) are the one manual SQL step there.
- The workflow derives the passwordless connection string and resource group from the `TF_VARS` secret (`.github/actions/tf-config`), masked in logs.
- Each run opens a temporary Azure SQL firewall rule for the runner's own IP and removes it afterwards (`.github/actions/prod-sql`): runner IPs change on every run and are not covered by "Allow Azure services".
- The `production-migrations` environment has the owner as required reviewer and allows tags: Deployment branches and tags, Selected, with a branch rule for `master` (manual verify runs) and a tag rule for `v*`.
- Verify without changing anything: Actions, **Verify production DB access**, Run workflow, approve it. It lists applied and pending migrations read-only.

## Future
Optional: a pre-migration database copy for risky changes (Basic tier supports `az sql db copy`).
