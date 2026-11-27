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

variable "sql_server_name" {
  type        = string
  description = "Name of the SQL server dedicated to this app, in the web resource group. Kept out of the repo (public)."
}
