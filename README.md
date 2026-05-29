# MiQi SkillHub

> 企业内部 AI Skills 管理平台 | Enterprise AI Skills Management Platform

**English** | [中文](#中文)

---

## English

MiQi SkillHub is a self-hosted, enterprise-grade platform for managing reusable AI Skills. Think of it as "GitHub for AI Skills" — helping organizations safely create, review, publish, discover, and use AI capabilities across every team.

### Key Features

- **Lifecycle management** — draft → scan → review → publish → deprecate
- **Security-first** — automatic static scanning (Semgrep, Gitleaks) + LLM-powered quality evaluation + human review
- **Trust Grades (A–F)** — every version carries a computed trust level
- **Role-based access** — Consumer / Author / Maintainer / Security Reviewer / Platform Admin
- **Runtime API** — agent clients can query, verify, and download skills programmatically
- **CLI tooling** — `skillhub` CLI for init, lint, submit, install

### Architecture

```
┌─────────────┐     REST/JSON      ┌──────────────────┐
│  Frontend   │◄──────────────────►│  Backend (Go)    │
│  (Next.js)  │                    │  Gin + GORM      │
└─────────────┘                    └──────┬───────────┘
                                          │
              ┌───────────────────────────┼─────────────────┐
              │                           │                 │
       ┌──────▼──────┐          ┌─────────▼──────┐  ┌──────▼──────┐
       │  PostgreSQL  │          │     Redis      │  │    MinIO    │
       │  (pgvector)  │          │  (task queue)  │  │ (artifacts) │
       └─────────────┘          └────────┬───────┘  └─────────────┘
                                          │
                                 ┌────────▼────────┐
                                 │ Workers (Python) │
                                 │ Celery + scanners│
                                 └─────────────────┘
```

### Quick Start (Docker Compose)

```bash
git clone https://github.com/lichman0405/miqi-skillshub.git
cd skillhub
docker compose -f deploy/docker/docker-compose.yml up -d
```

Access the platform at http://localhost:8080 (API) and http://localhost:3000 (UI).

### Helm (Kubernetes)

```bash
helm install skillhub ./deploy/helm/skillhub \
  --namespace skillhub --create-namespace \
  --set app.jwtSecret="$(openssl rand -hex 32)" \
  --set ingress.hosts[0].host="skillhub.example.com"
```

### Documentation

| Document | 文档 |
|---|---|
| [Architecture](docs/en/architecture.md) | [架构设计](docs/zh/architecture.md) |
| [Deployment Guide](docs/en/deployment.md) | [部署指南](docs/zh/deployment.md) |
| [API Reference](docs/en/api-reference.md) | [API 文档](docs/zh/api-reference.md) |
| [User Guide](docs/en/user-guide.md) | [用户手册](docs/zh/user-guide.md) |
| [Contributing](docs/en/contributing.md) | [开发者指南](docs/zh/contributing.md) |
| [CLI Reference](docs/en/cli.md) | [CLI 使用文档](docs/zh/cli.md) |
| [OpenAPI Spec](docs/api/openapi.yaml) | [OpenAPI 规范](docs/api/openapi.yaml) |

---

## 中文

MiQi SkillHub 是一个可本地部署的企业级 AI Skills 管理平台。将其理解为"AI 技能的 GitHub"——帮助企业安全地创建、审核、发布、发现和复用 AI 能力，覆盖所有职能团队。

### 核心功能

- **完整生命周期管理** — 草稿 → 自动扫描 → 人工审核 → 发布 → 废弃
- **安全优先** — 自动静态扫描（Semgrep、Gitleaks）+ LLM 质量评估 + 人工审批
- **可信等级（A–F）** — 每个版本都有自动计算的可信等级
- **基于角色的权限** — 使用者 / 作者 / 维护者 / 安全审核员 / 平台管理员
- **运行时 API** — Agent 客户端可以程序化地查询、验证和下载技能
- **CLI 工具** — `skillhub` CLI 支持 init、lint、submit、install

### 快速开始（Docker Compose）

```bash
git clone https://github.com/lichman0405/miqi-skillshub.git
cd skillhub
docker compose -f deploy/docker/docker-compose.yml up -d
```

访问平台：http://localhost:8080（API）和 http://localhost:3000（前端界面）。

### 文档导航

| 文档 | Document |
|---|---|
| [架构设计](docs/zh/architecture.md) | [Architecture](docs/en/architecture.md) |
| [部署指南](docs/zh/deployment.md) | [Deployment Guide](docs/en/deployment.md) |
| [API 文档](docs/zh/api-reference.md) | [API Reference](docs/en/api-reference.md) |
| [用户手册](docs/zh/user-guide.md) | [User Guide](docs/en/user-guide.md) |
| [开发者指南](docs/zh/contributing.md) | [Contributing](docs/en/contributing.md) |
| [CLI 使用文档](docs/zh/cli.md) | [CLI Reference](docs/en/cli.md) |

---

## License

Proprietary — MiQi AI. All rights reserved.
