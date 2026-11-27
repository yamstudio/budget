# Only assigned users may sign in to the web app; without this, any user in the tenant could. This changes Entra, so it
# lives in this owner-applied layer. The assignment is created before the flag flips so the owner is never locked out.
resource "azuread_app_role_assignment" "owner" {
  app_role_id         = "00000000-0000-0000-0000-000000000000" # default access
  principal_object_id = var.app_owner_object_id
  resource_object_id  = var.aad_sp_object_id
}

resource "azuread_service_principal" "web_signin" {
  client_id                    = var.aad_client_id
  app_role_assignment_required = true
  owners                       = [var.app_owner_object_id]

  depends_on = [azuread_app_role_assignment.owner]
}
