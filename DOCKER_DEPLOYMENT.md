# Docker Deployment Guide

This guide will help you deploy the GabayLakbay Translation System using Docker.

## Prerequisites

- Docker Desktop installed on your system
- Docker Compose (included with Docker Desktop)

## Quick Start

1. **Clone and navigate to the project directory:**
   ```bash
   cd sia-app
   ```

2. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - MongoDB: localhost:27017

## Services

### 1. Frontend (React + Vite)
- **Container:** `gabaylakbay-frontend`
- **Port:** 3000
- **Technology:** React with Vite, served by Nginx
- **Features:** Multi-language support, responsive design

### 2. Backend (FastAPI)
- **Container:** `gabaylakbay-backend`
- **Port:** 8000
- **Technology:** FastAPI with Python 3.11
- **Features:** Translation microservice, MongoDB integration

### 3. Database (MongoDB)
- **Container:** `gabaylakbay-mongo`
- **Port:** 27017
- **Technology:** MongoDB 7.0
- **Features:** Persistent data storage

## Environment Configuration

The application uses the following environment variables (configured in `docker.env`):

- `MONGODB_URL`: MongoDB connection string
- `CORS_ORIGINS`: Allowed CORS origins
- `BACKEND_PORT`: Backend service port
- `FRONTEND_PORT`: Frontend service port

## Docker Commands

### Start services:
```bash
docker-compose up
```

### Start in background:
```bash
docker-compose up -d
```

### Stop services:
```bash
docker-compose down
```

### View logs:
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongo
```

### Rebuild services:
```bash
docker-compose up --build
```

### Clean up (remove containers and volumes):
```bash
docker-compose down -v
```

## Development

### Backend Development
To work on the backend with live reloading:

```bash
# Start only MongoDB
docker-compose up mongo

# Run backend locally
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
To work on the frontend with hot reloading:

```bash
# Start backend and MongoDB
docker-compose up backend mongo

# Run frontend locally
cd transportation-system-demo
npm install
npm run dev
```

## Production Deployment

For production deployment, consider:

1. **Environment Variables:** Update `docker.env` with production values
2. **Security:** Use proper secrets management
3. **SSL/TLS:** Configure reverse proxy with SSL certificates
4. **Monitoring:** Add logging and monitoring services
5. **Scaling:** Use Docker Swarm or Kubernetes for scaling

## Troubleshooting

### Common Issues

1. **Port conflicts:** Ensure ports 3000, 8000, and 27017 are available
2. **Memory issues:** The translation models require significant RAM (4GB+ recommended)
3. **Model downloads:** First run may take time to download ML models

### View container status:
```bash
docker-compose ps
```

### Access container shell:
```bash
# Backend
docker-compose exec backend bash

# Frontend
docker-compose exec frontend sh

# MongoDB
docker-compose exec mongo mongosh
```

### Reset everything:
```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## API Endpoints

- `POST /send` - Send message for translation
- `GET /messages?lang={language}` - Get translated messages
- `GET /languages` - Get supported languages

## Supported Languages

- English (en)
- Filipino/Tagalog (fil)
- Cebuano (ceb)
- Ilocano (ilo)
- Pangasinan (pag)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)
