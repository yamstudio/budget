# Not secrets: client ids are public identifiers. They become GitHub *environment variables*
# (AZURE_CLIENT_ID), see docs/identities.md "Manual steps".
output "client_ids" {
  description = "Client id of each CI identity, keyed by name (plan, infra, deploy, migrate)."
  value       = { for k, a in azuread_application.ci : k => a.client_id }
}

output "tenant_id" {
  value = var.tenant_id
}

output "subscription_id" {
  value = var.subscription_id
}
