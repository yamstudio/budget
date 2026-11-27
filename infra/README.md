# Terraform for the Azure resources

Manages the web app, its plan, the shared SQL server, the `budget` database, the Azure-services firewall rule, and the
"assignment required" setting on the Entra sign-in app. Resource groups are created by hand and only read here.
The `sync` app shares the SQL server but owns nothing here.

**This repo is public.** Environment-specific names and IDs (subscription, tenant, resource groups, SQL server, state
storage) live in two gitignored files, never in `.tf`:

- `terraform.tfvars`: values for every variable in `variables.tf`.
- `backend.hcl`: copy `backend.hcl.example` and fill it in.

State is in a private, versioned, Entra-only blob container. It currently contains the Entra client secret (an app
setting on the web app, see the `ignore_changes` note in `main.tf`), so treat state as a secret.

## Use

```zsh
az login
terraform init -backend-config=backend.hcl
terraform plan
```

Read the plan before anything else. Never apply without the owner's say-so: this is the production environment.
CI does not run Terraform yet; the release workflow still deploys `.azure/Belfast.Template.json`.

## Known follow-ups

- Replace the Entra client secret with a federated credential (or Key Vault) and drop the `ignore_changes` block.
- Plan on PRs and apply on release from CI, with a narrow identity, then remove the ARM template.
- `imports.tf` is only needed to adopt existing resources; it is harmless once they are in state.
