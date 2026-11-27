# Lessons: migrating a production Azure SQL database from GitHub Actions

Written 2026-11-26 after getting this working end to end (release -> approval -> migrate -> deploy -> smoke check). Stack-neutral on purpose: it applies to any tool (EF Core here; Alembic or others elsewhere). No identifiers belong in this file: the repo and its Actions logs are public.

## Shape that worked
- **Merging is not deploying.** CI runs on PRs and on the main branch; production changes only when a person publishes a GitHub Release (tag `v*`). A `guard` job refuses any run that is not a `v*` tag on the main branch's history (a manual run from a feature branch must not ship).
- **Migrations are a separate, approval-gated job** in a dedicated GitHub environment, run only when the release changes migration files (compared with the previous release tag). The run summary shows the SQL before anyone approves. Deploy waits for the migration job (or its skip) and never runs if anything upstream failed.
- **Climb a ladder of proof:** a read-only "verify access" workflow first, then a release whose migration is a no-op, then the first real (small, additive) migration.

## Azure SQL with Entra-only authentication
- ARM roles do not grant data access. The CI service principal needs a **database user** created by the Entra admin: `CREATE USER [<principal display name>] FROM EXTERNAL PROVIDER;` plus roles (read, write, and DDL: `db_datareader`, `db_datawriter`, `db_ddladmin`). A typo in the name gives "principal could not be found".
- **The server firewall blocks GitHub runners**, whose IPs change every run and are not covered by "Allow Azure services". Open a rule for the runner's own IP at the start (`az sql server firewall-rule create`), wait for it to take effect (retry up to ~5 minutes), and delete it at the end in a step with `if: always()`. The CI principal needs permission to manage firewall rules on that server (Contributor on the server works; a custom role with only the firewall-rule actions is tighter). Name rules with the run id so concurrent runs do not collide.
- **Verify cleanup, do not assume it.** `az sql server firewall-rule delete` has no `--yes`; an `|| echo` fallback hid the failure and left a rule behind. List, delete if present, list again, fail if still there.
- Passwordless connection strings: the tool must pick up the `azure/login` session (EF Core: `Authentication=Active Directory Default`). For other stacks check how they obtain an Entra token (for example an access token from `az account get-access-token --resource https://database.windows.net/`); untested here for Python/pyodbc.
- Long term: replace the stored service-principal secret (`AZURE_CREDENTIALS`, which expires silently) with OIDC federation scoped per environment.

## GitHub environments
- Environment secrets are released only to jobs that declare the environment and pass its rules. Put production-only secrets there.
- **The environment's "Deployment branches and tags" policy must allow tags if releases deploy from tags.** "Protected branches only" rejects a `v*` tag run before any step starts: the job fails with no steps and no log. The only clue is the job's check-run annotation (`gh api repos/<owner>/<repo>/check-runs/<job id>/annotations`). Allow branch `main` (for manual verify runs) and tag `v*`.
- The workflow file a release run uses is the one at the tag's commit, so repairing a workflow bug on main does not repair an existing tag. Fix, then cut a new tag. A settings-only problem (like the policy above) can be fixed by "Re-run failed jobs" on the same run.
- Required reviewers with self-review allowed is the approval gate for a one-person project; disable "allow administrators to bypass".

## Public logs
- Mask the server name with `::add-mask::` before anything can print it, never print raw tool or `az` errors (they contain IPs, server names, subscription and resource-group ids), and do not write raw tool output to the job summary. Map failures to generic messages (firewall, login, database, unknown). The first verify run leaked a server name this way.
- Secret values are masked automatically, but only for secrets the job references, and not substrings of them.

## False passes (the expensive lessons)
- Default `run` steps use `bash -e` with **no `pipefail`**: `failing-command | tee file` succeeds. Use `shell: bash` and capture output first (`out="$(cmd 2>&1)"`).
- **Some tools swallow connection errors.** `dotnet ef migrations list` warns, still lists migrations and exits 0. Assert on real output (and on the absence of the warning), not on the exit code alone. Check whether your migration tool's "show current revision" command does the same before using it as a connectivity proof.
- `dotnet ef` does not restore packages: `dotnet restore` first on a fresh checkout.
- A green run is not proof. Test each step script in a fresh `git clone` in a scratch directory, with a deliberate failure, and use a stateful stub for `az` to rehearse cleanup paths. Check the end state in Azure afterwards (leftover rules, applied migrations).
- Pin the SDK/runtime band (`global.json` here): the runner's default moved to SDK 11 while the project targets 10.

## Sharing one SQL server between projects
- Use one database and one database user per project. Do not give a project's CI principal server-level data rights.
- Firewall rules are server-wide: while a rule is open for one project's CI run, that runner's IP can reach every database on the host (still subject to database logins). Per-run names and `always()` cleanup matter more when two pipelines share the server. A stuck rule from one project affects both.
- A server-scope Contributor assignment for one project's CI principal also lets it modify the other project's database resources; prefer the narrow firewall-only custom role when a server is shared.

## Safety net
- Record a restore point (UTC) in the migration run summary; the Basic tier keeps 7 days of point-in-time restore and no long-term backup.
- Prefer additive migrations (the migration runs before the new code is deployed) and split destructive changes into expand then contract. Rollback is redeploying an older tag; the database is not rolled back automatically.
