# 用户手册

> MiQi SkillHub — 面向所有角色的使用指南

---

## 目录

1. [使用者（Consumer）](#1-使用者consumer)
2. [技能作者（Author）](#2-技能作者author)
3. [技能维护者（Maintainer）](#3-技能维护者maintainer)
4. [安全审核员（Security Reviewer）](#4-安全审核员security-reviewer)
5. [平台管理员（Admin）](#5-平台管理员admin)
6. [运行时客户端集成](#6-运行时客户端集成)

---

## 1. 使用者（Consumer）

> 你是行政、人事、财务、运营等岗位，希望找到并使用 AI 技能。

### 1.1 搜索技能

1. 打开 SkillHub 平台主页
2. 在搜索框输入关键词（如"报销"、"入职"、"数据清洗"）
3. 可通过命名空间、标签、可信等级过滤结果
4. 点击技能卡片查看详情

### 1.2 了解技能

技能详情页包含：

| 字段 | 说明 |
|------|------|
| **可信等级** | A（最高）— F（已阻断），建议只安装 A 或 B 级技能 |
| **技能类型** | prompt_only / prompt_with_scripts 等 |
| **权限声明** | 该技能是否需要访问文件系统、网络、企业 API |
| **适用场景** | 技能适用的工作场景描述 |
| **兼容客户端** | 可在哪些 AI 工具中使用 |
| **版本历史** | 查看每个版本的状态和发布说明 |

### 1.3 安装技能

**方式一：通过 CLI 安装**

```bash
skillhub install company/hr/onboarding-assistant@1.2.0
```

**方式二：复制安装命令**

在技能详情页点击"复制安装命令"，粘贴到你的 AI 客户端配置。

**方式三：通过 Runtime API（企业 AI 平台自动集成）**

企业内部 Chatbot 或 Agent 平台会通过 Runtime API 自动获取你有权限的技能列表。

### 1.4 反馈与评分

- 使用技能后，可在技能详情页提交反馈
- 反馈将帮助维护者改进技能质量

---

## 2. 技能作者（Author）

> 你是业务专家、工程师或 AI Champion，负责创建和维护技能。

### 2.1 准备工作

安装 SkillHub CLI：

```bash
# macOS / Linux
curl -sSL https://skillhub.company.com/install.sh | sh

# 或直接下载二进制
# https://skillhub.company.com/releases
```

登录：

```bash
skillhub login --server https://skillhub.company.com
```

### 2.2 初始化技能项目

```bash
skillhub init my-skill-name
```

这会生成以下目录结构：

```
my-skill-name/
├── SKILL.md          # 技能核心说明（给 LLM 读）
├── skillhub.yaml     # 元数据与权限声明
├── scripts/          # 脚本文件（可选）
├── references/       # 参考文档（可选）
├── assets/           # 模板等资产（可选）
├── examples/         # 输入输出示例（可选）
└── evals/            # 评估用例（可选）
```

### 2.3 编写 SKILL.md

`SKILL.md` 是技能的核心，将被 LLM/Agent 直接读取。建议包含：

```markdown
---
name: reimbursement-checker
description: 企业报销单合规检查助手
---

# 报销单合规检查

## 适用场景
员工在提交报销前，检查报销项目是否符合公司财务政策。

## 输入
报销清单（条目、金额、日期、发票类型）

## 输出
合规检查结果，标注不合规项并说明原因，给出修改建议。

## 步骤
1. 检查报销金额是否超过各类别限额
2. 验证发票类型是否被允许
3. 检查报销时限（通常为消费后90天内）
4. 生成合规报告
```

### 2.4 编写 skillhub.yaml

```yaml
apiVersion: skillhub.company/v1
kind: Skill
metadata:
  name: reimbursement-checker
  namespace: company/finance
  displayName: 报销单合规检查
  description: 检查企业报销申请是否符合财务政策
  owner: "finance-team@company.com"
  tags: [finance, compliance, reimbursement]
spec:
  version: 1.0.0
  type: prompt_only
  audience: [all-employees]
  languages: [zh-CN]
  permissions:
    filesystem:
      read: none
      write: none
    network: deny
  dataPolicy:
    allowedDataClasses: [internal]
    prohibitedDataClasses: [trade_secret, regulated_personal_data]
  compatibility:
    clients: [enterprise-chatbot]
security:
  policyProfile: default-enterprise
```

### 2.5 本地校验

```bash
skillhub lint ./my-skill-name
```

通过 lint 检查后再提交，可减少审核退回次数。

### 2.6 提交技能

```bash
# 提交版本（自动触发安全扫描）
skillhub submit ./my-skill-name --version 1.0.0
```

### 2.7 查看扫描结果

```bash
skillhub status <version-id>
```

或在 Web 界面的"我的技能"中查看扫描报告。

### 2.8 处理审核反馈

如果审核员"请求修改"，你会收到通知，根据意见修改后：

```bash
# 修改技能内容后重新提交
skillhub submit ./my-skill-name --version 1.0.1
```

---

## 3. 技能维护者（Maintainer）

> 你负责技能的整体生命周期，有权发布、废弃或阻断版本。

### 3.1 发布版本

只有审核通过（`approved`）的版本才能发布：

- Web 界面：进入版本详情 → 点击"发布"
- API：`POST /api/v1/versions/:vid/publish`

### 3.2 管理版本状态

| 操作 | 适用场景 | Web 操作 |
|------|---------|---------|
| **发布** | 审核通过，可供企业使用 | 版本详情 → 发布 |
| **废弃** | 有更新版本，旧版本不再推荐 | 版本详情 → 废弃 |
| **阻断** | 发现安全问题，立即禁止安装 | 版本详情 → 阻断 |

### 3.3 标记稳定版本

可以将某个版本标记为"稳定版"（stable），作为默认推荐版本。

### 3.4 处理用户反馈

在"反馈"页面查看用户提交的问题和评分，决定是否需要更新版本。

---

## 4. 安全审核员（Security Reviewer）

> 你负责人工审核技能版本，确保其安全合规。

### 4.1 查看待审核队列

Web 界面导航到"审核" → "待审核"，或访问 `/reviews` 页面。

### 4.2 审核步骤

1. **查看自动扫描报告**
   - Manifest 校验：skillhub.yaml 格式和字段合规性
   - Secret Scanner：是否含有硬编码密钥
   - Static Scanner：脚本中是否有危险代码模式
   - LLM Judge：提示词是否存在提示注入或意图风险

2. **阅读 SKILL.md**
   - 内容是否清晰明确
   - 是否存在越权或不当的系统提示

3. **检查权限声明**
   - 技能请求的权限是否与其功能相符
   - 数据分类是否合理

4. **作出决定**

| 决定 | 说明 |
|------|------|
| **批准** | 技能安全合规，可以发布 |
| **请求修改** | 需要作者修改特定内容后再审 |
| **拒绝** | 存在严重安全问题，不允许发布 |

---

## 5. 平台管理员（Admin）

> 你负责平台的整体运营和安全策略。

### 5.1 用户管理

导航到"管理" → "用户"：

- 查看所有用户及其角色
- 修改用户角色（分配/撤销）
- 支持的角色：`consumer`、`author`、`maintainer`、`security_reviewer`、`namespace_admin`、`platform_admin`

### 5.2 命名空间管理

命名空间用于组织隔离，建议按部门创建：

```
company/hr          # 人力资源
company/finance     # 财务
company/it          # IT 部门
company/data        # 数据团队
```

### 5.3 LLM 配置

导航到"管理" → "LLM 设置"：

- 配置 LLM 服务地址（支持 Ollama 兼容格式）
- 配置模型和 API Key
- 用于 LLM Judge 功能（质量评估）

### 5.4 审计日志

导航到"管理" → "审计日志"：

- 查看所有用户操作记录
- 支持按用户、操作类型、时间段过滤
- 用于合规审计和安全排查

### 5.5 全局安全策略

（规划中）配置：
- 哪些 TrustGrade 等级允许安装
- 是否强制人工审核
- 特定命名空间的访问限制

---

## 6. 运行时客户端集成

> 如果你在开发企业 Chatbot、MCP Client 或内部自动化平台，本节说明如何集成 SkillHub。

### 6.1 查询可用技能

```http
GET /api/v1/runtime/skills?min_trust_grade=B
Authorization: Bearer <service-account-token>
```

### 6.2 获取技能安装清单

```http
GET /api/v1/runtime/skills/company/hr/onboarding-assistant/1.2.0/install-manifest
Authorization: Bearer <service-account-token>
```

返回完整的 `skillhub.yaml`，包含权限声明，由客户端决策是否允许执行。

### 6.3 下载技能包

```http
GET /api/v1/runtime/skills/company/hr/onboarding-assistant/1.2.0/download
Authorization: Bearer <service-account-token>
```

返回 ZIP 文件流，包含 `SKILL.md`、脚本、参考文档等。

### 6.4 安全建议

- 使用专属的服务账号 Token（`consumer` 角色即可）
- 验证下载包的 SHA256 hash（与 `artifact_hash` 字段对比）
- 根据 `skillhub.yaml` 中的权限声明，在受控环境中执行技能
- 生产环境禁止安装 TrustGrade 为 D 或 F 的技能
