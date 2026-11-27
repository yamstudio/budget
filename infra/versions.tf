terraform {
  required_version = ">= 1.15.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
  }

  # State lives in a private, versioned, AD-only blob container (no account keys).
  # Names come from -backend-config=backend.hcl (gitignored; see backend.hcl.example).
  backend "azurerm" {
    use_azuread_auth = true
  }
}

provider "azuread" {
  tenant_id = var.tenant_id
}

provider "azurerm" {
  features {}

  subscription_id     = var.subscription_id
  storage_use_azuread = true
}
