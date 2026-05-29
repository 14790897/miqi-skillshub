# User Guide

> MiQi SkillHub — Usage guide for all roles

---

## Table of Contents

1. [Consumer](#1-consumer)
2. [Skill Author](#2-skill-author)
3. [Skill Maintainer](#3-skill-maintainer)
4. [Security Reviewer](#4-security-reviewer)
5. [Platform Admin](#5-platform-admin)
6. [Runtime Client Integration](#6-runtime-client-integration)

---

## 1. Consumer

> For HR, finance, operations, and other business users who want to find and use AI skills.

### 1.1 Search for Skills

1. Open the SkillHub platform home page
2. Type a keyword in the search box (e.g. "reimbursement", "onboarding", "data cleaning")
3. Filter by namespace, tags, or trust grade
4. Click a skill card to view details

### 1.2 Understanding Skill Details

| Field | Description |
|-------|-------------|
| **Trust Grade** | A (highest) — F (blocked). Recommend only installing A or B grade skills |
| **Skill Type** | prompt_only / prompt_with_scripts / etc. |
| **Permissions** | Whether the skill needs filesystem, network, or enterprise API access |
| **Use Cases** | Description of applicable work scenarios |
| **Compatible Clients** | Which AI tools support this skill |
| **Version History** | Status and release notes for each version |

### 1.3 Installing Skills

**Via CLI:**
```bash
skillhub install company/hr/onboarding-assistant@1.2.0
```

**Via Copy Install Command:**
Click "Copy Install Command" on the skill detail page, then paste it into your AI client configuration.

**Via Runtime API (automatic enterprise platform integration):**
Your enterprise Chatbot or Agent platform will automatically fetch available skills through the Runtime API.

---

## 2. Skill Author

> For business experts, engineers, or AI Champions who create and maintain skills.

### 2.1 Setup

Install SkillHub CLI, then log in:
```bash
skillhub login --server https://skillhub.company.com
```

### 2.2 Initialize a Skill Project

```bash
skillhub init my-skill-name
```

Generated structure:
```
my-skill-name/
├── SKILL.md          # Core skill description (read by LLM)
├── skillhub.yaml     # Metadata and permission declarations
├── scripts/          # Scripts (optional)
├── references/       # Reference documents (optional)
├── assets/           # Templates and assets (optional)
├── examples/         # Input/output examples (optional)
└── evals/            # Evaluation cases (optional)
```

### 2.3 Write SKILL.md

```markdown
---
name: reimbursement-checker
description: Enterprise expense report compliance checker
---

# Expense Report Compliance Check

## Use Cases
Check expense submissions for policy compliance before filing.

## Input
Expense line items (category, amount, date, invoice type)

## Output
Compliance report highlighting non-compliant items with reasons and suggestions.

## Steps
1. Check if amounts exceed category limits
2. Validate invoice types
3. Check reimbursement deadlines (typically 90 days)
4. Generate compliance report
```

### 2.4 Validate Locally

```bash
skillhub lint ./my-skill-name
```

### 2.5 Submit Skill

```bash
skillhub submit ./my-skill-name --version 1.0.0
```

### 2.6 Check Status

```bash
skillhub status <version-id>
```

---

## 3. Skill Maintainer

> Responsible for the full lifecycle of skills — publishing, deprecating, and blocking.

### 3.1 Publish a Version

Only `approved` versions can be published:
- Web: Go to version detail → click "Publish"
- API: `POST /api/v1/versions/:vid/publish`

### 3.2 Version Status Actions

| Action | When to Use |
|--------|-------------|
| **Publish** | Review approved, ready for enterprise use |
| **Deprecate** | Newer version available, old one not recommended |
| **Block** | Security issue found, immediately prohibit installation |

---

## 4. Security Reviewer

> Responsible for human review of skill versions to ensure safety and compliance.

### 4.1 Review Queue

Navigate to "Reviews" → "Pending" in the web UI.

### 4.2 Review Checklist

1. **Automated scan reports**
   - Manifest validation: skillhub.yaml schema compliance
   - Secret scanner: no hardcoded credentials
   - Static scanner: no dangerous code patterns in scripts
   - LLM judge: no prompt injection or intent risks

2. **SKILL.md review**
   - Clear and accurate description
   - No unauthorized system prompt escalation

3. **Permission declarations**
   - Requested permissions match actual functionality
   - Data classifications are appropriate

4. **Decision**

| Decision | Meaning |
|----------|---------|
| **Approve** | Skill is safe and compliant |
| **Request Changes** | Specific items need to be fixed before re-review |
| **Reject** | Critical security issues, cannot be published |

---

## 5. Platform Admin

> Responsible for platform operations, user management, and security policy.

### 5.1 User Management

Navigate to "Admin" → "Users":
- View all users and their roles
- Assign/revoke roles

Available roles: `consumer`, `author`, `maintainer`, `security_reviewer`, `namespace_admin`, `platform_admin`

### 5.2 Namespace Management

Recommended namespace structure by department:
```
company/hr          # Human Resources
company/finance     # Finance
company/it          # IT
company/data        # Data team
```

### 5.3 LLM Configuration

Navigate to "Admin" → "LLM Settings":
- Configure LLM service endpoint (Ollama-compatible format)
- Set model name and API key
- Used for LLM Judge quality evaluation

### 5.4 Audit Logs

Navigate to "Admin" → "Audit Logs":
- View all user action records
- Filter by user, action type, time range
- Used for compliance audit and security investigation

---

## 6. Runtime Client Integration

> For developers building enterprise Chatbots, MCP Clients, or internal automation platforms.

### 6.1 List Available Skills

```http
GET /api/v1/runtime/skills?min_trust_grade=B
Authorization: Bearer <service-account-token>
```

### 6.2 Get Install Manifest

```http
GET /api/v1/runtime/skills/company/hr/onboarding-assistant/1.2.0/install-manifest
Authorization: Bearer <service-account-token>
```

Returns full `skillhub.yaml` with permission declarations. The client uses this to decide whether execution is allowed.

### 6.3 Download Skill Package

```http
GET /api/v1/runtime/skills/company/hr/onboarding-assistant/1.2.0/download
Authorization: Bearer <service-account-token>
```

Returns a ZIP stream containing `SKILL.md`, scripts, references, etc.

### 6.4 Security Recommendations

- Use a dedicated service account token (`consumer` role is sufficient)
- Verify the downloaded package SHA256 hash against the `artifact_hash` field
- Execute skills in a controlled environment respecting `skillhub.yaml` permissions
- Do not install skills with Trust Grade D or F in production
