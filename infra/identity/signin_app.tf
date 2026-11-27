# The Entra app registration behind the web app's sign-in page: what users see on the login screen, and what the web
# app's managed identity authenticates to (see signin.tf). Named <app>-web: it IS the web app, to Entra.
#
# Never delete it: the web app would stop accepting sign-ins. It holds no secret (the web app proves itself with the
# managed identity), so it has no credentials block on purpose.
resource "azuread_application" "web" {
  display_name     = "belfast-web"
  sign_in_audience = "AzureADMyOrg"
  owners           = [var.app_owner_object_id]

  api {
    oauth2_permission_scope {
      id                         = var.signin_scope_id
      value                      = "user_impersonation"
      type                       = "User"
      enabled                    = true
      admin_consent_display_name = "Access belfastweb"
      admin_consent_description  = "Allow the application to access belfastweb on behalf of the signed-in user."
      user_consent_display_name  = "Access belfastweb"
      user_consent_description   = "Allow the application to access belfastweb on your behalf."
    }
  }

  web {
    homepage_url  = "https://belfastweb.azurewebsites.net"
    redirect_uris = ["https://belfastweb.azurewebsites.net/.auth/login/aad/callback"]

    implicit_grant {
      id_token_issuance_enabled = true
    }
  }

  # Microsoft Graph, delegated User.Read (sign in and read the signed-in user's profile). Both ids are Microsoft's.
  required_resource_access {
    resource_app_id = "00000003-0000-0000-c000-000000000000"

    resource_access {
      id   = "e1fe6dd8-ba31-4d61-89e7-88639da4683d"
      type = "Scope"
    }
  }

  lifecycle {
    prevent_destroy = true
    # The identifier URI references the app's own client id, so it is its own resource below; this is the provider's
    # documented pattern for that.
    ignore_changes = [identifier_uris]
  }
}

resource "azuread_application_identifier_uri" "web" {
  application_id = azuread_application.web.id
  identifier_uri = "api://${azuread_application.web.client_id}"
}
