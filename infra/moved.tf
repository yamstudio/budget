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
