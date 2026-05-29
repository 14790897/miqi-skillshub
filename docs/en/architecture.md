# Architecture Design

> MiQi SkillHub — Enterprise AI Skills Management Platform

---

## 1. System Overview

SkillHub is a self-hosted AI Skills asset management platform composed of four primary services:

| Service | Stack | Responsibility |
|---------|-------|----------------|
| **Backend** | Go 1.23 / Gin / GORM | REST API, business logic, access control |
| **Frontend** | Next.js 15 / TypeScript / Tailwind | Web UI |
| **Workers** | Python 3.12 / Celery | Security scanning, LLM quality evaluation |
| **CLI** | Go / Cobra | Local skill package tooling |

---

## 2. System Architecture

```
                          ┌─────────────────────────────────┐
                          │      Users / Agent Clients       │
                          │  Browser / CLI / Chatbot / MCP   │
                          └───────────┬─────────────────────┘
                                      │ HTTP / REST
                          ┌───────────▼─────────────────────┐
                          │        Ingress / Reverse Proxy   │
                          └──────┬──────────────┬────────────┘
                                 │              │
                    ┌────────────▼──┐   ┌───────▼─────────┐
                    │  Frontend     │   │   Backend (API) │
                    │  Next.js      │   │   Go / Gin      │
                    │  :3000        │   │   :8080         │
                    └───────────────┘   └──────┬──────────┘
                                               │
               ┌───────────────────────────────┼────────────────────┐
               │                               │                    │
    ┌──────────▼──────────┐        ┌───────────▼──────┐  ┌─────────▼──────┐
    │  PostgreSQL          │        │    Redis          │  │   MinIO        │
    │  pgvector:pg16       │        │    7-alpine       │  │  Object Store  │
    │  Skills/Versions/    │        │  Task Queue/Cache │  │  Skill Artifacts│
    │  Users/Audit         │        │                   │  │                │
    └─────────────────────┘        └──────────┬────────┘  └────────────────┘
                                              │
                                   ┌──────────▼───────────┐
                                   │   Workers (Celery)   │
                                   │   Python 3.12        │
                                   ├──────────────────────┤
                                   │  • Semgrep (static)  │
                                   │  • Gitleaks (secrets)│
                                   │  • LLM quality judge │
                                   │  • Manifest validator│
                                   └──────────────────────┘
```

---

## 3. Repository Layout

```
miqi-skill-hub/
├── backend/              # Go backend service
│   ├── cmd/server/       # Entrypoint (main.go)
│   ├── config/           # config.yaml
│   ├── internal/
│   │   ├── config/       # Config loading (viper)
│   │   ├── database/     # DB connection (GORM)
│   │   ├── handler/      # HTTP handlers (one per resource)
│   │   ├── middleware/   # JWT auth, RBAC, logging, recovery
│   │   ├── model/        # GORM data models
│   │   ├── repository/   # Data access layer
│   │   ├── router/       # Route registration
│   │   └── service/      # Business logic layer
│   └── migrations/       # Database migration files
├── frontend/             # Next.js frontend
│   └── src/
│       ├── app/          # App Router pages
│       ├── components/   # Shared components
│       └── lib/          # API client, type definitions
├── workers/              # Python Celery workers
│   ├── celery_app.py     # Celery app config
│   ├── llm_judge/        # LLM quality evaluation
│   ├── sandbox/          # Sandbox runner
│   └── scanners/         # Static analyzers
├── cli/                  # Go CLI tool
│   └── cmd/skillhub/     # skillhub CLI entrypoint
└── deploy/
    ├── docker/           # Docker Compose + Dockerfiles
    └── helm/skillhub/    # Kubernetes Helm Chart
```

---

## 4. Core Data Model

```
User ─────────────────► Namespace
  │                         │
  │ (owner)                 │ (belongs to)
  ▼                         ▼
Skill ◄──────────────────────
  │
  │ (has many)
  ▼
SkillVersion
  │            │            │
  ▼            ▼            ▼
ScanReport  ReviewRecord  Artifact(MinIO)
```

### 4.1 SkillVersion State Machine

```
  candidate ──► (auto scan) ──► approved ──► (human review) ──► published
      │                             │                                │
      │                             └───► (rejected) ──► rejected   │
      │                                                              │
      └──────────────────────────────────────► blocked ◄────────────┘
                                                   │
                                           (maintainer action)
                                           deprecated
```

### 4.2 TrustGrade Computation

| Grade | Criteria |
|-------|----------|
| **A** | All auto-scans passed + human review approved + LLM score ≥ 80 |
| **B** | Auto-scans passed + basic review |
| **C** | Low/medium risk findings present |
| **D** | High-risk findings, pending security team approval |
| **F** | Blocked; installation prohibited |

---

## 5. Security Architecture

### 5.1 Authentication & Authorization

- **Authentication**: JWT Bearer Token (HS256)
- **Authorization**: Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| `consumer` | Search, browse, install published skills |
| `author` | Create skills, submit versions, upload artifacts |
| `maintainer` | Publish/deprecate/block versions, manage lifecycle |
| `security_reviewer` | Review versions, view scan reports |
| `namespace_admin` | Manage namespaces |
| `platform_admin` | Full access, system configuration |

### 5.2 Skill Security Scan Pipeline

```
Upload artifact
      │
      ▼
① Manifest validation (skillhub.yaml schema & field compliance)
      │
      ▼
② Secret Scanner (Gitleaks — detect hardcoded credentials)
      │
      ▼
③ Static Scanner (Semgrep — detect dangerous patterns in scripts)
      │
      ▼
④ LLM Judge (evaluate prompt safety and intent compliance)
      │
      ▼
⑤ Generate ScanReport (risk_level: low/medium/high/critical)
      │
      ▼
⑥ Enter human review queue
```

---

## 6. Deployment Modes

| Mode | Use Case | Notes |
|------|----------|-------|
| **Dev (local)** | Development/debugging | SQLite + no auth, start with `--dev` flag |
| **Docker Compose** | Single-host / test environment | Full stack: PostgreSQL + Redis + MinIO |
| **Helm (K8s)** | Production / private cloud | HPA, external DB, Ingress support |

---

## 7. Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend language | Go | Compiled, low memory, simple deployment, single binary |
| Web framework | Gin | High performance, mature ecosystem |
| ORM | GORM | Feature-rich, idiomatic Go |
| Database | PostgreSQL + pgvector | Relational + vector search (future semantic skill search) |
| Object storage | MinIO | S3-compatible, self-hostable |
| Task queue | Celery + Redis | Rich Python scanner ecosystem |
| Frontend | Next.js App Router | SSR + strong typing, excellent DX |
