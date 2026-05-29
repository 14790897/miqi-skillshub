# 架构设计文档

> MiQi SkillHub — 企业内部 AI Skills 管理平台

---

## 1. 系统概览

SkillHub 是一个可私有化部署的 AI Skills 资产管理平台。系统由四个主要服务组成：

| 服务 | 技术栈 | 职责 |
|------|--------|------|
| **Backend** | Go 1.23 / Gin / GORM | REST API、业务逻辑、权限控制 |
| **Frontend** | Next.js 15 / TypeScript / Tailwind | Web 用户界面 |
| **Workers** | Python 3.12 / Celery | 安全扫描、LLM 质量评估 |
| **CLI** | Go / Cobra | 技能包本地操作工具 |

---

## 2. 系统架构图

```
                          ┌─────────────────────────────────┐
                          │         用户 / Agent 客户端        │
                          │  浏览器 / CLI / Chatbot / MCP      │
                          └───────────┬─────────────────────┘
                                      │ HTTP / REST
                          ┌───────────▼─────────────────────┐
                          │         Ingress / 反向代理         │
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
    │  pgvector:pg16       │        │    7-alpine       │  │  对象存储       │
    │  技能/版本/用户/审计    │        │   任务队列/缓存    │  │  技能制品包     │
    └─────────────────────┘        └──────────┬────────┘  └────────────────┘
                                              │
                                   ┌──────────▼───────────┐
                                   │   Workers (Celery)   │
                                   │   Python 3.12        │
                                   ├──────────────────────┤
                                   │  • Semgrep 静态扫描   │
                                   │  • Gitleaks 密钥检测  │
                                   │  • LLM 质量评估       │
                                   │  • Manifest 校验     │
                                   └──────────────────────┘
```

---

## 3. 目录结构

```
miqi-skill-hub/
├── backend/              # Go 后端服务
│   ├── cmd/server/       # 入口文件 main.go
│   ├── config/           # 配置文件（config.yaml）
│   ├── internal/
│   │   ├── config/       # 配置加载（viper）
│   │   ├── database/     # 数据库连接（GORM）
│   │   ├── handler/      # HTTP 处理器（每资源一文件）
│   │   ├── middleware/   # JWT 鉴权、RBAC、日志、恢复
│   │   ├── model/        # GORM 数据模型
│   │   ├── repository/   # 数据访问层
│   │   ├── router/       # 路由注册
│   │   └── service/      # 业务逻辑层
│   └── migrations/       # 数据库迁移文件
├── frontend/             # Next.js 前端
│   └── src/
│       ├── app/          # App Router 页面
│       ├── components/   # 共享组件
│       └── lib/          # API 客户端、类型定义
├── workers/              # Python Celery Worker
│   ├── celery_app.py     # Celery 应用配置
│   ├── llm_judge/        # LLM 质量评估
│   ├── sandbox/          # 沙箱执行器
│   └── scanners/         # 静态扫描器
├── cli/                  # Go CLI 工具
│   └── cmd/skillhub/     # skillhub 命令行入口
└── deploy/
    ├── docker/           # Docker Compose + Dockerfile
    └── helm/skillhub/    # Kubernetes Helm Chart
```

---

## 4. 核心数据模型

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

### 4.1 SkillVersion 状态机

```
  candidate ──► (自动扫描) ──► approved ──► (人工审核) ──► published
      │                           │                            │
      │                           └─────► (拒绝) ──► rejected  │
      │                                                         │
      └──────────────────────────────────────► blocked ◄───────┘
                                                    │
                                            (维护者操作)
                                            deprecated
```

### 4.2 TrustGrade 计算规则

| 等级 | 条件 |
|------|------|
| **A** | 通过所有自动扫描 + 人工审核通过 + LLM 评估 ≥ 80 |
| **B** | 通过自动扫描 + 基础审核 |
| **C** | 存在低/中风险发现 |
| **D** | 存在高风险发现，待安全团队审批 |
| **F** | 阻断状态，禁止安装 |

---

## 5. 安全架构

### 5.1 认证与授权

- **认证**：JWT Bearer Token（HS256）
- **授权**：基于角色的访问控制（RBAC）

| 角色 | 权限范围 |
|------|---------|
| `consumer` | 搜索、浏览、安装已发布技能 |
| `author` | 创建技能、提交版本、上传制品 |
| `maintainer` | 发布/废弃/阻断版本、管理生命周期 |
| `security_reviewer` | 审核版本、查看扫描报告 |
| `namespace_admin` | 管理命名空间 |
| `platform_admin` | 管理所有资源、系统配置 |

### 5.2 技能包安全扫描流水线

```
上传 artifact
     │
     ▼
① Manifest 校验（skillhub.yaml 结构与字段合规）
     │
     ▼
② Secret Scanner（Gitleaks — 检测硬编码密钥）
     │
     ▼
③ Static Scanner（Semgrep — 检测脚本中的危险模式）
     │
     ▼
④ LLM Judge（LLM 评估提示词安全性、意图合规性）
     │
     ▼
⑤ 生成 ScanReport（risk_level: low/medium/high/critical）
     │
     ▼
⑥ 进入人工审核队列
```

---

## 6. 部署模式

| 模式 | 适用场景 | 说明 |
|------|---------|------|
| **Dev（本地开发）** | 开发调试 | SQLite + 无鉴权，`--dev` 参数启动 |
| **Docker Compose** | 单机/测试环境 | PostgreSQL + Redis + MinIO 全套 |
| **Helm (K8s)** | 生产/私有云 | 支持 HPA、外部数据库、Ingress |

---

## 7. 技术选型说明

| 决策 | 选择 | 原因 |
|------|------|------|
| 后端语言 | Go | 编译型、低内存、部署简单、单二进制 |
| Web 框架 | Gin | 高性能、生态成熟 |
| ORM | GORM | 功能完善、与 Go 生态契合 |
| 数据库 | PostgreSQL + pgvector | 关系型 + 向量搜索（未来技能语义搜索） |
| 对象存储 | MinIO | S3 兼容、可私有部署 |
| 任务队列 | Celery + Redis | Python 扫描器生态丰富 |
| 前端 | Next.js App Router | SSR + 强类型、开发体验好 |
