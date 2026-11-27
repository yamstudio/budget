# Only assigned users may sign in to the web app; without this, any user in the tenant could. This changes Entra, so it
# lives in this owner-applied layer. (When rebuilding from scratch there is a brief moment after the flag flips and
# before the assignment exists; nobody is signing in then.)
resource "azuread_service_principal" "web_signin" {
  client_id                    = azuread_application.web.client_id
  app_role_assignment_required = true
  owners                       = [var.app_owner_object_id]
}

resource "azuread_app_role_assignment" "owner" {
  app_role_id         = "00000000-0000-0000-0000-000000000000" # default access
  principal_object_id = var.app_owner_object_id
  resource_object_id  = azuread_service_principal.web_signin.object_id
}
