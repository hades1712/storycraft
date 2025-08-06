#!/bin/bash

# Build and deploy script for StoryCraft application
# This script builds the Docker image, pushes it to Artifact Registry, and updates the Cloud Run service

set -e

# Configuration - Update these values
PROJECT_ID="${PROJECT_ID:-your-gcp-project-id}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="storycraft"
REPOSITORY_NAME="storycraft"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Building and deploying StoryCraft application${NC}"

# Check if required environment variables are set
if [ "$PROJECT_ID" = "your-gcp-project-id" ]; then
    echo -e "${RED}❌ Please set the PROJECT_ID environment variable${NC}"
    exit 1
fi

# Set up variables
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}"
TAG="${TAG:-$(git rev-parse --short HEAD)}"
FULL_IMAGE_URI="${IMAGE_URI}:${TAG}"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  Project ID: ${PROJECT_ID}"
echo "  Region: ${REGION}"
echo "  Image URI: ${FULL_IMAGE_URI}"
echo ""

# Authenticate with gcloud (if not already authenticated)
echo -e "${YELLOW}🔐 Checking authentication...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "Please authenticate with gcloud:"
    gcloud auth login
fi

# Configure Docker for Artifact Registry
echo -e "${YELLOW}🐳 Configuring Docker for Artifact Registry...${NC}"
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# Build the Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker build -t ${FULL_IMAGE_URI} .

# Push the image to Artifact Registry
echo -e "${YELLOW}📤 Pushing image to Artifact Registry...${NC}"
docker push ${FULL_IMAGE_URI}

# Also tag and push as latest
docker tag ${FULL_IMAGE_URI} ${IMAGE_URI}:latest
docker push ${IMAGE_URI}:latest

# Update Cloud Run service
echo -e "${YELLOW}☁️ Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
    --image=${FULL_IMAGE_URI} \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --platform=managed \
    --quiet

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --format="value(status.url)")

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Service URL: ${SERVICE_URL}${NC}"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "  1. Update your terraform.tfvars with the new image URI:"
echo "     container_image = \"${FULL_IMAGE_URI}\""
echo "  2. Update NEXTAUTH_URL in terraform.tfvars:"
echo "     nextauth_url = \"${SERVICE_URL}\""
echo "  3. Run 'terraform apply' to update the infrastructure"