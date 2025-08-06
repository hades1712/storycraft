terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Uncomment and configure if you want to use remote state
  # backend "gcs" {
  #   bucket = "your-terraform-state-bucket"
  #   prefix = "terraform/storycraft"
  # }
}