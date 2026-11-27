# Resource groups are created and permissioned by hand and are not managed here.
data "azurerm_resource_group" "web" {
  name = var.web_resource_group
}

data "azurerm_resource_group" "sql" {
  name = var.sql_resource_group
}

# --- Web app -----------------------------------------------------------------

resource "azurerm_service_plan" "belfast" {
  name                = "belfast"
  resource_group_name = data.azurerm_resource_group.web.name
  location            = data.azurerm_resource_group.web.location
  os_type             = "Windows"
  sku_name            = "F1"
}

resource "azurerm_windows_web_app" "belfastweb" {
  name                = "belfastweb"
  resource_group_name = data.azurerm_resource_group.web.name
  location            = data.azurerm_resource_group.web.location
  service_plan_id     = azurerm_service_plan.belfast.id

  https_only                                     = true
  client_affinity_enabled                        = true
  ftp_publish_basic_authentication_enabled       = false
  webdeploy_publish_basic_authentication_enabled = true

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    WEBSITE_AUTH_AAD_ALLOWED_TENANTS = var.tenant_id
  }

  # No password: the app signs in to SQL as its managed identity.
  connection_string {
    name  = "BudgetDbConnection"
    type  = "SQLAzure"
    value = "Server=tcp:${azurerm_mssql_server.sql.fully_qualified_domain_name},1433;Initial Catalog=${azurerm_mssql_database.budget.name};Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;Authentication=\"Active Directory Default\";"
  }

  # The Entra sign-in is the only thing protecting an API that has no auth of its own.
  auth_settings_v2 {
    auth_enabled           = true
    require_authentication = true
    unauthenticated_action = "RedirectToLoginPage"
    default_provider       = "azureactivedirectory"
    require_https          = true
    runtime_version        = "~1"

    active_directory_v2 {
      client_id                  = var.aad_client_id
      client_secret_setting_name = "MICROSOFT_PROVIDER_AUTHENTICATION_SECRET"
      tenant_auth_endpoint       = "https://sts.windows.net/${var.tenant_id}/v2.0"
      allowed_audiences          = ["api://${var.aad_client_id}"]
      allowed_applications       = [var.aad_client_id]
    }

    login {
      token_store_enabled               = true
      token_refresh_extension_time      = 72
      cookie_expiration_convention      = "FixedTime"
      cookie_expiration_time            = "08:00:00"
      nonce_expiration_time             = "00:05:00"
      validate_nonce                    = true
      preserve_url_fragments_for_logins = false
    }
  }

  site_config {
    always_on               = false
    ftps_state              = "FtpsOnly"
    http2_enabled           = true
    minimum_tls_version     = "1.3"
    scm_minimum_tls_version = "1.2"
    use_32_bit_worker       = true
    websockets_enabled      = false
    load_balancing_mode     = "LeastRequests"
    managed_pipeline_mode   = "Integrated"

    application_stack {
      current_stack  = "dotnet"
      dotnet_version = "v10.0"
      node_version   = "~16" # surfaces as WEBSITE_NODE_DEFAULT_VERSION; unused by a .NET app
    }

    cors {
      allowed_origins     = ["https://belfastweb.azurewebsites.net"]
      support_credentials = true
    }
  }

  logs {
    detailed_error_messages = true
    failed_request_tracing  = false

    http_logs {
      file_system {
        retention_in_days = 0
        retention_in_mb   = 35
      }
    }
  }

  sticky_settings {
    app_setting_names = ["MICROSOFT_PROVIDER_AUTHENTICATION_SECRET"]
  }

  lifecycle {
    # TEMPORARY: the Entra client secret is an app setting that was created in the
    # portal. Ignoring this one key keeps it out of config and state until it moves to
    # a federated identity credential (no secret) or Key Vault. Remove this block then.
    ignore_changes = [app_settings["MICROSOFT_PROVIDER_AUTHENTICATION_SECRET"]]
  }
}

# --- SQL (shared server: other, non-public projects keep their own databases on it) -----

resource "azurerm_mssql_server" "sql" {
  name                = var.sql_server_name
  resource_group_name = data.azurerm_resource_group.sql.name
  location            = data.azurerm_resource_group.sql.location
  version             = "12.0"

  minimum_tls_version           = "1.2"
  public_network_access_enabled = true

  azuread_administrator {
    login_username              = var.sql_admin_login
    object_id                   = var.sql_admin_object_id
    tenant_id                   = var.tenant_id
    azuread_authentication_only = true
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_mssql_database" "budget" {
  name                 = "budget"
  server_id            = azurerm_mssql_server.sql.id
  sku_name             = "Basic"
  max_size_gb          = 2
  collation            = "SQL_Latin1_General_CP1_CI_AS"
  storage_account_type = "Local"
  zone_redundant       = false

  lifecycle {
    prevent_destroy = true
  }
}

# Lets Azure services (the web app) reach the server. Client-IP rules and the per-run
# CI rule are managed elsewhere and intentionally not declared here.
resource "azurerm_mssql_firewall_rule" "allow_azure_services" {
  name             = "AllowAllWindowsAzureIps"
  server_id        = azurerm_mssql_server.sql.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
