# The web app proves itself to its Entra sign-in app registration with a managed identity (a "federated credential")
# instead of a client secret: nothing to store, leak or expire.
# Docs: "Configure Microsoft Entra authentication" (App Service), section on using a managed identity as the credential.
#
# It must be a USER-assigned identity (the web app's existing system-assigned one is used for SQL and is a different
# thing), and per Microsoft's advice it must be attached to nothing but this web app.
resource "azurerm_user_assigned_identity" "signin" {
  name                = "belfast-web-signin"
  resource_group_name = data.azurerm_resource_group.web.name
  location            = data.azurerm_resource_group.web.location
}

# Trust: the sign-in app registration accepts a token from exactly this identity.
resource "azuread_application_federated_identity_credential" "signin" {
  application_id = "/applications/${var.signin_app_object_id}"
  display_name   = "web-app-managed-identity"
  description    = "belfast-web-signin (user-assigned managed identity attached to the web app)"
  issuer         = "https://login.microsoftonline.com/${var.tenant_id}/v2.0"
  subject        = azurerm_user_assigned_identity.signin.principal_id
  audiences      = ["api://AzureADTokenExchange"]
}
