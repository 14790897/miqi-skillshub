# Deployment Guide

> MiQi SkillHub — Docker Compose (single-host) and Kubernetes Helm (production)

---

## Table of Contents

1. [Requirements](#1-requirements)
2. [Docker Compose Deployment](#2-docker-compose-deployment)
3. [Kubernetes Helm Deployment](#3-kubernetes-helm-deployment)
4. [Configuration Reference](#4-configuration-reference)
5. [Production Hardening](#5-production-hardening)
6. [Upgrades & Rollbacks](#6-upgrades--rollbacks)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Requirements

### Docker Compose

| Component | Minimum Version |
|-----------|----------------|
| Docker | 24.0+ |
| Docker Compose | 2.20+ |
| RAM | 4 GB |
| Disk | 20 GB |

### Kubernetes

| Component | Minimum Version |
|-----------|----------------|
| Kubernetes | 1.27+ |
| Helm | 3.12+ |
| Total node RAM | 8 GB |
| PVC storage | 100 GB |

---

## 2. Docker Compose Deployment

### 2.1 Quick Start

```bash
git clone https://github.com/lichman0405/miqi-skillshub.git
cd skillhub

docker compose -f deploy/docker/docker-compose.yml up -d

# Check service status
docker compose -f deploy/docker/docker-compose.yml ps

# Follow backend logs
docker compose -f deploy/docker/docker-compose.yml logs -f backend
```

Default service ports:

| Service | Address |
|---------|---------|
| Backend API | http://localhost:8080 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| MinIO API | http://localhost:9000 |
| MinIO Console | http://localhost:9001 |

### 2.2 Production Overrides

Create `deploy/docker/docker-compose.override.yml`:

```yaml
services:
  backend:
    environment:
      JWT_SECRET: "your-64-char-random-secret"
      DATABASE_PASSWORD: "strong-db-password"
      MINIO_ROOT_PASSWORD: "strong-minio-password"
    restart: always

  postgres:
    environment:
      POSTGRES_PASSWORD: "strong-db-password"
    volumes:
      - /data/skillhub/postgres:/var/lib/postgresql/data

  minio:
    environment:
      MINIO_ROOT_PASSWORD: "strong-minio-password"
    volumes:
      - /data/skillhub/minio:/data
```

### 2.3 Stop & Cleanup

```bash
# Stop services (preserve data)
docker compose -f deploy/docker/docker-compose.yml down

# Stop services and remove volumes (destructive!)
docker compose -f deploy/docker/docker-compose.yml down -v
```

---

## 3. Kubernetes Helm Deployment

### 3.1 Prerequisites

```bash
kubectl cluster-info
kubectl create namespace skillhub
```

### 3.2 Minimal Install

```bash
helm install skillhub ./deploy/helm/skillhub \
  --namespace skillhub \
  --set app.jwtSecret="$(openssl rand -hex 32)"
```

### 3.3 Production Deploy

Create `my-values.yaml`:

```yaml
backend:
  replicaCount: 3
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10

worker:
  replicaCount: 2
  concurrency: 8

app:
  jwtSecret: "your-64-char-random-secret"
  llm:
    endpoint: "http://ollama.internal:11434"
    model: "qwen2.5"

postgresql:
  enabled: false          # Use external DB
  external:
    host: "postgres.internal"
    port: 5432
    username: "skillhub"
    password: "strong-password"
    database: "skillhub"
    sslmode: "require"

redis:
  enabled: false          # Use external Redis
  external:
    host: "redis.internal"
    port: 6379
    password: "redis-password"

minio:
  persistence:
    storageClass: "fast-ssd"
    size: "200Gi"

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
  hosts:
    - host: "skillhub.company.com"
      paths:
        - path: /api
          pathType: Prefix
          backend: backend
        - path: /
          pathType: Prefix
          backend: frontend
  tls:
    - secretName: skillhub-tls
      hosts:
        - skillhub.company.com
```

```bash
helm install skillhub ./deploy/helm/skillhub \
  --namespace skillhub \
  -f my-values.yaml
```

### 3.4 Verify Deployment

```bash
kubectl get pods -n skillhub
kubectl get svc -n skillhub
kubectl get ingress -n skillhub

# Health check
kubectl port-forward -n skillhub svc/skillhub-backend 8080:8080 &
curl http://localhost:8080/api/v1/health
```

---

## 4. Configuration Reference

### 4.1 Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | `8080` | Listening port |
| `DATABASE_HOST` | `localhost` | PostgreSQL host |
| `DATABASE_PORT` | `5432` | PostgreSQL port |
| `DATABASE_USER` | `skillhub` | DB username |
| `DATABASE_PASSWORD` | — | DB password (required) |
| `DATABASE_NAME` | `skillhub` | Database name |
| `DATABASE_SSLMODE` | `disable` | SSL mode (use `require` in production) |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | — | Redis password |
| `MINIO_ENDPOINT` | `localhost:9000` | MinIO address |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | — | MinIO secret key (required) |
| `MINIO_BUCKET` | `skillhub-artifacts` | Bucket name |
| `MINIO_USE_SSL` | `false` | Enable HTTPS for MinIO |
| `JWT_SECRET` | — | JWT signing secret (required, 64+ chars) |
| `JWT_EXPIRATION` | `24h` | Token validity duration |
| `LLM_ENDPOINT` | `http://localhost:11434` | LLM API (Ollama-compatible) |
| `LLM_API_KEY` | — | LLM API key (optional) |
| `LLM_MODEL` | `llama3` | Model name |

### 4.2 Development Mode

Start backend with `--dev` to use SQLite and disable auth:

```bash
cd backend
go run ./cmd/server --dev
```

---

## 5. Production Hardening

### 5.1 Required Changes

- [ ] Replace `JWT_SECRET` with 64-char random string: `openssl rand -hex 32`
- [ ] Set strong `POSTGRES_PASSWORD`
- [ ] Set strong `MINIO_ROOT_PASSWORD`
- [ ] Enable DB TLS: `DATABASE_SSLMODE=require`
- [ ] Enable MinIO HTTPS: `MINIO_USE_SSL=true`

### 5.2 Network Isolation

- Backend and Worker should not be directly internet-facing
- PostgreSQL, Redis, MinIO should only be accessible within the cluster network
- Expose frontend and API through Ingress with HTTPS only

### 5.3 Data Backup

```bash
# PostgreSQL backup
kubectl exec -n skillhub deploy/skillhub-postgresql -- \
  pg_dump -U skillhub skillhub | gzip > skillhub-$(date +%Y%m%d).sql.gz

# MinIO backup (using mc)
mc mirror skillhub-minio/skillhub-artifacts /backup/minio/
```

---

## 6. Upgrades & Rollbacks

### Docker Compose

```bash
docker compose -f deploy/docker/docker-compose.yml pull
docker compose -f deploy/docker/docker-compose.yml up -d
```

### Helm

```bash
# Upgrade
helm upgrade skillhub ./deploy/helm/skillhub --namespace skillhub -f my-values.yaml

# View history
helm history skillhub -n skillhub

# Rollback to previous
helm rollback skillhub -n skillhub

# Rollback to revision 3
helm rollback skillhub 3 -n skillhub
```

---

## 7. Troubleshooting

### "failed to connect to database"

1. Check if PostgreSQL container/service is healthy (`pg_isready`)
2. Verify `DATABASE_HOST` and `DATABASE_PORT`
3. Ensure containers are on the same network (Docker Compose default: same network)

### Artifact upload fails: "bucket does not exist"

Manually create the bucket on first run:

```bash
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/skillhub-artifacts
```

### Helm pods stuck in Pending state

Usually due to PVC unable to bind StorageClass:

```bash
kubectl get storageclass

helm upgrade skillhub ./deploy/helm/skillhub \
  --set postgresql.primary.persistence.storageClass="standard"
```
