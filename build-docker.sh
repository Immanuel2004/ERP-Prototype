#!/bin/bash

# Script to build and push Docker images to Docker Hub

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_USERNAME=${1:-"your-docker-username"}
IMAGE_NAME=${2:-"erp-prototype"}
VERSION=${3:-"latest"}

if [ "$DOCKER_USERNAME" = "your-docker-username" ]; then
    echo -e "${RED}Error: Please provide your Docker Hub username${NC}"
    echo "Usage: ./build-docker.sh <docker-username> [image-name] [version]"
    exit 1
fi

echo -e "${YELLOW}Building Docker images for ERP Prototype...${NC}"

# Build backend image
echo -e "${YELLOW}Building backend image...${NC}"
docker build -f Dockerfile.backend -t $DOCKER_USERNAME/$IMAGE_NAME-backend:$VERSION .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend image built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build backend image${NC}"
    exit 1
fi

# Build frontend image
echo -e "${YELLOW}Building frontend image...${NC}"
docker build -f Dockerfile.frontend -t $DOCKER_USERNAME/$IMAGE_NAME-frontend:$VERSION .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend image built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build frontend image${NC}"
    exit 1
fi

echo -e "${GREEN}All images built successfully!${NC}"
echo -e "${YELLOW}To push to Docker Hub, run:${NC}"
echo "docker push $DOCKER_USERNAME/$IMAGE_NAME-backend:$VERSION"
echo "docker push $DOCKER_USERNAME/$IMAGE_NAME-frontend:$VERSION"
