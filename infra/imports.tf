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
  to = azurerm_mssql_database.budget_db
  id = "/subscriptions/${var.subscription_id}/resourceGroups/${var.web_resource_group}/providers/Microsoft.Sql/servers/${var.sql_server_name}/databases/budget"
}
