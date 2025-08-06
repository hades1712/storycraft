variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "firestore_location" {
  description = "The location for Firestore database"
  type        = string
  default     = "us-central"
}

variable "firestore_database_id" {
  description = "The Firestore database ID"
  type        = string
  default     = "storycraft-db"
}

variable "container_image" {
  description = "The container image to deploy to Cloud Run"
  type        = string
  # This should be updated after building and pushing your image
  # Example: "us-central1-docker.pkg.dev/PROJECT_ID/storycraft/storycraft:latest"
}

variable "nextauth_url" {
  description = "The NextAuth URL for authentication"
  type        = string
  # This will be the Cloud Run service URL
}

variable "nextauth_secret" {
  description = "The NextAuth secret for JWT signing"
  type        = string
  sensitive   = true
}

variable "allow_public_access" {
  description = "Whether to allow public access to the Cloud Run service"
  type        = bool
  default     = true
}

variable "additional_env_vars" {
  description = "Additional environment variables for the Cloud Run service"
  type        = map(string)
  default     = {}
}