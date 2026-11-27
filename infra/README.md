# Terraform for the Azure resources

Two layers, two state files, two appliers. **Read `docs/identities.md` first.**

| Directory | Manages | Applied by | State |
|---|---|---|---|
| `infra/` | web app, its plan, its own SQL server, the `budget` database, the Azure-services firewall rule | the release workflow as `belfast-infra`, after approval | container `tfstate`, key `budget.tfstate` |
| `infra/identity/` | the four CI identities, their GitHub OIDC trust and Azure roles, the web app's sign-in identity, the Entra sign-in app registration (`belfast-web`) and "assignment required" on it | the owner, from a laptop | container `tfstate-identity`, key `identity.tfstate` |

Resource groups are created by hand and only read here.

**This repo is public.** Environment-specific names and IDs (subscription, tenant, resource group, SQL server, state
storage, the owner's login) live in gitignored files in each layer, never in `.tf`:

- `terraform.tfvars`: values for every variable in that layer's `variables.tf`.
- `backend.hcl`: copy that layer's `backend.hcl.example` and fill it in.

In CI the same two files come from the `TF_VARS` and `TF_BACKEND` secrets (`.github/actions/tf-config`).

State is in a private, versioned, Entra-only blob container. It holds no secrets by design (the web app has none), but
state can contain whatever an attribute holds, so still treat it as sensitive.

## Use

```zsh
az login
cd infra            # or infra/identity
terraform init -backend-config=backend.hcl
terraform plan
```

Read the plan before anything else. Never apply without the owner's say-so: this is the production environment. Do not
paste plan output anywhere public, and never put a secret in an app setting: Terraform shows and stores whatever it holds.

## In CI

- `infra-plan.yml`: read-only `terraform plan -refresh=false` on pull requests that touch `infra/`, as `belfast-plan` (it shows what the change would do relative to the last applied state; drift is caught by the release).
- `deploy.yml`, `infra` job: on a release, if `infra/` changed since the previous release, an approval-gated
  `terraform apply` as `belfast-infra`. It refuses to delete or replace anything; apply such a change by hand.
- `ci.yml`: `terraform fmt -check` and `validate` for both layers (no credentials).
- `infra/identity/` is never applied by CI.
