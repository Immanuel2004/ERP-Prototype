# ERP Prototype - Complete Docker & Vercel Deployment Guide

##  What Has Been Set Up

### Docker Configuration 
- **Backend Dockerfile** (`Dockerfile.backend`) - Node.js with Express
- **Frontend Dockerfile** (`Dockerfile.frontend`) - React with multi-stage build
- **Docker Compose** (`docker-compose.yml`) - Local development with PostgreSQL
- **.dockerignore** - Optimized image builds

### Documentation 
- `DOCKER_GUIDE.md` - Complete Docker operations guide
- `DEPLOYMENT.md` - Multi-option deployment strategies
- `.env.example` - Environment variables template

### CI/CD 
- GitHub Actions workflow for automated Docker builds
- Scripts for Docker Hub integration

### Images Built Successfully 
```
erp-backend:test       - Backend API service
erp-frontend:test      - React frontend application
```

---

##  Quick Start (Local Development with Docker)

### Start Everything
```bash
cd /Users/joshua/Desktop/Immanuel/ERP-Prototype

# Start all services
docker-compose up -d

# Wait 30-60 seconds for services to initialize
sleep 45

# View logs
docker-compose logs -f
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **Database**: localhost:5432

### Login Credentials
```
Student:
  Email: student@edu.in
  Password: password123
  Roll: 001

Teacher:
  Email: teacher@edu.in
  Password: password123
```

### Stop Services
```bash
docker-compose down
```

---

##  Deployment to Vercel

### Important: Vercel Limitations
Vercel is **frontend-only** and doesn't support traditional Docker containers. Use this strategy:
- **Frontend** → Vercel (React)
- **Backend** → Railway/Render/Heroku (Node.js)
- **Database** → Railway/Render/Heroku (PostgreSQL)

### Step 1: Deploy Backend to Railway (Recommended)

1. **Go to [railway.app](https://railway.app)**
2. **Sign up with GitHub**
3. **Create new project**
4. **Add PostgreSQL:**
   - Click "Add" → "Database" → "PostgreSQL"
5. **Add Node.js Service:**
   - Click "Add" → "GitHub Repo"
   - Select your ERP repository
   - Configure with these settings:
     - **Start Command**: `node server/index.js`
     - **Root Directory**: `/`

6. **Set Environment Variables:**
   - Go to Service Variables
   - Add these variables:

```env
NODE_ENV=production
PORT=5001
CLIENT_URL=https://YOUR_VERCEL_URL.vercel.app
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
JWT_SECRET=generate_with_openssl_rand_-hex_32
JWT_EXPIRE=7d
```

7. **Deploy** - Railway auto-deploys on push

8. **Get Backend URL**: Copy the public domain from Railway dashboard

### Step 2: Deploy Frontend to Vercel

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign up with GitHub**
3. **Click "Import Project"**
4. **Select your GitHub repository**
5. **Configure Build Settings:**
   - **Framework**: React
   - **Build Command**: `cd client && npm run build`
   - **Output Directory**: `client/build`
   - **Root Directory**: `/`

6. **Add Environment Variables:**
   - Click "Environment Variables"
   - Add:
     ```
     REACT_APP_API_URL=https://YOUR_RAILWAY_BACKEND_URL/api
     ```

7. **Deploy** - Click "Deploy"

### Step 3: Update Backend URL in Frontend

1. In Vercel Dashboard:
   - Go to Settings → Environment Variables
   - Update `REACT_APP_API_URL` with your Railway backend URL
   - Redeploy

---

##  Docker Hub Deployment

### Push Images to Docker Hub

1. **Create account at [hub.docker.com](https://hub.docker.com)**

2. **Tag your images:**
```bash
docker tag erp-backend:test yourusername/erp-backend:latest
docker tag erp-frontend:test yourusername/erp-frontend:latest
```

3. **Login:**
```bash
docker login
```

4. **Push:**
```bash
docker push yourusername/erp-backend:latest
docker push yourusername/erp-frontend:latest
```

### Use Images on Any Server

```bash
docker pull yourusername/erp-backend:latest
docker pull yourusername/erp-frontend:latest

# Run with docker-compose (update image names in docker-compose.yml)
docker-compose up -d
```

---

##  Advanced Deployment Options

### Option A: Railway (Full Stack)  Recommended

**Pros:**
- Single platform for frontend, backend, and database
- Easy environment variable management
- Auto-scaling
- GitHub integration
- Affordable ($5-10/month)

**Steps**: See "Step 1" above

### Option B: Render.com + Vercel

1. Deploy backend to [render.com](https://render.com)
2. Deploy frontend to Vercel
3. Connect them via environment variables

### Option C: Self-Hosted (VPS)

For DigitalOcean, AWS, Linode, etc.:

```bash
# SSH into server
ssh root@your-server

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Clone repository
git clone your-repo
cd ERP-Prototype

# Update environment variables
nano .env

# Start services
docker-compose up -d
```

### Option D: Kubernetes (Enterprise)

```bash
# Deploy to Kubernetes
kubectl apply -f kubernetes-deployment.yml

# Requires setting up K8s manifests (advanced)
```

---

##  Monitoring & Logs

### Local Docker
```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# View in real-time
docker-compose logs --tail=100 -f backend
```

### Railway
- Dashboard → Service → Deployments → Logs
- Live tail updates available

### Vercel
- Dashboard → Deployments → View Logs

---

##  Security Checklist

- [ ] Never commit `.env` files
- [ ] Generate strong JWT_SECRET: `openssl rand -hex 32`
- [ ] Use HTTPS only (handled by Railway/Vercel)
- [ ] Set `NODE_ENV=production`
- [ ] Use unique database passwords
- [ ] Enable firewall rules
- [ ] Regular database backups
- [ ] Monitor logs for errors

---

##  Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| Railway Frontend | Free | Included in Railway free tier |
| Railway Backend | $5-10/mo | Pay-as-you-go |
| Railway PostgreSQL | Free | Included in Railway free tier |
| Vercel Frontend | Free | Free tier available |
| **Total** | **$5-10/mo** | Production-ready |

---

##  Troubleshooting

### Docker Compose Issues

**Services won't start:**
```bash
# Check logs
docker-compose logs backend
docker-compose logs db

# Restart
docker-compose down
docker-compose up -d
```

**Port already in use:**
```bash
# Find and kill process
lsof -i :3000
lsof -i :5001
kill -9 <PID>
```

**Database connection error:**
- Verify credentials in `.env`
- Check if `db` service is running: `docker ps`

### Railway Issues

**Deployment failed:**
- Check logs in Railway dashboard
- Verify environment variables are set
- Ensure `package.json` has correct start script

**Backend unreachable from frontend:**
- Update `REACT_APP_API_URL` in Vercel
- Check CORS settings in backend
- Verify Railway backend is running

### Vercel Issues

**Build failed:**
- Check build logs in Vercel dashboard
- Verify build command: `cd client && npm run build`
- Check `client/package.json` dependencies

**Frontend can't reach backend:**
- Update `REACT_APP_API_URL` environment variable
- Ensure backend is running and accessible
- Check firewall/CORS settings

---

##  Additional Resources

- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file)
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://railway.app/docs)
- [Express.js Guide](https://expressjs.com)
- [React Documentation](https://react.dev)

---

##  What's Next?

1. **Test locally**: `docker-compose up -d`
2. **Create accounts**: 
   - [Railway.app](https://railway.app)
   - [Vercel.com](https://vercel.com)
3. **Deploy backend** to Railway
4. **Get Railway backend URL**
5. **Deploy frontend** to Vercel with backend URL
6. **Test the full application**

---

**Need help?** Check `DOCKER_GUIDE.md` and `DEPLOYMENT.md` for detailed instructions.
