# The sign-in app resources already exist and were previously in ../ state. Adopt them here; ../ drops them
# from its state (removed block, no destroy). Safe to delete once applied.
import {
  to = azuread_service_principal.web_signin
  id = "/servicePrincipals/${var.aad_sp_object_id}"
}

import {
  to = azuread_app_role_assignment.owner
  id = "/servicePrincipals/${var.aad_sp_object_id}/appRoleAssignedTo/${var.owner_assignment_id}"
}
