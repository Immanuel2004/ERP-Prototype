#!/bin/bash

# Docker & Deployment Setup Script for ERP Prototype

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        ERP Prototype - Docker & Deployment Setup          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    echo "Install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed${NC}"

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose is installed${NC}"

# Menu
echo -e "\n${BLUE}What would you like to do?${NC}"
echo "1) Test Docker images locally"
echo "2) Start full stack with docker-compose"
echo "3) Push images to Docker Hub"
echo "4) View logs"
echo "5) Stop all services"
echo "6) Clean up (remove all containers and images)"
echo "7) View documentation"

read -p "Enter your choice (1-7): " choice

case $choice in
    1)
        echo -e "\n${YELLOW}Building Docker images...${NC}"
        docker build -f Dockerfile.backend -t erp-backend:latest .
        docker build -f Dockerfile.frontend -t erp-frontend:latest .
        echo -e "${GREEN}✓ Images built successfully${NC}"
        docker images | grep erp
        ;;
    
    2)
        echo -e "\n${YELLOW}Starting services with docker-compose...${NC}"
        docker-compose up -d
        echo -e "${GREEN}✓ Services started${NC}"
        echo -e "\n${BLUE}Services will be available at:${NC}"
        echo "  Frontend: http://localhost:3000"
        echo "  Backend:  http://localhost:5001"
        echo "  Database: localhost:5432"
        echo -e "\n${YELLOW}Waiting for services to initialize...${NC}"
        sleep 10
        docker-compose ps
        ;;
    
    3)
        read -p "Enter your Docker Hub username: " username
        read -p "Enter image name (default: erp-prototype): " imagename
        imagename=${imagename:-erp-prototype}
        
        echo -e "\n${YELLOW}Tagging images...${NC}"
        docker tag erp-backend:latest $username/$imagename-backend:latest
        docker tag erp-frontend:latest $username/$imagename-frontend:latest
        
        echo -e "${YELLOW}Logging in to Docker Hub...${NC}"
        docker login
        
        echo -e "${YELLOW}Pushing images...${NC}"
        docker push $username/$imagename-backend:latest
        docker push $username/$imagename-frontend:latest
        
        echo -e "${GREEN}✓ Images pushed successfully${NC}"
        ;;
    
    4)
        echo -e "\n${YELLOW}Showing logs (press Ctrl+C to stop)...${NC}"
        docker-compose logs -f
        ;;
    
    5)
        echo -e "\n${YELLOW}Stopping all services...${NC}"
        docker-compose down
        echo -e "${GREEN}✓ Services stopped${NC}"
        ;;
    
    6)
        read -p "This will remove all containers and images. Continue? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            echo -e "${YELLOW}Cleaning up...${NC}"
            docker-compose down -v
            docker rmi erp-backend:latest erp-frontend:latest 2>/dev/null || true
            echo -e "${GREEN}✓ Cleanup complete${NC}"
        fi
        ;;
    
    7)
        echo -e "\n${BLUE}Documentation:${NC}"
        echo "1) QUICK_START.md      - Quick deployment guide"
        echo "2) DOCKER_GUIDE.md     - Complete Docker operations"
        echo "3) DEPLOYMENT.md       - Deployment options"
        read -p "View which file? (1-3): " doc
        case $doc in
            1) cat QUICK_START.md | less ;;
            2) cat DOCKER_GUIDE.md | less ;;
            3) cat DEPLOYMENT.md | less ;;
        esac
        ;;
    
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Done!${NC}"
