# Terraform for the Azure resources

Two layers, two state files, two appliers. **Read `docs/identities.md` first.**

| Directory | Manages | Applied by | State key |
|---|---|---|---|
| `infra/` | web app, its plan, its own SQL server, the `budget` database, the Azure-services firewall rule | CI as `belfast-infra`, after approval (not wired up yet) | `budget.tfstate` |
| `infra/identity/` | the four CI identities, their GitHub OIDC trust and Azure roles, and "assignment required" on the Entra sign-in app | the owner, from a laptop | `identity.tfstate` |

Resource groups are created by hand and only read here.

**This repo is public.** Environment-specific names and IDs (subscription, tenant, resource groups, SQL server, state
storage) live in gitignored files in each layer, never in `.tf`:

- `terraform.tfvars`: values for every variable in that layer's `variables.tf`.
- `backend.hcl`: copy that layer's `backend.hcl.example` and fill it in.

State is in a private, versioned, Entra-only blob container. `infra/`'s state currently contains the Entra client secret
(an app setting on the web app, see the `ignore_changes` note in `main.tf`), so treat state as a secret.

## Use

```zsh
az login
cd infra            # or infra/identity
terraform init -backend-config=backend.hcl
terraform plan
```

Read the plan before anything else. Never apply without the owner's say-so: this is the production environment.
CI does not run Terraform yet; the release workflow still deploys `.azure/Belfast.Template.json`.

**Do not paste plan output anywhere public** while the client secret is still an app setting: a plan that shows an
`app_settings` change prints it.

## Known follow-ups

- Replace the Entra client secret with a federated credential (or Key Vault) and drop the `ignore_changes` block.
- Plan on PRs and apply on release from CI with the identities from `infra/identity/`, then remove the ARM template.
- `imports.tf` (both layers) and `infra/moved.tf` are only needed once; harmless afterwards.
