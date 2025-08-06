# StoryCraft Terraform Infrastructure

This directory contains Terraform configuration files to deploy the StoryCraft application on Google Cloud Platform using Cloud Run.

## Architecture

The infrastructure includes:

- **Cloud Run**: Hosts the Next.js application
- **Service Account**: With proper IAM roles for Vertex AI, Cloud Storage, and Firestore
- **Cloud Storage**: Bucket for storing application assets (images, videos, audio)
- **Firestore**: Database with composite index for scenarios collection
- **Artifact Registry**: Container registry for Docker images
- **IAM Roles**: Proper permissions for all services

## Prerequisites

1. **Google Cloud SDK**: Install and authenticate
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Terraform**: Install Terraform >= 1.0
   ```bash
   # macOS
   brew install terraform
   
   # Or download from https://developer.hashicorp.com/terraform/downloads
   ```

3. **Docker**: For building and pushing container images

## Quick Start

1. **Clone and navigate to the terraform directory**:
   ```bash
   cd terraform
   ```

2. **Copy and configure variables**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

3. **Run the setup script**:
   ```bash
   chmod +x ../scripts/setup-terraform.sh
   ../scripts/setup-terraform.sh
   ```

4. **Build and deploy the application**:
   ```bash
   chmod +x ../scripts/build-and-deploy.sh
   PROJECT_ID=$(terraform output -raw project_id) ../scripts/build-and-deploy.sh
   ```

## Manual Deployment Steps

### 1. Initialize Terraform

```bash
cd terraform
terraform init
```

### 2. Configure Variables

Edit `terraform.tfvars` with your project-specific values:

```hcl
project_id = "your-gcp-project-id"
region     = "us-central1"

# Firestore configuration
firestore_location    = "us-central"
firestore_database_id = "storycraft-db"

# Container image (update after building)
container_image = "us-central1-docker.pkg.dev/your-project/storycraft/storycraft:latest"

# NextAuth configuration
nextauth_url    = "https://your-cloud-run-url"
nextauth_secret = "your-secure-secret-key"

# Access control
allow_public_access = true
```

### 3. Plan and Apply Infrastructure

```bash
# Review the plan
terraform plan

# Apply the infrastructure
terraform apply
```

### 4. Build and Push Container Image

```bash
# Get the Artifact Registry URI
REGISTRY_URI=$(terraform output -raw container_image_uri)

# Build and tag the image
docker build -t $REGISTRY_URI/storycraft:latest ..

# Configure Docker for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Push the image
docker push $REGISTRY_URI/storycraft:latest
```

### 5. Update and Redeploy

Update your `terraform.tfvars` with the actual container image URI and service URL:

```hcl
container_image = "us-central1-docker.pkg.dev/your-project/storycraft/storycraft:latest"
nextauth_url    = "https://storycraft-xxxxx-uc.a.run.app"
```

Then apply again:

```bash
terraform apply
```

## Configuration Details

### Service Account Permissions

The service account has the following IAM roles:
- `roles/aiplatform.user` - For Vertex AI calls
- `roles/storage.objectAdmin` - For Cloud Storage operations
- `roles/datastore.user` - For Firestore database access
- `roles/texttospeech.serviceAgent` - For Text-to-Speech API
- `roles/cloudtranslate.user` - For Translation API
- `roles/logging.logWriter` - For Cloud Logging
- `roles/monitoring.metricWriter` - For Cloud Monitoring
- `roles/cloudtrace.agent` - For Cloud Trace

### Firestore Configuration

- Database ID: `storycraft-db` (configurable)
- Location: `us-central` (configurable)
- Composite Index: On `scenarios` collection with fields:
  - `userId` (ascending)
  - `updatedAt` (descending)

### Cloud Storage

- Bucket name: `{project-id}-storycraft-assets`
- CORS enabled for web access
- Lifecycle rule: Delete objects after 30 days
- Uniform bucket-level access enabled

### Cloud Run Configuration

- Service name: `storycraft`
- Port: 3000
- Resources: 2 CPU, 4Gi memory
- Auto-scaling: 0-100 instances
- CPU allocation: CPU is only allocated during request processing

## Environment Variables

The following environment variables are automatically configured:

- `PROJECT_ID` - Google Cloud project ID
- `FIRESTORE_DATABASE_ID` - Firestore database ID
- `GCS_BUCKET_NAME` - Cloud Storage bucket name
- `NODE_ENV` - Set to "production"
- `NEXT_TELEMETRY_DISABLED` - Disabled
- `NEXTAUTH_URL` - NextAuth callback URL
- `NEXTAUTH_SECRET` - NextAuth JWT secret

## Outputs

After deployment, Terraform provides these outputs:

- `service_url` - Cloud Run service URL
- `service_account_email` - Service account email
- `storage_bucket_name` - Cloud Storage bucket name
- `firestore_database_id` - Firestore database ID
- `container_image_uri` - Base URI for container images

## Troubleshooting

### Common Issues

1. **API Not Enabled**: Ensure all required APIs are enabled in your project
2. **Permissions**: Make sure your gcloud user has sufficient permissions
3. **Image Not Found**: Build and push the container image before deploying
4. **Authentication**: Configure NextAuth properly with the correct URL and secret

### Useful Commands

```bash
# View current state
terraform show

# View outputs
terraform output

# Destroy infrastructure (careful!)
terraform destroy

# View service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=storycraft" --limit=50

# Update Cloud Run service manually
gcloud run deploy storycraft --image=IMAGE_URI --region=us-central1
```

## Security Considerations

1. **Secrets Management**: Store sensitive values in Secret Manager for production
2. **IAM Roles**: Follow principle of least privilege
3. **Network Security**: Consider VPC and private services for production
4. **Access Control**: Review public access settings

## Cost Optimization

1. **Cloud Run**: Scales to zero when not in use
2. **Storage**: Lifecycle rules clean up old files
3. **Firestore**: Pay per operation model
4. **Monitoring**: Set up billing alerts

## Next Steps

1. Set up CI/CD pipeline for automated deployments
2. Configure monitoring and alerting
3. Set up custom domain and SSL certificate
4. Implement backup and disaster recovery
5. Consider multi-region deployment for high availability