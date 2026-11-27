# Adopt the existing sign-in app registration into state. Delete this file once applied.
import {
  to = azuread_application.web
  id = "/applications/${var.signin_app_object_id}"
}

import {
  to = azuread_application_identifier_uri.web
  id = "/applications/${var.signin_app_object_id}/identifierUris/${base64encode("api://${var.aad_client_id}")}"
}
