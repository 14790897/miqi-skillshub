# SkillHub CLI 使用手册

> `skillhub` 命令行工具完整参考文档

---

## 安装

```bash
# 下载预编译二进制
curl -L https://skillhub.company.com/cli/latest/skillhub-linux-amd64 -o /usr/local/bin/skillhub
chmod +x /usr/local/bin/skillhub

# 或者从源码编译
cd cli && go build -o skillhub ./cmd/skillhub
```

---

## 全局选项

| 选项 | 环境变量 | 说明 |
|------|---------|------|
| `--server <URL>` | `SKILLHUB_SERVER` | SkillHub 服务器地址 |
| `--config <path>` | — | 配置文件路径（默认 `~/.skillhub/config.yaml`）|
| `--help` | — | 显示帮助 |
| `--version` | — | 显示版本 |

---

## 命令

### `skillhub login`

登录到 SkillHub 服务器，保存认证凭据到本地配置文件。

```
skillhub login [flags]
```

**选项：**

| 选项 | 说明 |
|------|------|
| `--server <URL>` | 服务器地址（例如 `https://skillhub.company.com`）|

**交互流程：**

```
$ skillhub login --server https://skillhub.company.com
Username: zhang.san
Password: ********
Login successful. Token saved to ~/.skillhub/config.yaml
```

---

### `skillhub search`

搜索 SkillHub 中已发布的技能。

```
skillhub search <query> [flags]
```

**参数：**

| 参数 | 说明 |
|------|------|
| `<query>` | 搜索关键词 |

**选项：**

| 选项 | 说明 |
|------|------|
| `--namespace <ns>` | 限定命名空间（例如 `company/hr`）|
| `--tag <tag>` | 按标签过滤 |
| `--limit <n>` | 返回结果数量（默认 20）|

**示例：**

```bash
skillhub search "报销"
skillhub search "onboarding" --namespace company/hr
skillhub search "data" --tag finance --limit 10
```

**输出示例：**

```
NAME                              DISPLAY NAME        TRUST  NAMESPACE
company/hr/onboarding-assistant   员工入职助手         A      company/hr
company/finance/expense-checker   报销合规检查器        B      company/finance
```

---

### `skillhub info`

查看技能的详细信息。

```
skillhub info <skill-id> [flags]
```

**参数：**

| 参数 | 说明 |
|------|------|
| `<skill-id>` | 技能 ID（格式：`namespace/name` 或 UUID）|

**示例：**

```bash
skillhub info company/hr/onboarding-assistant
skillhub info 550e8400-e29b-41d4-a716-446655440000
```

**输出示例：**

```
Name:         onboarding-assistant
Namespace:    company/hr
Display Name: 员工入职助手
Status:       active
Visibility:   org
Tags:         hr, onboarding, employee
Description:  协助新员工完成入职流程，包括文件准备、系统权限申请等

Versions:
  1.2.0 (published) - Trust Grade: A
  1.1.0 (deprecated)
  1.0.0 (deprecated)
```

---

### `skillhub init`

在当前目录下初始化一个新的技能项目结构。

```
skillhub init <skill-name> [flags]
```

**参数：**

| 参数 | 说明 |
|------|------|
| `<skill-name>` | 技能名称（小写英文、连字符，例如 `expense-checker`）|

**选项：**

| 选项 | 说明 |
|------|------|
| `--namespace <ns>` | 技能所属命名空间（例如 `company/hr`）|
| `--type <type>` | 技能类型（默认 `prompt_only`）|

**示例：**

```bash
skillhub init expense-checker --namespace company/finance
```

**生成的目录结构：**

```
expense-checker/
├── SKILL.md            # 技能说明（供 LLM 读取）
├── skillhub.yaml       # 元数据和权限声明
├── scripts/            # 脚本（可选）
├── references/         # 参考文档（可选）
├── assets/             # 模板和资源（可选）
├── examples/           # 输入/输出示例（可选）
└── evals/              # 评估用例（可选）
```

**生成的 `skillhub.yaml` 模板：**

```yaml
apiVersion: skillhub.company/v1
kind: Skill
metadata:
  name: expense-checker
  namespace: company/finance
  displayName: expense-checker
  description: TODO
  owner: ""
  tags: []
spec:
  version: 0.1.0
  type: prompt_only
  permissions:
    filesystem:
      read: none
      write: none
    network: deny
    enterpriseApis: []
  compatibleClients:
    - copilot
    - cursor
    - claude-desktop
  dataClassification: internal
```

---

### `skillhub lint`

对本地技能项目进行格式和规范校验。

```
skillhub lint <skill-dir> [flags]
```

**参数：**

| 参数 | 说明 |
|------|------|
| `<skill-dir>` | 技能项目目录路径 |

**示例：**

```bash
skillhub lint ./expense-checker
skillhub lint .
```

**校验项：**

- `skillhub.yaml` 存在且格式合法
- `SKILL.md` 存在且不为空
- 版本号符合语义化版本格式（semver）
- 技能类型为合法枚举值
- 如果类型不是 `prompt_only`，对应子目录（`scripts/`、`references/`）必须存在
- 无二进制文件（`.exe`、`.so`、`.dylib` 等）

**输出示例（通过）：**

```
✓ skillhub.yaml valid
✓ SKILL.md found and non-empty
✓ version: 1.0.0 (semver valid)
✓ type: prompt_with_references
✓ references/ directory found
✓ no binary files detected

All checks passed.
```

**输出示例（失败）：**

```
✗ skillhub.yaml: missing required field 'spec.permissions'
✓ SKILL.md found and non-empty
✗ version: "v1.0" is not valid semver (expected e.g. "1.0.0")

2 error(s) found.
```

---

### `skillhub submit`

将本地技能项目提交到 SkillHub 平台，触发自动扫描和审核流程。

```
skillhub submit <skill-dir> [flags]
```

**参数：**

| 参数 | 说明 |
|------|------|
| `<skill-dir>` | 技能项目目录路径 |

**选项：**

| 选项 | 说明 |
|------|------|
| `--version <ver>` | 提交版本号（必填，例如 `1.0.0`）|
| `--message <msg>` | 版本说明（可选）|

**示例：**

```bash
skillhub submit . --version 1.0.0 --message "初始版本"
skillhub submit ./expense-checker --version 1.2.0 --message "修复金额计算逻辑"
```

**提交流程：**

```
$ skillhub submit . --version 1.0.0

Running pre-submit lint...
✓ All lint checks passed

Packing skill artifacts...
✓ Packaged 5 files (42.3 KB)

Uploading to https://skillhub.company.com...
✓ Uploaded. Artifact ID: art_abc123

Creating version 1.0.0...
✓ Version created. ID: ver_xyz789

Scan queued. Check status with:
  skillhub status ver_xyz789
```

---

### `skillhub status`

查看技能版本的扫描和审核状态。

```
skillhub status <version-id>
```

**输出示例：**

```
Version:   1.0.0
Status:    candidate
Scan:      completed
  - Manifest Validator:  PASS
  - Secret Scanner:      PASS
  - Static Scanner:      PASS
  - LLM Judge:           PASS (Trust Grade: A)

Review:    pending
  Submitted for review 2 hours ago.
  Pending assignment to security reviewer.
```

---

## 典型工作流

```bash
# 1. 登录
skillhub login --server https://skillhub.company.com

# 2. 搜索现有技能，避免重复创建
skillhub search "报销"

# 3. 初始化新技能项目
skillhub init expense-checker --namespace company/finance

# 4. 编辑 SKILL.md 和 skillhub.yaml
# ...

# 5. 本地校验
skillhub lint ./expense-checker

# 6. 提交
skillhub submit ./expense-checker --version 1.0.0

# 7. 跟踪状态
skillhub status <version-id>
```
