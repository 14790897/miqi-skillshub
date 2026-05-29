# API Reference

> MiQi SkillHub REST API v1

**Base URL**: `https://skillhub.company.com/api/v1`

For the full interactive spec, see [../api/openapi.yaml](../api/openapi.yaml) — importable into Swagger UI or Apifox.

---

## Authentication

All endpoints except `/auth/register`, `/auth/login`, and `/health` require a JWT in the request header:

```http
Authorization: Bearer <token>
```

Tokens are obtained via the login endpoint. Default expiry: 24 hours.

---

## Role Permission Matrix

| Scope | consumer | author | maintainer | security_reviewer | platform_admin |
|-------|:--------:|:------:|:----------:|:-----------------:|:--------------:|
| Search/browse skills | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create skills/versions | | ✓ | ✓ | | ✓ |
| Upload artifacts | | ✓ | ✓ | | ✓ |
| Publish/deprecate/block | | | ✓ | | ✓ |
| Human review | | | | ✓ | ✓ |
| Manage namespaces/teams | | | | | ✓ / namespace_admin |
| View audit logs | | | | | ✓ |
| Modify user roles | | | | | ✓ |
| LLM config | | | | | ✓ |

---

## Endpoint Quick Reference

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login, returns JWT |
| `GET` | `/health` | Service health check |

### Profile

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/profile` | Get current user info |
| `PATCH` | `/profile` | Update profile |
| `POST` | `/profile/change-password` | Change password |

### Skills

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/skills` | any | List skills (filter/paginate) |
| `POST` | `/skills` | author | Create skill |
| `GET` | `/skills/:id` | any | Get skill detail |
| `PATCH` | `/skills/:id` | author | Update skill |
| `DELETE` | `/skills/:id` | author | Delete skill |
| `GET` | `/skills/:id/versions` | any | List versions |
| `POST` | `/skills/:id/versions` | author | Create version |

### Versions

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/versions/:vid` | any | Get version detail |
| `POST` | `/versions/:vid/submit` | author | Submit for auto-scan |
| `POST` | `/versions/:vid/llm-scan` | author | Trigger LLM evaluation |
| `POST` | `/versions/:vid/submit-review` | author | Submit for human review |
| `POST` | `/versions/:vid/publish` | maintainer | Publish version |
| `POST` | `/versions/:vid/deprecate` | maintainer | Deprecate version |
| `POST` | `/versions/:vid/block` | maintainer | Block version |
| `POST` | `/versions/:vid/scan` | any | Trigger security scan |
| `GET` | `/versions/:vid/scan-reports` | any | List scan reports |

### Scan Reports

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/scan-reports/:rid` | Get scan report detail |

### Reviews

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/reviews/pending` | security_reviewer | List pending reviews |
| `POST` | `/reviews/:id/approve` | security_reviewer | Approve |
| `POST` | `/reviews/:id/request-changes` | security_reviewer | Request changes |
| `POST` | `/reviews/:id/reject` | security_reviewer | Reject |

### Namespaces

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/namespaces` | any | List namespaces |
| `POST` | `/namespaces` | namespace_admin | Create namespace |
| `GET` | `/namespaces/:id` | any | Get namespace detail |

### Search

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/search/skills?q=<keyword>` | Full-text skill search |

**Query params**: `q` (keyword), `namespace`, `tags` (comma-separated), `trust_grade`, `page`, `page_size`

### Runtime (Agent Client API)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/runtime/skills` | List available skills |
| `GET` | `/runtime/skills/:ns/:name/:version/install-manifest` | Get install manifest |
| `GET` | `/runtime/skills/:ns/:name/:version/download` | Download skill package |

### Teams

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/teams` | any | List teams |
| `POST` | `/teams` | platform_admin | Create team |
| `GET` | `/teams/:id` | any | Get team detail |
| `PATCH` | `/teams/:id` | platform_admin | Update team |
| `DELETE` | `/teams/:id` | platform_admin | Delete team |
| `GET` | `/teams/:id/members` | any | List members |
| `POST` | `/teams/:id/members` | platform_admin | Add member |
| `DELETE` | `/teams/:id/members/:userId` | platform_admin | Remove member |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/audit` | Query audit logs |
| `GET` | `/admin/users` | List all users |
| `PATCH` | `/admin/users/:id` | Update user roles |
| `GET` | `/admin/llm-config` | Get LLM config |
| `PUT` | `/admin/llm-config` | Update LLM config |

---

## Full Publish Workflow Example

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"author@company.com","password":"password"}' \
  | jq -r '.token')

# 2. Upload artifact
UPLOAD=$(curl -s -X POST http://localhost:8080/api/v1/artifacts/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F 'file=@./my-skill.zip')
ARTIFACT_PATH=$(echo $UPLOAD | jq -r '.path')
ARTIFACT_HASH=$(echo $UPLOAD | jq -r '.hash')

# 3. Create version
VERSION_ID=$(curl -s -X POST http://localhost:8080/api/v1/skills/$SKILL_ID/versions \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"version\":\"1.0.0\",\"artifact_path\":\"$ARTIFACT_PATH\",\"artifact_hash\":\"$ARTIFACT_HASH\"}" \
  | jq -r '.id')

# 4. Submit for scanning
curl -X POST http://localhost:8080/api/v1/versions/$VERSION_ID/submit \
  -H "Authorization: Bearer $TOKEN"

# 5. Submit for human review (after scan passes)
curl -X POST http://localhost:8080/api/v1/versions/$VERSION_ID/submit-review \
  -H "Authorization: Bearer $TOKEN"

# 6. Publish (maintainer action)
curl -X POST http://localhost:8080/api/v1/versions/$VERSION_ID/publish \
  -H "Authorization: Bearer $MAINTAINER_TOKEN"
```

---

## Error Response Format

All errors return:

```json
{
  "error": "Description of the error"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Bad request (invalid params) |
| `401` | Unauthenticated (missing or invalid token) |
| `403` | Forbidden (insufficient role) |
| `404` | Resource not found |
| `409` | Conflict (e.g. email already registered) |
| `500` | Internal server error |
