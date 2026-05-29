# 部署指南

> MiQi SkillHub — 支持 Docker Compose（单机）和 Kubernetes Helm（生产）两种部署方式

---

## 目录

1. [环境要求](#1-环境要求)
2. [Docker Compose 部署](#2-docker-compose-部署)
3. [Kubernetes Helm 部署](#3-kubernetes-helm-部署)
4. [配置参考](#4-配置参考)
5. [生产安全加固](#5-生产安全加固)
6. [升级与回滚](#6-升级与回滚)
7. [常见问题](#7-常见问题)

---

## 1. 环境要求

### Docker Compose

| 组件 | 最低版本 |
|------|---------|
| Docker | 24.0+ |
| Docker Compose | 2.20+ |
| 内存 | 4 GB |
| 磁盘 | 20 GB |

### Kubernetes

| 组件 | 最低版本 |
|------|---------|
| Kubernetes | 1.27+ |
| Helm | 3.12+ |
| 内存（节点总量） | 8 GB |
| 磁盘（PVC） | 100 GB |

---

## 2. Docker Compose 部署

### 2.1 快速启动

```bash
git clone https://github.com/lichman0405/miqi-skillshub.git
cd skillhub

# 启动全部服务（PostgreSQL + Redis + MinIO + Backend + Worker）
docker compose -f deploy/docker/docker-compose.yml up -d

# 查看服务状态
docker compose -f deploy/docker/docker-compose.yml ps

# 查看后端日志
docker compose -f deploy/docker/docker-compose.yml logs -f backend
```

服务启动后默认端口：

| 服务 | 地址 |
|------|------|
| Backend API | http://localhost:8080 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| MinIO API | http://localhost:9000 |
| MinIO 控制台 | http://localhost:9001 |

### 2.2 生产配置覆盖

创建 `deploy/docker/docker-compose.override.yml` 覆盖默认值：

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

### 2.3 停止与清理

```bash
# 停止服务（保留数据）
docker compose -f deploy/docker/docker-compose.yml down

# 停止服务并删除数据卷（慎用！）
docker compose -f deploy/docker/docker-compose.yml down -v
```

---

## 3. Kubernetes Helm 部署

### 3.1 前置准备

```bash
# 确认集群可用
kubectl cluster-info

# 创建命名空间
kubectl create namespace skillhub
```

### 3.2 最小化安装

```bash
helm install skillhub ./deploy/helm/skillhub \
  --namespace skillhub \
  --set app.jwtSecret="$(openssl rand -hex 32)"
```

### 3.3 生产部署（带自定义 values）

创建 `my-values.yaml`：

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
  # 使用外部 RDS / CloudSQL
  enabled: false
  external:
    host: "postgres.internal"
    port: 5432
    username: "skillhub"
    password: "strong-password"
    database: "skillhub"
    sslmode: "require"

redis:
  # 使用外部 Redis（ElastiCache 等）
  enabled: false
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

### 3.4 验证部署

```bash
# 查看 Pod 状态
kubectl get pods -n skillhub

# 查看服务
kubectl get svc -n skillhub

# 查看 Ingress
kubectl get ingress -n skillhub

# 检查 API 健康状态
kubectl port-forward -n skillhub svc/skillhub-backend 8080:8080 &
curl http://localhost:8080/api/v1/health
```

### 3.5 使用镜像私仓

```yaml
global:
  imageRegistry: "registry.company.com"
  imagePullSecrets:
    - name: registry-credentials

backend:
  image:
    repository: "lichman0405/miqi-skills-hub-backend"
    tag: "1.2.0"

worker:
  image:
    repository: "lichman0405/miqi-skills-hub-worker"
    tag: "1.2.0"

frontend:
  image:
    repository: "lichman0405/miqi-skills-hub-frontend"
    tag: "1.2.0"
```

---

## 4. 配置参考

### 4.1 后端环境变量（完整列表）

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `SERVER_PORT` | `8080` | 监听端口 |
| `DATABASE_HOST` | `localhost` | PostgreSQL 主机 |
| `DATABASE_PORT` | `5432` | PostgreSQL 端口 |
| `DATABASE_USER` | `skillhub` | 数据库用户 |
| `DATABASE_PASSWORD` | — | 数据库密码（必填）|
| `DATABASE_NAME` | `skillhub` | 数据库名 |
| `DATABASE_SSLMODE` | `disable` | SSL 模式（生产建议 `require`）|
| `REDIS_HOST` | `localhost` | Redis 主机 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `REDIS_PASSWORD` | — | Redis 密码 |
| `MINIO_ENDPOINT` | `localhost:9000` | MinIO 地址 |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO 访问密钥 |
| `MINIO_SECRET_KEY` | — | MinIO 密钥（必填）|
| `MINIO_BUCKET` | `skillhub-artifacts` | 存储桶名 |
| `MINIO_USE_SSL` | `false` | 是否使用 HTTPS |
| `JWT_SECRET` | — | JWT 签名密钥（必填，建议 64 位随机字符串）|
| `JWT_EXPIRATION` | `24h` | Token 有效期 |
| `LLM_ENDPOINT` | `http://localhost:11434` | LLM API 地址（Ollama 格式）|
| `LLM_API_KEY` | — | LLM API 密钥（可选）|
| `LLM_MODEL` | `llama3` | 使用的模型名 |

### 4.2 开发模式

后端支持 `--dev` 参数启动开发模式：

- 使用 SQLite 代替 PostgreSQL（无需外部依赖）
- 关闭 JWT 鉴权（所有请求以默认用户身份运行）
- 允许更宽松的 CORS 配置

```bash
cd backend
go run ./cmd/server --dev
```

---

## 5. 生产安全加固

### 5.1 必须修改的默认值

- [ ] `JWT_SECRET`：替换为 64 位随机字符串（`openssl rand -hex 32`）
- [ ] PostgreSQL 密码：`POSTGRES_PASSWORD`
- [ ] MinIO 密钥：`MINIO_ROOT_PASSWORD`
- [ ] 数据库启用 TLS：`DATABASE_SSLMODE=require`
- [ ] MinIO 启用 HTTPS：`MINIO_USE_SSL=true`

### 5.2 网络隔离建议

- Backend、Worker 不应直接暴露公网
- PostgreSQL、Redis、MinIO 仅在集群内部网络可访问
- 前端和 API 通过 Ingress 统一暴露，建议开启 HTTPS

### 5.3 数据备份

```bash
# PostgreSQL 备份
kubectl exec -n skillhub deploy/skillhub-postgresql -- \
  pg_dump -U skillhub skillhub | gzip > skillhub-$(date +%Y%m%d).sql.gz

# MinIO 备份（使用 mc 工具）
mc mirror skillhub-minio/skillhub-artifacts /backup/minio/
```

---

## 6. 升级与回滚

### Docker Compose

```bash
# 拉取新镜像
docker compose -f deploy/docker/docker-compose.yml pull

# 重启服务
docker compose -f deploy/docker/docker-compose.yml up -d
```

### Helm

```bash
# 升级
helm upgrade skillhub ./deploy/helm/skillhub \
  --namespace skillhub \
  -f my-values.yaml

# 查看历史版本
helm history skillhub -n skillhub

# 回滚到上一版本
helm rollback skillhub -n skillhub

# 回滚到指定版本
helm rollback skillhub 3 -n skillhub
```

---

## 7. 常见问题

### Q: Backend 启动时报 "failed to connect to database"

检查以下几点：
1. PostgreSQL 容器/服务是否已健康（`pg_isready`）
2. `DATABASE_HOST`、`DATABASE_PORT` 是否正确
3. 容器网络是否互通（Docker Compose 默认同 network）

### Q: 上传 artifact 失败，报 "bucket does not exist"

首次启动时 MinIO 存储桶需要手动创建，或在 Worker 初始化时自动创建。手动创建方式：

```bash
# 使用 MinIO mc 工具
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/skillhub-artifacts
```

### Q: Helm 安装后 Pod 处于 Pending 状态

通常是 PVC 无法绑定 StorageClass，检查集群中可用的 StorageClass：

```bash
kubectl get storageclass

# 指定 StorageClass
helm upgrade skillhub ./deploy/helm/skillhub \
  --set postgresql.primary.persistence.storageClass="standard"
```

### Q: 如何重置管理员密码

```bash
# 进入后端容器
kubectl exec -it -n skillhub deploy/skillhub-backend -- sh

# 或 Docker Compose
docker compose exec backend sh

# 使用 API 直接更新（需数据库访问权限）
# TODO: 提供 admin CLI 工具
```
