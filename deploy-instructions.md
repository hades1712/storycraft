# StoryCraft Deployment Instructions

This guide will help you deploy the StoryCraft application to Google Cloud Platform using the provided Terraform scripts.

## Quick Start

1. **Set up your Google Cloud Project**:
   ```bash
   # Create a new project or use existing one
   gcloud projects create YOUR_PROJECT_ID
   gcloud config set project YOUR_PROJECT_ID
   
   # Enable billing for the project
   # (This must be done through the Google Cloud Console)
   ```

2. **Configure Terraform**:
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your project details
   ```

3. **Deploy Infrastructure**:
   ```bash
   chmod +x ../scripts/setup-terraform.sh
   ../scripts/setup-terraform.sh
   ```

4. **Build and Deploy Application**:
   ```bash
   chmod +x ../scripts/build-and-deploy.sh
   PROJECT_ID=$(cd terraform && terraform output -raw project_id) ./scripts/build-and-deploy.sh
   ```

## What Gets Created

### Google Cloud Resources

1. **APIs Enabled**:
   - Cloud Run API
   - Cloud Build API
   - Container Registry API
   - Artifact Registry API
   - Firestore API
   - Cloud Storage API
   - AI Platform API
   - Text-to-Speech API
   - Cloud Translation API

2. **Service Account**: `storycraft-service@PROJECT_ID.iam.gserviceaccount.com`
   - Vertex AI User role
   - Storage Object Admin role
   - Datastore User role
   - Text-to-Speech Service Agent role
   - Cloud Translation User role
   - Logging Writer role
   - Monitoring Metric Writer role
   - Cloud Trace Agent role

3. **Cloud Storage Bucket**: `PROJECT_ID-storycraft-assets`
   - CORS enabled for web access
   - Lifecycle rule: 30-day retention
   - Uniform bucket-level access

4. **Firestore Database**: `storycraft-db`
   - Native mode
   - Composite index on scenarios collection (userId ASC, updatedAt DESC)

5. **Artifact Registry**: `storycraft` repository for Docker images

6. **Cloud Run Service**: `storycraft`
   - 2 CPU, 4Gi memory
   - Auto-scaling 0-100 instances
   - Public access (configurable)

### Environment Variables Set

- `PROJECT_ID`: Your Google Cloud project ID
- `FIRESTORE_DATABASE_ID`: Firestore database ID
- `GCS_BUCKET_NAME`: Cloud Storage bucket name
- `NODE_ENV`: production
- `NEXTAUTH_URL`: Cloud Run service URL
- `NEXTAUTH_SECRET`: Your NextAuth secret

## Configuration

### Required terraform.tfvars Values

```hcl
# Your Google Cloud project ID
project_id = "your-gcp-project-id"

# Region for resources
region = "us-central1"

# Firestore configuration
firestore_location    = "us-central"
firestore_database_id = "storycraft-db"

# Container image (will be updated after first build)
container_image = "us-central1-docker.pkg.dev/your-project/storycraft/storycraft:latest"

# NextAuth configuration (will be updated with actual Cloud Run URL)
nextauth_url    = "https://your-cloud-run-url"
nextauth_secret = "your-very-secure-secret-key-here"

# Whether to allow public access
allow_public_access = true
```

### Generate NextAuth Secret

```bash
# Generate a secure secret for NextAuth
openssl rand -base64 32
```

## Deployment Process

### 1. Initial Infrastructure Setup

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### 2. Build and Push Docker Image

```bash
# Get registry URI
REGISTRY_URI=$(terraform output -raw container_image_uri)

# Build image
docker build -t $REGISTRY_URI/storycraft:latest ..

# Configure Docker
gcloud auth configure-docker us-central1-docker.pkg.dev

# Push image
docker push $REGISTRY_URI/storycraft:latest
```

### 3. Update Configuration

Update `terraform.tfvars` with:
- Actual container image URI
- Cloud Run service URL for NextAuth

### 4. Final Deployment

```bash
terraform apply
```

## Monitoring and Management

### View Logs
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=storycraft" --limit=50
```

### Update Application
```bash
# Build new image
docker build -t $REGISTRY_URI/storycraft:v2 ..
docker push $REGISTRY_URI/storycraft:v2

# Update Cloud Run
gcloud run deploy storycraft --image=$REGISTRY_URI/storycraft:v2 --region=us-central1
```

### Scale Service
```bash
gcloud run services update storycraft --max-instances=50 --region=us-central1
```

## Security Best Practices

1. **Use Secret Manager** for sensitive environment variables in production
2. **Enable VPC** for network isolation
3. **Set up IAM conditions** for fine-grained access control
4. **Enable audit logging** for compliance
5. **Use custom service accounts** with minimal permissions

## Cost Management

1. **Monitor billing** with budget alerts
2. **Use preemptible instances** for batch processing
3. **Set up lifecycle policies** for storage
4. **Monitor Cloud Run cold starts** and optimize accordingly

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure your gcloud user has Owner or Editor role
2. **API Not Enabled**: Run `gcloud services enable SERVICE_NAME`
3. **Quota Exceeded**: Check quotas in Google Cloud Console
4. **Build Failures**: Check Cloud Build logs
5. **Service Not Responding**: Check Cloud Run logs and health checks

### Useful Commands

```bash
# Check service status
gcloud run services describe storycraft --region=us-central1

# View recent deployments
gcloud run revisions list --service=storycraft --region=us-central1

# Check quotas
gcloud compute project-info describe --project=PROJECT_ID

# View enabled APIs
gcloud services list --enabled
```

## Next Steps

1. **Set up CI/CD** with Cloud Build or GitHub Actions
2. **Configure custom domain** and SSL certificate
3. **Set up monitoring** and alerting
4. **Implement backup strategy** for Firestore
5. **Consider multi-region deployment** for high availability

## Support

For issues with the Terraform configuration or deployment, check:
1. Terraform documentation: https://registry.terraform.io/providers/hashicorp/google
2. Google Cloud documentation: https://cloud.google.com/docs
3. Cloud Run documentation: https://cloud.google.com/run/docs