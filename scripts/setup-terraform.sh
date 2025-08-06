#!/bin/bash

# Setup script for initializing Terraform and deploying StoryCraft infrastructure
# This script sets up the initial infrastructure using Terraform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🏗️  Setting up StoryCraft infrastructure with Terraform${NC}"

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed. Please install Terraform first.${NC}"
    echo "Visit: https://developer.hashicorp.com/terraform/downloads"
    exit 1
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI is not installed. Please install gcloud first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if terraform.tfvars exists
if [ ! -f "terraform/terraform.tfvars" ]; then
    echo -e "${YELLOW}⚠️  terraform.tfvars not found. Creating from example...${NC}"
    cp terraform/terraform.tfvars.example terraform/terraform.tfvars
    echo -e "${RED}❌ Please edit terraform/terraform.tfvars with your values and run this script again.${NC}"
    exit 1
fi

# Change to terraform directory
cd terraform

# Initialize Terraform
echo -e "${YELLOW}🔧 Initializing Terraform...${NC}"
terraform init

# Validate configuration
echo -e "${YELLOW}✅ Validating Terraform configuration...${NC}"
terraform validate

# Plan the deployment
echo -e "${YELLOW}📋 Planning Terraform deployment...${NC}"
terraform plan

# Ask for confirmation
echo ""
echo -e "${BLUE}❓ Do you want to apply these changes? (yes/no)${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${YELLOW}🚀 Applying Terraform configuration...${NC}"
    terraform apply -auto-approve
    
    echo ""
    echo -e "${GREEN}✅ Infrastructure setup completed!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "  1. Build and push your Docker image:"
    echo "     chmod +x ../scripts/build-and-deploy.sh"
    echo "     PROJECT_ID=\$(terraform output -raw project_id) ../scripts/build-and-deploy.sh"
    echo ""
    echo "  2. Update terraform.tfvars with the container image URI"
    echo "  3. Run 'terraform apply' again to deploy the application"
    echo ""
    echo -e "${GREEN}🔗 Useful outputs:${NC}"
    terraform output
else
    echo -e "${YELLOW}⏸️  Deployment cancelled.${NC}"
fi