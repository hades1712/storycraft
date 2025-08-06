# Configure the Google Cloud provider
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "containerregistry.googleapis.com",
    "artifactregistry.googleapis.com",
    "firestore.googleapis.com",
    "storage.googleapis.com",
    "aiplatform.googleapis.com",
    "texttospeech.googleapis.com",
    "translate.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com"
  ])

  project = var.project_id
  service = each.value

  disable_dependent_services = false
  disable_on_destroy        = false
}

# Create service account for Cloud Run
resource "google_service_account" "storycraft_service_account" {
  account_id   = "storycraft-service"
  display_name = "StoryCraft Application Service Account"
  description  = "Service account for StoryCraft application running on Cloud Run"

  depends_on = [google_project_service.apis]
}

# IAM roles for the service account
resource "google_project_iam_member" "service_account_roles" {
  for_each = toset([
    "roles/aiplatform.user",
    "roles/storage.objectAdmin",
    "roles/datastore.user",
    "roles/texttospeech.serviceAgent",
    "roles/cloudtranslate.user",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/cloudtrace.agent"
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.storycraft_service_account.email}"

  depends_on = [google_service_account.storycraft_service_account]
}

# Create Cloud Storage bucket for application assets
resource "google_storage_bucket" "storycraft_assets" {
  name     = "${var.project_id}-storycraft-assets"
  location = var.region

  uniform_bucket_level_access = true
  
  versioning {
    enabled = false
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.apis]
}

# Grant service account access to the bucket
resource "google_storage_bucket_iam_member" "storycraft_bucket_access" {
  bucket = google_storage_bucket.storycraft_assets.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.storycraft_service_account.email}"
}

# Create Firestore database
resource "google_firestore_database" "storycraft_db" {
  project     = var.project_id
  name        = var.firestore_database_id
  location_id = var.firestore_location
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.apis]
}

# Create composite index for scenarios collection
resource "google_firestore_index" "scenarios_index" {
  project    = var.project_id
  database   = google_firestore_database.storycraft_db.name
  collection = "scenarios"

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "updatedAt"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.storycraft_db]
}

# Create Artifact Registry repository for container images
resource "google_artifact_registry_repository" "storycraft_repo" {
  location      = var.region
  repository_id = "storycraft"
  description   = "Docker repository for StoryCraft application"
  format        = "DOCKER"

  depends_on = [google_project_service.apis]
}

# Cloud Run service
resource "google_cloud_run_v2_service" "storycraft_service" {
  name     = "storycraft"
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.storycraft_service_account.email
    
    scaling {
      min_instance_count = 0
      max_instance_count = 100
    }

    containers {
      image = var.container_image

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "4Gi"
        }
        cpu_idle = true
      }

      env {
        name  = "PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "FIRESTORE_DATABASE_ID"
        value = var.firestore_database_id
      }

      env {
        name  = "GCS_BUCKET_NAME"
        value = google_storage_bucket.storycraft_assets.name
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "NEXT_TELEMETRY_DISABLED"
        value = "1"
      }

      # NextAuth configuration
      env {
        name  = "NEXTAUTH_URL"
        value = var.nextauth_url
      }

      env {
        name  = "NEXTAUTH_SECRET"
        value = var.nextauth_secret
      }

      # Add other environment variables as needed
      dynamic "env" {
        for_each = var.additional_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  depends_on = [
    google_project_service.apis,
    google_service_account.storycraft_service_account,
    google_storage_bucket.storycraft_assets,
    google_firestore_database.storycraft_db
  ]
}

# Make the service publicly accessible (optional - remove if you want private access)
resource "google_cloud_run_service_iam_member" "public_access" {
  count = var.allow_public_access ? 1 : 0
  
  location = google_cloud_run_v2_service.storycraft_service.location
  project  = google_cloud_run_v2_service.storycraft_service.project
  service  = google_cloud_run_v2_service.storycraft_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}