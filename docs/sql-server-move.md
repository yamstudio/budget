# Moving the database to its own SQL server

The `budget` database used to live on a SQL server shared with other, non-public projects. It now gets its own server in
the web app's resource group, so that firewall rules, grants and names are not shared. This is the runbook. Server
and resource group names are deliberately not written here (public repo): they are in `infra/terraform.tfvars`.

Rules while doing this: Claude never connects to production data; the owner runs every data query. Nothing here deletes
anything until the owner has confirmed the copy matches.

## Status

| Step | State |
|---|---|
| 1. New server created empty, in Terraform (`azurerm_mssql_server.budget`, `infra/main.tf`) | done |
| 2. Copy the database to the new server (`az sql db copy`, destination name `budget`) | done |
| 3. Owner verifies the copy is identical (below) | done: every table's `n` and `chk` and the users matched |
| 4. Cutover: Terraform imports the new DB, forgets the old server/DB/rule, connection string switches | done (applied 2026-11-27) |
| 5. Delete the old `budget` database from the shared server (never the server itself) | **open**, owner, once the app is confirmed working on the new server |
| 6. Point `infra/identity` at the new server and update `docs/identities.md` | done in code; the owner still applies `infra/identity` (`docs/identities.md`, Manual steps) |

The app keeps using the old database until step 4. The old database is never modified by any step before 5.

## Step 3: verify the copy is identical

Run the same two queries against the old and the new `budget` database (portal Query editor with your Entra login, or any
client) and compare the output. They read only.

Row counts and a content checksum per table:

```sql
DECLARE @sql nvarchar(max) = N'';
SELECT @sql += CASE WHEN @sql = N'' THEN N'' ELSE N' UNION ALL ' END
  + N'SELECT ''' + s.name + N'.' + t.name + N''' AS tbl, COUNT_BIG(*) AS n, CHECKSUM_AGG(BINARY_CHECKSUM(*)) AS chk FROM '
  + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name)
FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id;
SET @sql += N' ORDER BY tbl';
EXEC sp_executesql @sql;
```

Database users (the web app's managed identity must be present on the new one):

```sql
SELECT name, type_desc, authentication_type_desc FROM sys.database_principals
WHERE type NOT IN ('R') AND name NOT IN ('dbo','guest','INFORMATION_SCHEMA','sys') ORDER BY name;
```

**Identical means:** every table has the same `n` and `chk` on both sides (including `__EFMigrationsHistory`), and the
same users exist. If anything differs, stop: the old database is untouched, so re-copy
(`az sql db delete` the new one, then copy again).

## Step 4: cutover

A Terraform PR that: imports the new database into state, forgets the old server, database and firewall rule with
`removed { destroy = false }` (the old server is shared; Terraform must never destroy it), and builds the app's
connection string from the new server. Applying it is the cutover (the web app restarts). Smoke test the site afterwards.

Rollback: point the connection string back at the old server (it is untouched until step 5).

## Step 5: delete the old database

Only after step 3 passed and the app works on the new server. The owner deletes the old `budget` database from the shared
server; point-in-time restore on the shared server can bring back a deleted database for a few days. Never delete the
server: other projects use it. Then update `docs/identities.md` and the follow-ups in `infra/README.md`.
