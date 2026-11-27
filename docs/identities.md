# CI identities: who can do what, and why

Read this before touching `infra/identity/`, `.github/workflows/`, or any Azure role assignment for this app.

**The repo is public.** Never put subscription, tenant, resource group, SQL server or storage account names into a
committed file. They live in gitignored `terraform.tfvars` and `backend.hcl` files (see `infra/README.md`).

## The one-paragraph version

GitHub Actions has **no passwords or keys** for Azure. Each job proves who it is with a short-lived token that
GitHub signs, and Entra ID hands back an Azure access token only if that token names a context we pre-approved.
There are four CI identities, one per **privilege boundary**, each named `belfast-<purpose>`:

| Identity | Used by | May do |
|---|---|---|
| `belfast-plan` | `terraform plan` on pull requests | read the app's resources and Terraform state |
| `belfast-infra` | `terraform apply` on release | change the web app, plan, SQL server and `budget` DB; write state |
| `belfast-deploy` | the deploy job | publish code to the web app, nothing else |
| `belfast-migrate` | the migrate job | open/close its own SQL firewall rule; (separately) alter the `budget` schema |

The names say *what they protect*, not where they are called from. A second app gets its own set (`<app>-migrate` ...),
never a shared one: sharing is exactly how the old `GitHub-Automation` became over-privileged.

## Two Terraform layers, two appliers

```
infra/identity/   Entra + role assignments.   Applied by the OWNER from a laptop, rarely.   State: identity.tfstate
infra/            web app, plan, SQL, DB.     Applied by CI as belfast-infra, after approval. State: budget.tfstate
```

**The rule: the identity that can change infrastructure must never be able to change who is allowed to.** So
`belfast-infra` has no rights over Entra or role assignments, and CI never applies `infra/identity/`. If you are
tempted to give CI that ability "to save a manual step", don't: a compromised pipeline could then grant itself anything.

## How a job logs in (OIDC, no stored secret)

```
1. Job starts in a GitHub environment (e.g. production-migrations), after any required approval.
   GitHub mints a signed token for this run:
     issuer   token.actions.githubusercontent.com
     subject  repo:<owner>/budget:environment:production-migrations     <- set by GitHub, not by the workflow
     audience api://AzureADTokenExchange
2. azure/login sends it to Entra: "I am app <belfast-migrate client id>". (client id / tenant id / subscription id
   are plain identifiers, stored as GitHub environment *variables*, not secrets)
3. Entra checks the signature against GitHub's public keys AND that belfast-migrate has a federated credential
   whose issuer + subject + audience match exactly. If not: login fails.
4. Entra returns a normal Azure access token for belfast-migrate, valid about an hour. Later steps use it.
```

Why it is safe: a workflow on a feature branch gets subject `...:ref:refs/heads/x` or `...:pull_request`, which matches
only `belfast-plan`. It cannot become `infra`, `deploy` or `migrate`, whose subjects are GitHub *environments*, and an
environment's protection rules (required reviewer) must pass first.

A workflow job needs `permissions: { id-token: write, contents: read }` to request the token.

## Who can do what (source of truth: the `grants` table in `infra/identity/main.tf`)

| Identity | Scope | Role |
|---|---|---|
| plan | web resource group | Reader |
| plan | SQL server | Reader |
| plan | Terraform state account | Storage Blob Data Reader |
| infra | web resource group | Contributor |
| infra | SQL server | Contributor |
| infra | Terraform state account | Storage Blob Data Contributor |
| deploy | the web app only | Website Contributor |
| migrate | SQL server | `belfast-sql-firewall-rule-writer` (custom: firewall rules read/write/delete only) |
| migrate | `budget` database | `db_ddladmin`, `db_datareader`, `db_datawriter` (a SQL user, **manual**, see below) |

Consequences worth remembering:
- `deploy` cannot alter the schema, and `migrate` cannot ship code.
- Nothing here can touch the server's other databases (they belong to other, non-public projects).
- The SQL server is **shared** with those projects, so `migrate`'s firewall right is server-wide. Accepted until
  they move to their own server.
- `plan` runs on pull requests from any same-repo branch, so it must stay read-only.

## Manual steps (Terraform cannot do these), in order

1. **Apply the identity layer** (owner, laptop): `cd infra/identity`, `az login`,
   `terraform init -backend-config=backend.hcl`, `terraform plan`, read it, then `terraform apply`.
2. **Create the database user** for `belfast-migrate`. Terraform cannot create SQL users and the server is Entra-only,
   so connect to the `budget` database as the server's Entra admin (the owner) and run:
   ```sql
   CREATE USER [belfast-migrate] FROM EXTERNAL PROVIDER;
   ALTER ROLE db_ddladmin   ADD MEMBER [belfast-migrate];  -- create/alter tables
   ALTER ROLE db_datareader ADD MEMBER [belfast-migrate];  -- read the EF migrations history
   ALTER ROLE db_datawriter ADD MEMBER [belfast-migrate];  -- record applied migrations
   ```
   Deliberately not `db_owner`. If a future migration fails with a permission error, grant the minimum extra right.
3. **GitHub environments**: create `production-infra` with the owner as required reviewer. Existing: `production`
   (deploy) and `production-migrations` (reviewer-gated).
4. **GitHub variables** (not secrets): per environment set `AZURE_CLIENT_ID` (from `terraform output client_ids`),
   plus `AZURE_TENANT_ID` and `AZURE_SUBSCRIPTION_ID`. The plan identity's client id is a repository variable, since
   pull-request jobs have no environment.
5. **Clean up** only after the new pipeline is proven: delete the old repo secrets and the old Entra client secret
   on the sign-in app.

## Do not

- **Delete or edit `GitHub-Automation`.** It is the *old* shared identity, also used by other projects (it has rights
  on other resource groups and on the shared server). This repo stops using it; deleting
  it is a separate decision for after those projects have moved. Its current client secret expires **2026-12-22**.
- **Rename `Belfast Web Role Account`.** It is the Entra app behind the web app's login page, not a CI identity.
- **Make a CI identity able to apply `infra/identity/`.** See the rule above.
- **Commit** `terraform.tfvars`, `backend.hcl`, state, or any name/id from them.

## Adding an identity (or a second app)

Add an entry to `local.identities` and rows to `local.grants` in `infra/identity/main.tf`, name it `<app>-<purpose>`,
bind its subject to one environment, apply from the laptop, and update the two tables above. A new app in another
database also needs its own SQL user, never `belfast-migrate`.

## State moves (done once, in this change)

The sign-in app's two resources (`azuread_service_principal.web_signin`, `azuread_app_role_assignment.owner`) moved
from `infra/` to `infra/identity/`. `infra/identity/imports.tf` adopts them; `infra/moved.tf` forgets them with
`removed { destroy = false }`. Both are safe in either order. Delete the import and removed blocks once applied.

## Known gotchas and open follow-ups

- **Do not enable PR-time `terraform plan` in CI until the Entra client secret is out of the web app's settings.**
  The secret is an app setting; a plan that shows any `app_settings` difference prints it, and Actions logs on a public
  repo are public. The fix is a federated credential for the sign-in app (no secret), then delete the setting and the
  `ignore_changes` block in `infra/main.tf`. That is the step *before* turning on plan in CI.
- `belfast-plan` may need more than Reader to read the web app's configuration. Verify when wiring CI.
- Whether a federated credential works for the web app's sign-in on the Free App Service tier is unverified; fall back
  to a Key Vault reference if it does not.
- The SQL DDL permission for `belfast-migrate` is only proven by the first real migration.
- Stale SQL firewall rules (two client-IP rules) and SCM basic auth on the web app are still open (the latter goes
  away when deploys use `belfast-deploy`).
