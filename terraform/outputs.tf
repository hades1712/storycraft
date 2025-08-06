output "service_url" {
  description = "The URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.storycraft_service.uri
}

output "service_account_email" {
  description = "The email of the service account used by Cloud Run"
  value       = google_service_account.storycraft_service_account.email
}

output "storage_bucket_name" {
  description = "The name of the Cloud Storage bucket"
  value       = google_storage_bucket.storycraft_assets.name
}

output "firestore_database_id" {
  description = "The ID of the Firestore database"
  value       = google_firestore_database.storycraft_db.name
}

output "artifact_registry_repository" {
  description = "The Artifact Registry repository for container images"
  value       = google_artifact_registry_repository.storycraft_repo.name
}

output "container_image_uri" {
  description = "The base URI for pushing container images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.storycraft_repo.repository_id}"
}

output "project_id" {
  description = "The GCP project ID"
  value       = var.project_id
}

output "region" {
  description = "The GCP region"
  value       = var.region
}