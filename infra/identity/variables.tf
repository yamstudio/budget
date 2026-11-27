variable "subscription_id" {
  type        = string
  description = "Azure subscription id."
}

variable "tenant_id" {
  type        = string
  description = "Entra tenant id."
}

variable "web_resource_group" {
  type        = string
  description = "Resource group holding the web app, its plan and the Terraform state account."
}

variable "sql_server_name" {
  type        = string
  description = "Name of the SQL server dedicated to this app (in web_resource_group). Kept out of the repo: the repo is public."
}

variable "tfstate_storage_account" {
  type        = string
  description = "Storage account holding Terraform state (in web_resource_group)."
}

variable "tfstate_container" {
  type        = string
  description = "Blob container holding the APP layer's state (infra/budget.tfstate). Not this layer's state."
  default     = "tfstate"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository (owner/name) whose workflows may use the CI identities."
  default     = "yamstudio/budget"
}

# --- Sign-in app registration (signin_app.tf) ---

variable "app_owner_object_id" {
  type        = string
  description = "Object id of the one user allowed to sign in to the app (and owner of the identities)."
}

variable "signin_scope_id" {
  type        = string
  description = "Id of the sign-in app registration's user_impersonation permission scope (tenant-specific, so not in the repo)."
}
