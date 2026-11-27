# These two moved to infra/identity (they change Entra, which only the owner's laptop may do). Forget them
# here WITHOUT destroying them. Safe to delete once applied.
removed {
  from = azuread_service_principal.web_signin
  lifecycle {
    destroy = false
  }
}

removed {
  from = azuread_app_role_assignment.owner
  lifecycle {
    destroy = false
  }
}

# The database moved to its own server (docs/sql-server-move.md). Forget the old resources on the shared server.
# destroy = false is essential: that server is shared with other projects and must never be destroyed by Terraform.
removed {
  from = azurerm_mssql_server.sql
  lifecycle {
    destroy = false
  }
}

removed {
  from = azurerm_mssql_database.budget
  lifecycle {
    destroy = false
  }
}

removed {
  from = azurerm_mssql_firewall_rule.allow_azure_services
  lifecycle {
    destroy = false
  }
}
