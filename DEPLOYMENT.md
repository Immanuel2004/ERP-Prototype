# Vercel Deployment Guide for ERP Prototype

## Overview
This guide explains how to deploy the ERP Prototype on Vercel. Since Vercel primarily hosts frontend applications, the deployment strategy splits:
- **Frontend**: Deployed on Vercel (React)
- **Backend**: Deployed on Railway, Render, or another Node.js hosting service

## Option 1: Deploy Frontend to Vercel + Backend to Railway (Recommended)

### Step 1: Prepare Frontend for Vercel

1. Navigate to the client directory:
```bash
cd client
```

2. The frontend is already configured for Vercel. No changes needed.

### Step 2: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and sign up
2. Create a new project
3. Connect your GitHub repository
4. Add PostgreSQL database
5. Deploy your backend service

### Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click "Import Project"
3. Select your GitHub repository
4. Configure environment variables:
   ```
   REACT_APP_API_URL=https://your-backend-url.railway.app/api
   ```
5. Set build command: `cd client && npm run build`
6. Set output directory: `client/build`
7. Click "Deploy"

## Option 2: Use Docker Container Registry (e.g., Railway with Docker)

### Prerequisites
- Docker installed
- Docker Hub account (or use Railway's private registry)

### Steps

1. Build images locally:
```bash
docker build -f Dockerfile.backend -t your-username/erp-backend:latest .
docker build -f Dockerfile.frontend -t your-username/erp-frontend:latest .
```

2. Push to Docker Hub:
```bash
docker push your-username/erp-backend:latest
docker push your-username/erp-frontend:latest
```

3. Deploy on Railway:
   - Create services using Docker images
   - Configure environment variables
   - Add PostgreSQL database
   - Set up networking between services

## Option 3: Docker Compose Local Development

### Prerequisites
- Docker and Docker Compose installed

### Steps

1. Update `.env` file with your configuration
2. Run:
```bash
docker-compose up -d
```

3. Access:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5001
   - Database: localhost:5432

### Stop services:
```bash
docker-compose down
```

## Environment Variables

### Backend (.env)
```
PORT=5001
NODE_ENV=production
CLIENT_URL=https://your-vercel-frontend.vercel.app
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=erp_prototype
DB_USER=your-db-user
DB_PASSWORD=your-db-password
JWT_SECRET=your-jwt-secret
JWT_EXPIRE=7d
```

### Frontend (Vercel Dashboard)
```
REACT_APP_API_URL=https://your-backend-url/api
```

## Recommended Deployment Stack

| Component | Service |
|-----------|---------|
| Frontend (React) | Vercel |
| Backend (Node.js/Express) | Railway, Render, or Heroku |
| Database (PostgreSQL) | Railway, Heroku, or AWS RDS |

## Troubleshooting

### CORS Issues
Ensure backend `CLIENT_URL` matches your Vercel frontend URL.

### Database Connection
Verify connection string includes correct host, port, and credentials.

### Build Failures
Check logs in Vercel/Railway dashboard for specific errors.

## Security Considerations

1. Never commit `.env` files to version control
2. Use strong JWT_SECRET in production
3. Enable HTTPS for all communications
4. Use environment variables for sensitive data
5. Implement rate limiting on API endpoints

## Cost Estimates

- **Vercel**: Free tier for frontend
- **Railway**: ~$5-10/month for basic setup
- **PostgreSQL**: Included in Railway free tier
