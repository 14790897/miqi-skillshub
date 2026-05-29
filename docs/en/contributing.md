# Contributing Guide

> Local development setup, code standards, and contribution workflow

---

## Table of Contents

1. [Local Development Setup](#1-local-development-setup)
2. [Backend Development (Go)](#2-backend-development-go)
3. [Frontend Development (Next.js)](#3-frontend-development-nextjs)
4. [Worker Development (Python)](#4-worker-development-python)
5. [CLI Development (Go)](#5-cli-development-go)
6. [Code Standards](#6-code-standards)
7. [Commit Message Format](#7-commit-message-format)
8. [Project Directory Conventions](#8-project-directory-conventions)

---

## 1. Local Development Setup

### 1.1 Required Tools

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Go | 1.23 | https://go.dev/dl/ |
| Node.js | 20 LTS | https://nodejs.org/ |
| Python | 3.12 | https://python.org/ |
| Docker Desktop | 24.0 | https://docker.com/ |
| Git | 2.40 | https://git-scm.com/ |

### 1.2 Clone Repository

```bash
git clone https://github.com/lichman0405/miqi-skillshub.git
cd skillhub
```

### 1.3 Start Dependency Services

```bash
# Start only infrastructure services, not the app itself
docker compose -f deploy/docker/docker-compose.yml up -d postgres redis minio
```

---

## 2. Backend Development (Go)

### 2.1 Start in Dev Mode

```bash
cd backend

# Dev mode: SQLite + no JWT auth required
go run ./cmd/server --dev

# Production mode: requires config.yaml or environment variables
go run ./cmd/server
```

In dev mode:
- Uses in-memory SQLite, tables auto-created on start
- All requests run as user UUID `00000000-0000-0000-0000-000000000001`
- Relaxed CORS allowing `localhost:3000`, `localhost:5173`, etc.

### 2.2 Layer Responsibilities

| Directory | Responsibility |
|-----------|---------------|
| `internal/model/` | GORM data models |
| `internal/repository/` | Database CRUD operations |
| `internal/service/` | Business logic |
| `internal/handler/` | HTTP request/response handling |
| `internal/router/` | Route registration |
| `internal/middleware/` | Auth, logging, recovery |

### 2.3 Adding a New Resource

Example: adding a `Comment` resource:

1. `internal/model/comment.go` — define model
2. `internal/repository/comment_repo.go` — define CRUD
3. `internal/service/comment_service.go` — business logic
4. `internal/handler/comment.go` — HTTP handler
5. `internal/router/router.go` — register routes

### 2.4 Run Tests

```bash
cd backend
go test ./...
```

### 2.5 Format Code

```bash
gofmt -w .
go vet ./...
```

---

## 3. Frontend Development (Next.js)

### 3.1 Start Dev Server

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000. Ensure backend is running at http://localhost:8080.

### 3.2 Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # Authenticated pages
│   │   ├── layout.tsx      # App shell (Header + Sidebar)
│   │   ├── skills/         # Skills pages
│   │   ├── admin/          # Admin pages
│   │   └── reviews/        # Review pages
│   ├── login/              # Login page (unauthenticated)
│   └── register/           # Registration page
├── components/
│   ├── layout/             # Header, Sidebar, etc.
│   └── icons.tsx           # Icon exports
└── lib/
    ├── api.ts              # API request wrapper
    └── types.ts            # TypeScript type definitions
```

### 3.3 API Call Convention

All API calls go through `src/lib/api.ts`:

```typescript
import { api } from '@/lib/api'

const skills = await api.get('/skills?page=1')
await api.post('/skills', { name: 'my-skill' })
```

---

## 4. Worker Development (Python)

### 4.1 Setup Virtual Environment

```bash
cd workers
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
```

### 4.2 Run Worker Locally

```bash
# Ensure Redis is running
celery -A celery_app worker --loglevel=debug --concurrency=1
```

### 4.3 Run Tests

```bash
pytest tests/ -v
```

### 4.4 Format Code

```bash
ruff check .
ruff format .
```

---

## 5. CLI Development (Go)

### 5.1 Build Locally

```bash
cd cli
go build -o skillhub ./cmd/skillhub
./skillhub --help
```

### 5.2 Adding a New Subcommand

In `cli/cmd/skillhub/main.go`, add a new `cobra.Command`:

```go
var myCmd = &cobra.Command{
    Use:   "my-command <arg>",
    Short: "Brief description",
    RunE: func(cmd *cobra.Command, args []string) error {
        // implementation
        return nil
    },
}

// Register in init()
rootCmd.AddCommand(myCmd)
```

---

## 6. Code Standards

### 6.1 Go

- Follow [Effective Go](https://go.dev/doc/effective_go)
- All errors must be checked and handled — no `_ = err`
- Use `zap.Logger` for logging; no `fmt.Println` in production code
- Interface names describe behavior (not `IFoo`)
- Package names: lowercase, no underscores

### 6.2 TypeScript / React

- Component files: PascalCase (`SkillCard.tsx`)
- Utility files: camelCase (`apiClient.ts`)
- All API response types defined in `lib/types.ts`
- Avoid `any`; use specific types

### 6.3 Python

- Follow [PEP 8](https://pep8.org/)
- Use `ruff` for linting and formatting
- Line length: 120 characters
- All public functions must have type annotations

---

## 7. Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]
```

**Types:**

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation update |
| `refactor` | Refactoring (no feature change) |
| `test` | Add/modify tests |
| `chore` | Build/toolchain changes |
| `perf` | Performance improvement |

**Examples:**

```
feat(backend): add skill tag filtering to search API
fix(frontend): correct pagination offset in skills list
docs: update deployment guide for Helm 3.14
chore(workers): upgrade semgrep to 1.100
```

---

## 8. Project Directory Conventions

- Each Go package has a single responsibility; no cross-layer direct calls (handlers must not call repositories directly)
- Database migration files go in `backend/migrations/`, named with incrementing numbers (`001_init.sql`)
- Config defaults are set in the `Load()` function in `backend/internal/config/config.go`
- New environment variables must be synced across: `config.yaml`, `docker-compose.yml`, `helm/configmap.yaml`, and this document
