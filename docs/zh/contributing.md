# 开发者指南

> 本地开发环境搭建、代码规范与贡献流程

---

## 目录

1. [本地开发环境搭建](#1-本地开发环境搭建)
2. [后端开发（Go）](#2-后端开发go)
3. [前端开发（Next.js）](#3-前端开发nextjs)
4. [Worker 开发（Python）](#4-worker-开发python)
5. [CLI 开发（Go）](#5-cli-开发go)
6. [代码规范](#6-代码规范)
7. [提交规范](#7-提交规范)
8. [项目目录约定](#8-项目目录约定)

---

## 1. 本地开发环境搭建

### 1.1 必要工具

| 工具 | 最低版本 | 安装方式 |
|------|---------|---------|
| Go | 1.23 | https://go.dev/dl/ |
| Node.js | 20 LTS | https://nodejs.org/ |
| Python | 3.12 | https://python.org/ |
| Docker Desktop | 24.0 | https://docker.com/ |
| Git | 2.40 | https://git-scm.com/ |

### 1.2 克隆项目

```bash
git clone https://github.com/lichman0405/miqi-skillshub.git
cd skillhub
```

### 1.3 启动依赖服务

```bash
# 只启动数据库、缓存和对象存储，不启动应用
docker compose -f deploy/docker/docker-compose.yml up -d postgres redis minio
```

---

## 2. 后端开发（Go）

### 2.1 开发模式启动

```bash
cd backend

# 开发模式（SQLite + 无需 JWT 鉴权）
go run ./cmd/server --dev

# 生产模式（需要配置 config.yaml 或环境变量）
go run ./cmd/server
```

开发模式下：
- 使用内存 SQLite，每次启动自动创建表
- 所有请求以 UUID `00000000-0000-0000-0000-000000000001` 的用户身份运行
- CORS 宽松，允许 `localhost:3000`、`localhost:5173` 等

### 2.2 代码目录约定

| 目录 | 职责 | 示例 |
|------|------|------|
| `internal/model/` | GORM 数据模型 | `skill.go` 定义 `Skill` 结构体 |
| `internal/repository/` | 数据库 CRUD 操作 | `skill_repo.go` |
| `internal/service/` | 业务逻辑 | `skill_service.go` |
| `internal/handler/` | HTTP 处理器 | `skill.go` 接收/响应 HTTP |
| `internal/router/` | 路由注册 | `router.go` 统一注册所有路由 |
| `internal/middleware/` | 中间件 | `auth.go` JWT 解析 |

### 2.3 添加新资源的步骤

以添加 `Comment` 资源为例：

1. `internal/model/comment.go` — 定义模型
2. `internal/repository/comment_repo.go` — 定义 CRUD
3. `internal/service/comment_service.go` — 业务逻辑
4. `internal/handler/comment.go` — HTTP Handler
5. `internal/router/router.go` — 注册路由

### 2.4 运行测试

```bash
cd backend
go test ./...
```

### 2.5 代码格式化

```bash
gofmt -w .
go vet ./...
```

---

## 3. 前端开发（Next.js）

### 3.1 启动开发服务器

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:3000

> 确保后端已在 http://localhost:8080 运行（开发模式）。

### 3.2 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # 需要登录的页面
│   │   ├── layout.tsx      # 应用 Shell（Header + Sidebar）
│   │   ├── skills/         # 技能相关页面
│   │   ├── admin/          # 管理后台页面
│   │   └── reviews/        # 审核页面
│   ├── login/              # 登录页（不需要鉴权）
│   └── register/           # 注册页
├── components/
│   ├── layout/             # Header、Sidebar 等布局组件
│   └── icons.tsx           # 图标统一导出
└── lib/
    ├── api.ts              # API 请求封装（fetch wrapper）
    └── types.ts            # TypeScript 类型定义
```

### 3.3 API 调用规范

所有 API 调用通过 `src/lib/api.ts` 中的封装函数：

```typescript
import { api } from '@/lib/api'

// 示例
const skills = await api.get('/skills?page=1')
await api.post('/skills', { name: 'my-skill', ... })
```

### 3.4 代码格式化

```bash
npm run lint
```

---

## 4. Worker 开发（Python）

### 4.1 设置虚拟环境

```bash
cd workers
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
```

### 4.2 本地运行 Worker

```bash
# 确保 Redis 在运行
celery -A celery_app worker --loglevel=debug --concurrency=1
```

### 4.3 目录结构

```
workers/
├── celery_app.py           # Celery 应用和任务注册
├── llm_judge/
│   └── judge.py            # LLM 质量评估逻辑
├── sandbox/
│   └── runner.py           # 脚本沙箱执行器
└── scanners/
    ├── manifest_validator.py   # skillhub.yaml 校验
    ├── secret_scanner.py       # Gitleaks 密钥扫描
    └── static_scanner.py       # Semgrep 静态分析
```

### 4.4 运行测试

```bash
pytest tests/ -v
```

### 4.5 代码格式化

```bash
ruff check .
ruff format .
```

---

## 5. CLI 开发（Go）

### 5.1 本地构建

```bash
cd cli
go build -o skillhub ./cmd/skillhub
./skillhub --help
```

### 5.2 添加新子命令

在 `cli/cmd/skillhub/main.go` 中，参照现有命令（如 `searchCmd`）使用 Cobra 框架添加：

```go
var myCmd = &cobra.Command{
    Use:   "my-command <arg>",
    Short: "命令简介",
    RunE: func(cmd *cobra.Command, args []string) error {
        // 实现逻辑
        return nil
    },
}

// 在 init() 中注册
rootCmd.AddCommand(myCmd)
```

---

## 6. 代码规范

### 6.1 Go 规范

- 遵循 [Effective Go](https://go.dev/doc/effective_go)
- 错误处理：所有错误必须被检查和处理，不允许 `_ = err`
- 日志：使用 `zap.Logger`，禁止使用 `fmt.Println` 在生产代码中打印
- 命名：接口名称以行为命名（非 `IFoo`）
- 包名：小写，单词，不含下划线

### 6.2 TypeScript/React 规范

- 组件文件名使用 PascalCase（`SkillCard.tsx`）
- 工具函数文件名使用 camelCase（`apiClient.ts`）
- 所有 API 响应类型定义在 `lib/types.ts` 中
- 禁止使用 `any`，尽量使用具体类型

### 6.3 Python 规范

- 遵循 [PEP 8](https://pep8.org/)
- 使用 `ruff` 作为 linter 和 formatter
- 行长度：120 字符
- 类型注解：所有公共函数必须有类型注解

---

## 7. 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <subject>

[optional body]
```

**类型（type）**：

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `refactor` | 重构（不含功能变更）|
| `test` | 添加/修改测试 |
| `chore` | 构建/工具链变更 |
| `perf` | 性能优化 |

**示例**：

```
feat(backend): add skill tag filtering to search API
fix(frontend): correct pagination offset in skills list
docs: update deployment guide for Helm 3.14
chore(workers): upgrade semgrep to 1.100
```

---

## 8. 项目目录约定

- 每个 Go 包只有一个职责，不允许跨层直接调用（handler 不直接调用 repository）
- 数据库迁移文件放在 `backend/migrations/`，使用自增数字命名（`001_init.sql`）
- 配置默认值在 `backend/internal/config/config.go` 的 `Load()` 函数中设置
- 新的环境变量需同步更新：`config.yaml`、`docker-compose.yml`、`helm/configmap.yaml` 和本文档
