# API 参考文档

> MiQi SkillHub REST API v1

**Base URL**: `https://skillhub.company.com/api/v1`

完整 OpenAPI 规范请见 [../api/openapi.yaml](../api/openapi.yaml)，可直接导入 Swagger UI 或 Apifox 查看交互式文档。

---

## 认证

除 `/auth/register`、`/auth/login`、`/health` 外，所有接口需在请求头中携带 JWT：

```http
Authorization: Bearer <token>
```

Token 通过登录接口获得，默认有效期 24 小时。

---

## 角色权限矩阵

| 接口范围 | consumer | author | maintainer | security_reviewer | platform_admin |
|---------|:--------:|:------:|:----------:|:-----------------:|:--------------:|
| 搜索/浏览技能 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 创建技能/版本 | | ✓ | ✓ | | ✓ |
| 上传制品 | | ✓ | ✓ | | ✓ |
| 发布/废弃/阻断版本 | | | ✓ | | ✓ |
| 人工审核 | | | | ✓ | ✓ |
| 管理命名空间/团队 | | | | | ✓ / namespace_admin |
| 查看审计日志 | | | | | ✓ |
| 修改用户角色 | | | | | ✓ |
| LLM 配置管理 | | | | | ✓ |

---

## 接口速查表

### 认证（Auth）

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/auth/register` | 注册新用户 |
| `POST` | `/auth/login` | 用户登录，返回 JWT |
| `GET` | `/health` | 服务健康检查 |

### 个人信息（Profile）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/profile` | 获取当前用户信息 |
| `PATCH` | `/profile` | 更新个人信息 |
| `POST` | `/profile/change-password` | 修改密码 |

### 技能（Skills）

| 方法 | 路径 | 所需角色 | 说明 |
|------|------|---------|------|
| `GET` | `/skills` | 任意 | 列出技能（支持过滤/分页）|
| `POST` | `/skills` | author | 创建技能 |
| `GET` | `/skills/:id` | 任意 | 获取技能详情 |
| `PATCH` | `/skills/:id` | author | 更新技能信息 |
| `DELETE` | `/skills/:id` | author | 删除技能 |
| `GET` | `/skills/:id/versions` | 任意 | 列出技能的所有版本 |
| `POST` | `/skills/:id/versions` | author | 创建版本 |

### 版本（Versions）

| 方法 | 路径 | 所需角色 | 说明 |
|------|------|---------|------|
| `GET` | `/versions/:vid` | 任意 | 获取版本详情 |
| `POST` | `/versions/:vid/submit` | author | 提交版本，触发自动扫描 |
| `POST` | `/versions/:vid/llm-scan` | author | 手动触发 LLM 评估 |
| `POST` | `/versions/:vid/submit-review` | author | 提交人工审核 |
| `POST` | `/versions/:vid/publish` | maintainer | 发布版本 |
| `POST` | `/versions/:vid/deprecate` | maintainer | 废弃版本 |
| `POST` | `/versions/:vid/block` | maintainer | 阻断版本 |
| `POST` | `/versions/:vid/scan` | 任意 | 触发安全扫描 |
| `GET` | `/versions/:vid/scan-reports` | 任意 | 列出扫描报告 |

### 扫描报告（Scan Reports）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/scan-reports/:rid` | 获取扫描报告详情 |

### 审核（Reviews）

| 方法 | 路径 | 所需角色 | 说明 |
|------|------|---------|------|
| `GET` | `/reviews/pending` | security_reviewer | 列出待审核版本 |
| `POST` | `/reviews/:id/approve` | security_reviewer | 批准 |
| `POST` | `/reviews/:id/request-changes` | security_reviewer | 请求修改 |
| `POST` | `/reviews/:id/reject` | security_reviewer | 拒绝 |

### 命名空间（Namespaces）

| 方法 | 路径 | 所需角色 | 说明 |
|------|------|---------|------|
| `GET` | `/namespaces` | 任意 | 列出命名空间 |
| `POST` | `/namespaces` | namespace_admin | 创建命名空间 |
| `GET` | `/namespaces/:id` | 任意 | 获取命名空间详情 |

### 搜索（Search）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/search/skills?q=<keyword>` | 全文搜索技能 |

**支持的查询参数**：`q`（关键词）、`namespace`、`tags`（逗号分隔）、`trust_grade`、`page`、`page_size`

### 运行时（Runtime）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/runtime/skills` | 列出可用技能（Agent 客户端专用）|
| `GET` | `/runtime/skills/:ns/:name/:version/install-manifest` | 获取安装清单 |
| `GET` | `/runtime/skills/:ns/:name/:version/download` | 下载技能包 |

### 团队（Teams）

| 方法 | 路径 | 所需角色 | 说明 |
|------|------|---------|------|
| `GET` | `/teams` | 任意 | 列出团队 |
| `POST` | `/teams` | platform_admin | 创建团队 |
| `GET` | `/teams/:id` | 任意 | 获取团队详情 |
| `PATCH` | `/teams/:id` | platform_admin | 更新团队 |
| `DELETE` | `/teams/:id` | platform_admin | 删除团队 |
| `GET` | `/teams/:id/members` | 任意 | 列出成员 |
| `POST` | `/teams/:id/members` | platform_admin | 添加成员 |
| `DELETE` | `/teams/:id/members/:userId` | platform_admin | 移除成员 |

### 管理（Admin）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/admin/audit` | 查询审计日志 |
| `GET` | `/admin/users` | 列出所有用户 |
| `PATCH` | `/admin/users/:id` | 更新用户角色 |
| `GET` | `/admin/llm-config` | 获取 LLM 配置 |
| `PUT` | `/admin/llm-config` | 更新 LLM 配置 |

---

## 示例：发布一个技能版本的完整流程

```bash
# 1. 登录
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"author@company.com","password":"password"}' \
  | jq -r '.token')

# 2. 上传制品包
UPLOAD=$(curl -s -X POST http://localhost:8080/api/v1/artifacts/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F 'file=@./my-skill.zip')
ARTIFACT_PATH=$(echo $UPLOAD | jq -r '.path')
ARTIFACT_HASH=$(echo $UPLOAD | jq -r '.hash')

# 3. 创建版本
VERSION_ID=$(curl -s -X POST http://localhost:8080/api/v1/skills/$SKILL_ID/versions \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"version\":\"1.0.0\",\"artifact_path\":\"$ARTIFACT_PATH\",\"artifact_hash\":\"$ARTIFACT_HASH\"}" \
  | jq -r '.id')

# 4. 提交扫描
curl -X POST http://localhost:8080/api/v1/versions/$VERSION_ID/submit \
  -H "Authorization: Bearer $TOKEN"

# 5. 提交人工审核（扫描通过后）
curl -X POST http://localhost:8080/api/v1/versions/$VERSION_ID/submit-review \
  -H "Authorization: Bearer $TOKEN"

# 6. 发布（维护者操作）
curl -X POST http://localhost:8080/api/v1/versions/$VERSION_ID/publish \
  -H "Authorization: Bearer $MAINTAINER_TOKEN"
```

---

## 错误响应格式

所有错误响应统一返回：

```json
{
  "error": "错误描述信息"
}
```

| HTTP 状态码 | 含义 |
|------------|------|
| `400` | 请求参数错误 |
| `401` | 未认证（缺少或无效 Token）|
| `403` | 无权限（角色不足）|
| `404` | 资源不存在 |
| `409` | 冲突（如邮箱已注册）|
| `500` | 服务器内部错误 |
