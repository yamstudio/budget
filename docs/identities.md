# Identities and secrets: who can do what, and why

Read this before touching `infra/identity/`, `.github/workflows/`, or any Azure role assignment for this app.

**The repo is public.** Never put subscription, tenant, resource group, SQL server, storage account or the owner's
login into a committed file, a workflow log, a PR or a commit message. They live in gitignored `terraform.tfvars` and
`backend.hcl` files locally (see `infra/README.md`) and in two masked GitHub secrets in CI (below). Also never name the
owner's other, non-public projects.

## The model in one paragraph

Nothing in GitHub or Azure holds a password, key or client secret for this app. Each workflow job proves who it is with
a short-lived token that GitHub signs, and Entra ID hands back an Azure access token only if that token names a context
we pre-approved. There are four CI identities, one per **privilege boundary**, each named `belfast-<purpose>`:

| Identity | Used by | May do |
|---|---|---|
| `belfast-plan` | `terraform plan` on pull requests (`infra-plan.yml`) | read the app's resources and Terraform state |
| `belfast-infra` | `terraform apply` in a release (`infra` job) | change the web app, plan, SQL server and `budget` DB; write state |
| `belfast-deploy` | the release `deploy` job | publish code to the web app, nothing else |
| `belfast-migrate` | the release `migrate` job and `verify-prod-db.yml` | open/close its own SQL firewall rule; alter the `budget` schema (as a SQL user) |

The names say *what they protect*, not where they are called from. A second app gets its own set (`<app>-migrate` ...),
never a shared one.

## Two Terraform layers, two appliers

```
infra/identity/   Entra + role assignments.   Applied by the OWNER from a laptop, rarely.   State: container tfstate-identity
infra/            web app, plan, SQL, DB.     Applied by CI as belfast-infra, after approval. State: container tfstate
```

**The rule: the identity that can change infrastructure must never be able to change who is allowed to.** So
`belfast-infra` has no rights over Entra or role assignments, and CI never applies `infra/identity/`. Do not give CI that
ability "to save a manual step": a compromised pipeline could then grant itself anything.

## How a job logs in (OIDC, no stored secret)

```
1. A job starts in a GitHub environment (e.g. production-migrations), after any required approval.
   GitHub mints a signed token for this run:
     issuer   token.actions.githubusercontent.com
     subject  repo:<owner>/budget:environment:production-migrations     <- set by GitHub, not by the workflow
     audience api://AzureADTokenExchange
2. azure/login sends it to Entra: "I am app <belfast-migrate client id>". (client, tenant and subscription ids are
   plain GitHub *variables*, not secrets)
3. Entra checks the signature against GitHub's public keys AND that belfast-migrate has a federated credential whose
   issuer + subject + audience match exactly. If not: login fails.
4. Entra returns a normal Azure access token for belfast-migrate, valid about an hour. Later steps use it.
```

A workflow on a feature branch gets subject `...:ref:refs/heads/x` or `...:pull_request`, which matches only
`belfast-plan`. It cannot become `infra`, `deploy` or `migrate`, whose subjects are GitHub *environments*, and an
environment's rules (required reviewer, `v*` tags only) must pass first. A job needs
`permissions: { id-token: write, contents: read }` to request the token. The token behind `azure/login` lives only a few
minutes, so the migrate job logs in again right before the database work.

## Who can do what (source of truth: the `grants` table in `infra/identity/main.tf`)

| Identity | Scope | Role |
|---|---|---|
| plan | web resource group | Reader |
| plan | state container `tfstate` | Storage Blob Data Reader |
| infra | web resource group | Reader (only to look the group up) |
| infra | App Service plan, web app, SQL server (each one) | Contributor |
| infra | state container `tfstate` | Storage Blob Data Contributor |
| infra | the `belfast-web-signin` identity | Managed Identity Operator (so it can attach it to the web app) |
| deploy | the web app only | Website Contributor |
| migrate | SQL server | `belfast-sql-firewall-rule-writer` (custom: firewall rules read/write/delete only) |
| migrate | `budget` database | `db_ddladmin`, `db_datareader`, `db_datawriter` (a SQL user, **manual**, see below) |

Consequences worth remembering:
- `deploy` cannot alter the schema, and `migrate` cannot ship code.
- **CI cannot reach the Terraform state account or the identity layer's state.** `infra` has Contributor on the three
  resources it manages, *not* on the resource group, because the state account lives in that group: a group-wide
  Contributor could re-enable shared-key access and read state. The state roles are scoped to the `tfstate` container
  only; the identity layer's state is in a different container (`tfstate-identity`) that no CI identity can touch.
- Consequently CI can change the existing web app, plan and SQL server but **cannot create a new top-level resource**.
  Adding one is an owner step: apply once from the laptop, or add a row to the `grants` table.
- `plan` runs on pull requests from any same-repo branch, so it must stay read-only.

## How the web app signs users in (no secret)

The login page is App Service's built-in Entra sign-in, backed by an app registration. The app proves itself to that
registration with a **user-assigned managed identity**, `belfast-web-signin` (`infra/identity/signin.tf`), not a client
secret:

1. The app registration has a *federated credential* trusting that identity.
2. The web app has that identity attached (`infra/main.tf`, `identity` block) next to its system-assigned one, which is
   used for SQL and is a different thing. Microsoft advises attaching this identity to nothing else.
3. The app setting `OVERRIDE_USE_MI_FIC_ASSERTION_CLIENTID` holds the identity's **client id** (not the app
   registration's), is slot-sticky, and is named as the auth config's "client secret setting name". That is what makes
   App Service use the identity instead of a secret.
4. "Assignment required" is on and only the owner is assigned (`infra/identity/access.tf`), so only the owner can sign in.

Apply order matters: the identity layer first (it creates the identity), then `infra/` (it looks it up). If sign-in
breaks, check that setting, and that the app registration still has its federated credential. To test sign-in after a
change use a private window and `/.auth/logout` first: a session cookie lasts 8 hours and would hide a broken credential.
Never put a secret in an app setting: Terraform shows and stores whatever a setting holds.

## What GitHub holds

| Kind | Name | Where | What |
|---|---|---|---|
| secret | `TF_VARS` | repository | contents of `infra/terraform.tfvars` |
| secret | `TF_BACKEND` | repository | contents of `infra/backend.hcl` |
| variable | `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | repository | plain ids |
| variable | `AZURE_CLIENT_ID_PLAN` | repository | client id of `belfast-plan` (PR jobs have no environment) |
| variable | `AZURE_CLIENT_ID` | environments `production` (deploy), `production-migrations` (migrate), `production-infra` (infra) | client id of that identity |

The two secrets are identifiers, not credentials. `.github/actions/tf-config` writes them to the files Terraform expects,
masks every value in the logs *before* anything can print it, and derives the passwordless connection string and resource
group for the migration jobs. Fork PRs get no secrets or OIDC token and are skipped. After changing a local `tfvars` or
`backend.hcl`, update the matching secret (for example `gh secret set TF_VARS < infra/terraform.tfvars`).

## Rebuilding from scratch (one-time steps)

1. **Identity layer** (owner, laptop): `cd infra/identity`, `az login`, `terraform init -backend-config=backend.hcl`,
   `terraform plan`, read it, `terraform apply`. `terraform output client_ids` lists the four client ids. It also needs
   its own state container (`tfstate-identity`) to exist.
2. **Database user** for `belfast-migrate`. Terraform cannot create SQL users and the server is Entra-only, so connect to
   the `budget` database as the server's Entra admin (the owner) and run:
   ```sql
   CREATE USER [belfast-migrate] FROM EXTERNAL PROVIDER;
   ALTER ROLE db_ddladmin   ADD MEMBER [belfast-migrate];  -- create/alter tables
   ALTER ROLE db_datareader ADD MEMBER [belfast-migrate];  -- read the EF migrations history
   ALTER ROLE db_datawriter ADD MEMBER [belfast-migrate];  -- record applied migrations
   ```
   Deliberately not `db_owner`. If a migration fails with a permission error, grant the minimum extra right. If
   `FROM EXTERNAL PROVIDER` cannot find the principal (the server has no directory-lookup identity), create the user with
   `WITH SID = <client id as binary(16)>, TYPE = E` instead. Delete the temporary client-IP firewall rule the query editor adds.
3. **GitHub environments**: `production` (deploy), `production-migrations` and `production-infra`, each with the owner as
   required reviewer where gated and a deployment rule that allows `v*` tags. Set the variables above and the two secrets.

## Do not

- **Rename `Belfast Web Role Account`.** It is the Entra app registration behind the web app's login page, not a CI identity.
- **Make a CI identity able to apply `infra/identity/`.** See the rule above.
- **Commit** `terraform.tfvars`, `backend.hcl`, state, or any name or id from them.

## Adding an identity (or a second app)

Add an entry to `local.identities` and rows to `local.grants` in `infra/identity/main.tf`, name it `<app>-<purpose>`,
bind its subject to one environment, apply from the laptop, and update the tables above. A new app in another database
also needs its own SQL user, never `belfast-migrate`.

## Known limits

- `belfast-plan` may need more than Reader to read the web app's configuration; add the narrowest extra read right when
  the first PR plan shows a permission error.
- The `belfast-migrate` DDL permission is only proven by the first real migration.
- `belfast-infra` can read the web app's settings. They hold no secrets (passwordless SQL connection string, managed-identity
  sign-in), so keep it that way.
