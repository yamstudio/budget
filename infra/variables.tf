variable "subscription_id" {
  type        = string
  description = "Azure subscription id."
}

variable "tenant_id" {
  type        = string
  description = "Entra tenant id (Easy Auth issuer, SQL admin)."
}

variable "aad_client_id" {
  type        = string
  description = "Client id of the Entra app registration used by App Service sign-in."
}

variable "sql_admin_login" {
  type        = string
  description = "Entra login of the SQL server admin."
}

variable "sql_admin_object_id" {
  type        = string
  description = "Object id of the SQL server Entra admin."
}

variable "web_resource_group" {
  type        = string
  description = "Resource group holding the App Service plan and web app."
}

variable "sql_resource_group" {
  type        = string
  description = "Resource group holding the shared SQL server."
}

variable "sql_server_name" {
  type        = string
  description = "Logical SQL server name. Kept out of the repo: the repo is public."
}

variable "aad_sp_object_id" {
  type        = string
  description = "Object id of the enterprise application (service principal) behind the web app sign-in."
}

variable "app_owner_object_id" {
  type        = string
  description = "Object id of the one user allowed to sign in to the app."
}

variable "owner_assignment_id" {
  type        = string
  description = "Id of the existing app role assignment for the owner (import only)."
}
