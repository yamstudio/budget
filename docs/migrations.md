# Database migrations runbook

Read `docs/repo-hardening-design.md` for context. Never put connection strings, hostnames or credentials in this repo.

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
1. `plan-migrations` detects the change, generates the idempotent SQL (`dotnet ef migrations script --idempotent`) and prints it in the run summary for review.
2. `migrate` waits for a required reviewer to approve the **production-migrations** GitHub environment, logs into Azure as the CI service principal, notes the restore point time, and runs `dotnet ef database update` against production with `BUDGET_ALLOW_REMOTE_DB=1` (the only sanctioned use of that override).
3. `deploy` runs only after `migrate` succeeded or was not needed. After deploying it smoke-checks that the app answers (a redirect to sign-in counts as up).
Releases that do not touch migrations skip the approval gate entirely.

CI also proves the exact `dotnet ef database update` command on a fresh database, twice (second run must be a no-op), on every PR.

Rules:
- Prefer additive migrations: the migration runs before the new code is deployed, so the old code must tolerate the new schema. Destructive changes are split into expand then contract across two releases.
- Rollback: the database has 7-day point-in-time restore and no long-term backup. Each migration run records its restore point (UTC) in the run summary. To roll back, restore the database to that time (Azure portal or `az sql db restore`), then redeploy the previous commit. Migrations are not reversed automatically.
- Claude must never approve the environment, run the production steps by hand, or set `BUDGET_ALLOW_REMOTE_DB`.

### One-time setup (owner; none of it is in the repo)
1. Give the CI service principal (the identity behind the `AZURE_CREDENTIALS` secret) access to the production database. Azure SQL here is Azure AD-only, so ARM roles are not enough; connect to the production database as the SQL Azure AD admin (for example the portal query editor) and run:
   ```sql
   CREATE USER [<ci-service-principal-display-name>] FROM EXTERNAL PROVIDER;
   ALTER ROLE db_datareader ADD MEMBER [<ci-service-principal-display-name>];
   ALTER ROLE db_datawriter ADD MEMBER [<ci-service-principal-display-name>];
   ALTER ROLE db_ddladmin ADD MEMBER [<ci-service-principal-display-name>];
   ```
2. Add the repository secret `PROD_DB_CONNECTION_STRING`: server, database, `Authentication=Active Directory Default;Encrypt=True`, and no password.
3. Create the GitHub environment `production-migrations` with required reviewers (the owner). If you are the only reviewer, allow self-review. Without required reviewers the job runs without approval.
4. Let CI reach the database through the Azure SQL firewall. GitHub's runner IPs change on every run and are not covered by "Allow Azure services", so each run opens a temporary firewall rule for its own IP and removes it afterwards (`.github/actions/prod-sql`). The CI service principal needs permission to manage firewall rules on that one server, and nothing broader. Once, as an Azure Owner (replace the placeholders; keep the real values out of the repo):
   ```json
   {
     "Name": "SQL Firewall Rule Manager (CI)",
     "Description": "Create and delete firewall rules on one SQL server",
     "Actions": [
       "Microsoft.Sql/servers/read",
       "Microsoft.Sql/servers/firewallRules/read",
       "Microsoft.Sql/servers/firewallRules/write",
       "Microsoft.Sql/servers/firewallRules/delete"
     ],
     "AssignableScopes": ["<resource id of the SQL server>"]
   }
   ```
   `az role definition create --role-definition role.json`, then `az role assignment create --assignee-object-id <service principal object id> --assignee-principal-type ServicePrincipal --role "SQL Firewall Rule Manager (CI)" --scope "<resource id of the SQL server>"`. Also add the environment secret `PROD_SQL_RESOURCE_GROUP` (the resource group that contains the SQL server) to `production-migrations`.
5. Verify without changing anything: Actions, **Verify production DB access**, Run workflow, approve it. It lists applied and pending migrations read-only, which proves the approval gate, the environment secret, the Azure login and database read access. It cannot prove the DDL permission; that is only proven by the first real migration, so keep that one small and additive.

## Future
Optional: a pre-migration database copy for risky changes (Basic tier supports `az sql db copy`).
