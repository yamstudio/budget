# The four identities GitHub Actions uses for this app, and exactly what each may do.
# Read docs/identities.md first. There are NO passwords or keys here: GitHub proves who it is with a
# short-lived OIDC token, and each identity trusts only one subject (a PR, or one GitHub environment).
#
# Applied by the owner from a laptop. CI must never be able to change this file's effects, otherwise the
# thing that changes infrastructure could also change who is allowed to.

locals {
  # name => the GitHub context allowed to become this identity.
  identities = {
    plan = {
      purpose = "terraform plan on pull requests (read-only)"
      subject = "repo:${var.github_repo}:pull_request"
    }
    infra = {
      purpose = "terraform apply on release (approval-gated environment)"
      subject = "repo:${var.github_repo}:environment:production-infra"
    }
    deploy = {
      purpose = "publish the app to the web app"
      subject = "repo:${var.github_repo}:environment:production"
    }
    migrate = {
      purpose = "apply EF schema migrations to the budget database (approval-gated environment)"
      subject = "repo:${var.github_repo}:environment:production-migrations"
    }
  }
}

# --- Lookups: nothing below is created here, only referenced ----------------------------------------

data "azurerm_resource_group" "web" {
  name = var.web_resource_group
}

data "azurerm_mssql_server" "sql" {
  name                = var.sql_server_name
  resource_group_name = var.sql_resource_group
}

data "azurerm_windows_web_app" "web" {
  name                = "belfastweb"
  resource_group_name = var.web_resource_group
}

data "azurerm_storage_account" "tfstate" {
  name                = var.tfstate_storage_account
  resource_group_name = var.web_resource_group
}

# --- The identities --------------------------------------------------------------------------------

resource "azuread_application" "ci" {
  for_each = local.identities

  display_name     = "belfast-${each.key}"
  description      = "GitHub Actions: ${each.value.purpose}. Managed by infra/identity; see docs/identities.md."
  sign_in_audience = "AzureADMyOrg"
  owners           = [var.app_owner_object_id]
}

resource "azuread_service_principal" "ci" {
  for_each = local.identities

  client_id   = azuread_application.ci[each.key].client_id
  description = each.value.purpose
  owners      = [var.app_owner_object_id]
}

# The trust: Entra will hand out a token for belfast-<name> ONLY to a GitHub job whose token says it is
# exactly this subject. A workflow on any other branch or environment gets refused.
resource "azuread_application_federated_identity_credential" "ci" {
  for_each = local.identities

  application_id = azuread_application.ci[each.key].id
  display_name   = "github-${each.key}"
  description    = each.value.subject
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = each.value.subject
  audiences      = ["api://AzureADTokenExchange"]
}

# --- Rights ----------------------------------------------------------------------------------------

# belfast-migrate opens and closes its own temporary SQL firewall rule for the runner (see
# .github/actions/prod-sql) and nothing else on the server. Tighter than the built-in "SQL Server
# Contributor". The server is shared with another app, so this applies server-wide: an accepted overlap.
resource "azurerm_role_definition" "sql_firewall_rule_writer" {
  name        = "belfast-sql-firewall-rule-writer"
  scope       = data.azurerm_mssql_server.sql.id
  description = "Create, list and delete SQL server firewall rules, nothing else."

  permissions {
    actions = [
      "Microsoft.Sql/servers/read",
      "Microsoft.Sql/servers/firewallRules/read",
      "Microsoft.Sql/servers/firewallRules/write",
      "Microsoft.Sql/servers/firewallRules/delete",
    ]
  }

  assignable_scopes = [data.azurerm_mssql_server.sql.id]
}

locals {
  scopes = {
    web_resource_group = data.azurerm_resource_group.web.id
    sql_server         = data.azurerm_mssql_server.sql.id
    web_app            = data.azurerm_windows_web_app.web.id
    tfstate_account    = data.azurerm_storage_account.tfstate.id
  }

  # THE access table. One row = one grant. If it is not in this list, the identity cannot do it.
  # Database-level rights for belfast-migrate (a SQL user in `budget`) cannot be expressed in Terraform:
  # see docs/identities.md, "Manual steps".
  grants = [
    { identity = "plan", scope = "web_resource_group", role = "Reader" },
    { identity = "plan", scope = "sql_server", role = "Reader" },
    { identity = "plan", scope = "tfstate_account", role = "Storage Blob Data Reader" },

    { identity = "infra", scope = "web_resource_group", role = "Contributor" },
    { identity = "infra", scope = "sql_server", role = "Contributor" },
    { identity = "infra", scope = "tfstate_account", role = "Storage Blob Data Contributor" },

    { identity = "deploy", scope = "web_app", role = "Website Contributor" },

    { identity = "migrate", scope = "sql_server", role = azurerm_role_definition.sql_firewall_rule_writer.name },
  ]
}

resource "azurerm_role_assignment" "ci" {
  for_each = { for g in local.grants : "${g.identity}/${g.scope}/${g.role}" => g }

  scope                = local.scopes[each.value.scope]
  role_definition_name = each.value.role
  principal_id         = azuread_service_principal.ci[each.value.identity].object_id
}
