# Backend Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY server/ ./server/

# Expose port
EXPOSE 5001

# Run migrations and start server
CMD ["sh", "-c", "node server/database/migrate.js && node server/database/seed.js && node server/index.js"]
