# Docker Setup and Deployment Instructions

## Quick Start with Docker Compose

### Prerequisites
- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)

### Local Development with Docker

1. **Start all services:**
```bash
cd /Users/joshua/Desktop/Immanuel/ERP-Prototype
docker-compose up -d
```

2. **Wait for services to start** (30-60 seconds)

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001
   - Database: localhost:5432

4. **View logs:**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

5. **Stop all services:**
```bash
docker-compose down
```

6. **Remove everything (including database):**
```bash
docker-compose down -v
```

## Building Individual Docker Images

### Build Backend
```bash
docker build -f Dockerfile.backend -t erp-backend:latest .
```

### Build Frontend
```bash
docker build -f Dockerfile.frontend -t erp-frontend:latest .
```

## Running Individual Containers

### Run Backend Container
```bash
docker run -p 5001:5001 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_NAME=erp_prototype \
  -e DB_USER=joshua \
  -e DB_PASSWORD=postgres \
  -e NODE_ENV=production \
  -e JWT_SECRET=your_secret_key \
  erp-backend:latest
```

### Run Frontend Container
```bash
docker run -p 3000:3000 \
  -e REACT_APP_API_URL=http://localhost:5001/api \
  erp-frontend:latest
```

## Pushing to Docker Hub

1. **Create Docker Hub account** at https://hub.docker.com

2. **Build images with your username:**
```bash
docker build -f Dockerfile.backend -t yourusername/erp-backend:latest .
docker build -f Dockerfile.frontend -t yourusername/erp-frontend:latest .
```

3. **Login to Docker:**
```bash
docker login
```

4. **Push images:**
```bash
docker push yourusername/erp-backend:latest
docker push yourusername/erp-frontend:latest
```

## Deployment Options

### Option A: Railway.app (Recommended)

1. Go to https://railway.app
2. Create new project
3. Add PostgreSQL database
4. Add Node.js service for backend
5. Add Static Site service for frontend
6. Connect your GitHub repository
7. Set environment variables in Railway dashboard

#### Backend Environment Variables on Railway:
```
NODE_ENV=production
PORT=5001
CLIENT_URL=https://your-frontend-url.vercel.app
DB_HOST=<railway-postgres-host>
DB_PORT=5432
DB_NAME=erp_prototype
DB_USER=postgres
DB_PASSWORD=<railway-postgres-password>
JWT_SECRET=<strong-random-secret>
JWT_EXPIRE=7d
```

### Option B: Render.com

1. Go to https://render.com
2. Create PostgreSQL instance
3. Create Web Service from GitHub
4. Configure environment variables
5. Deploy backend
6. Update Vercel frontend with backend URL

### Option C: Heroku

```bash
# Install Heroku CLI
brew install heroku/brew/heroku

# Login
heroku login

# Create app
heroku create your-app-name-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret

# Deploy
git push heroku main
```

### Option D: Docker Swarm or Kubernetes

For production-grade deployments:

```bash
# Initialize Docker Swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml erp
```

## Environment Variables Reference

### Required for Backend
- `PORT` - Server port (default: 5001)
- `NODE_ENV` - Environment (development/production)
- `DB_HOST` - Database host
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - Secret key for JWT tokens
- `CLIENT_URL` - Frontend URL for CORS

### Optional for Frontend
- `REACT_APP_API_URL` - Backend API URL

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs container_name

# Restart container
docker restart container_name
```

### Database connection error
- Verify DB credentials in docker-compose.yml
- Check if postgres container is running: `docker ps`
- Ensure network connectivity between containers

### Port already in use
```bash
# Find process using port
lsof -i :3000
lsof -i :5001

# Kill process
kill -9 <PID>
```

### Build fails
```bash
# Clear Docker cache and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

## Performance Tips

1. Use `.dockerignore` to exclude unnecessary files
2. Use multi-stage builds for smaller images
3. Cache layers properly in Dockerfile
4. Use Alpine Linux for smaller base images
5. Pin specific versions of dependencies

## Security Best Practices

1. Never commit `.env` files
2. Use strong JWT_SECRET (generate with: `openssl rand -hex 32`)
3. Keep base images updated
4. Scan images for vulnerabilities: `docker scan image_name`
5. Use read-only filesystems where possible
6. Don't run as root in containers

## Production Checklist

- [ ] Use environment variables for all secrets
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Configure proper CORS headers
- [ ] Set up database backups
- [ ] Enable container restart policies
- [ ] Set up logging and monitoring
- [ ] Use health checks
- [ ] Configure resource limits
- [ ] Test failover scenarios
