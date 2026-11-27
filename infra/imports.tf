# Adopt the existing resources into state. Safe to delete once applied.
import {
  to = azurerm_service_plan.belfast
  id = "/subscriptions/${var.subscription_id}/resourceGroups/${var.web_resource_group}/providers/Microsoft.Web/serverFarms/belfast"
}

import {
  to = azurerm_windows_web_app.belfastweb
  id = "/subscriptions/${var.subscription_id}/resourceGroups/${var.web_resource_group}/providers/Microsoft.Web/sites/belfastweb"
}

import {
  to = azurerm_mssql_server.sql
  id = "/subscriptions/${var.subscription_id}/resourceGroups/${var.sql_resource_group}/providers/Microsoft.Sql/servers/${var.sql_server_name}"
}

import {
  to = azurerm_mssql_database.budget
  id = "/subscriptions/${var.subscription_id}/resourceGroups/${var.sql_resource_group}/providers/Microsoft.Sql/servers/${var.sql_server_name}/databases/budget"
}

import {
  to = azurerm_mssql_firewall_rule.allow_azure_services
  id = "/subscriptions/${var.subscription_id}/resourceGroups/${var.sql_resource_group}/providers/Microsoft.Sql/servers/${var.sql_server_name}/firewallRules/AllowAllWindowsAzureIps"
}

import {
  to = azuread_service_principal.web_signin
  id = "/servicePrincipals/${var.aad_sp_object_id}"
}

import {
  to = azuread_app_role_assignment.owner
  id = "/servicePrincipals/${var.aad_sp_object_id}/appRoleAssignedTo/${var.owner_assignment_id}"
}
