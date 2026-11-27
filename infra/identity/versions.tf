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

  # Own state file (key identity.tfstate), separate from ../ (budget.tfstate): this layer is
  # applied by the owner from a laptop, never by CI. Names come from -backend-config=backend.hcl.
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
