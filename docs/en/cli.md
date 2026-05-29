# SkillHub CLI Reference

> Complete reference documentation for the `skillhub` command-line tool

---

## Installation

```bash
# Download prebuilt binary
curl -L https://skillhub.company.com/cli/latest/skillhub-linux-amd64 -o /usr/local/bin/skillhub
chmod +x /usr/local/bin/skillhub

# Or build from source
cd cli && go build -o skillhub ./cmd/skillhub
```

---

## Global Options

| Option | Environment Variable | Description |
|--------|---------------------|-------------|
| `--server <URL>` | `SKILLHUB_SERVER` | SkillHub server address |
| `--config <path>` | — | Config file path (default: `~/.skillhub/config.yaml`) |
| `--help` | — | Show help |
| `--version` | — | Show version |

---

## Commands

### `skillhub login`

Authenticate with a SkillHub server and save credentials to the local config file.

```
skillhub login [flags]
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--server <URL>` | Server address (e.g. `https://skillhub.company.com`) |

**Example:**

```
$ skillhub login --server https://skillhub.company.com
Username: zhang.san
Password: ********
Login successful. Token saved to ~/.skillhub/config.yaml
```

---

### `skillhub search`

Search for published skills in SkillHub.

```
skillhub search <query> [flags]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<query>` | Search keyword(s) |

**Flags:**

| Flag | Description |
|------|-------------|
| `--namespace <ns>` | Limit to namespace (e.g. `company/hr`) |
| `--tag <tag>` | Filter by tag |
| `--limit <n>` | Max results (default 20) |

**Examples:**

```bash
skillhub search "onboarding"
skillhub search "expense" --namespace company/finance
skillhub search "data" --tag finance --limit 10
```

**Sample output:**

```
NAME                              DISPLAY NAME           TRUST  NAMESPACE
company/hr/onboarding-assistant   Onboarding Assistant   A      company/hr
company/finance/expense-checker   Expense Checker        B      company/finance
```

---

### `skillhub info`

View detailed information about a skill.

```
skillhub info <skill-id> [flags]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<skill-id>` | Skill ID (format: `namespace/name` or UUID) |

**Examples:**

```bash
skillhub info company/hr/onboarding-assistant
skillhub info 550e8400-e29b-41d4-a716-446655440000
```

**Sample output:**

```
Name:         onboarding-assistant
Namespace:    company/hr
Display Name: Onboarding Assistant
Status:       active
Visibility:   org
Tags:         hr, onboarding, employee
Description:  Guides new employees through the onboarding process.

Versions:
  1.2.0 (published) - Trust Grade: A
  1.1.0 (deprecated)
  1.0.0 (deprecated)
```

---

### `skillhub init`

Initialize a new skill project structure in the current directory.

```
skillhub init <skill-name> [flags]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<skill-name>` | Skill name (lowercase letters and hyphens, e.g. `expense-checker`) |

**Flags:**

| Flag | Description |
|------|-------------|
| `--namespace <ns>` | Namespace for the skill (e.g. `company/hr`) |
| `--type <type>` | Skill type (default: `prompt_only`) |

**Example:**

```bash
skillhub init expense-checker --namespace company/finance
```

**Generated directory structure:**

```
expense-checker/
├── SKILL.md            # Skill description (read by LLM)
├── skillhub.yaml       # Metadata and permission declarations
├── scripts/            # Scripts (optional)
├── references/         # Reference documents (optional)
├── assets/             # Templates and assets (optional)
├── examples/           # Input/output examples (optional)
└── evals/              # Evaluation test cases (optional)
```

**Generated `skillhub.yaml` template:**

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

Validate a local skill project for format and spec compliance.

```
skillhub lint <skill-dir> [flags]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<skill-dir>` | Path to the skill project directory |

**Examples:**

```bash
skillhub lint ./expense-checker
skillhub lint .
```

**Validation checks:**

- `skillhub.yaml` exists and is valid
- `SKILL.md` exists and is non-empty
- Version string is valid semver
- Skill type is a valid enum value
- For non-`prompt_only` types, required subdirectories (`scripts/`, `references/`) exist
- No binary files (`.exe`, `.so`, `.dylib`, etc.)

**Sample output (pass):**

```
✓ skillhub.yaml valid
✓ SKILL.md found and non-empty
✓ version: 1.0.0 (semver valid)
✓ type: prompt_with_references
✓ references/ directory found
✓ no binary files detected

All checks passed.
```

**Sample output (fail):**

```
✗ skillhub.yaml: missing required field 'spec.permissions'
✓ SKILL.md found and non-empty
✗ version: "v1.0" is not valid semver (expected e.g. "1.0.0")

2 error(s) found.
```

---

### `skillhub submit`

Submit a local skill project to SkillHub, triggering the automated scan and review pipeline.

```
skillhub submit <skill-dir> [flags]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<skill-dir>` | Path to the skill project directory |

**Flags:**

| Flag | Description |
|------|-------------|
| `--version <ver>` | Version to submit (required, e.g. `1.0.0`) |
| `--message <msg>` | Version release notes (optional) |

**Examples:**

```bash
skillhub submit . --version 1.0.0 --message "Initial release"
skillhub submit ./expense-checker --version 1.2.0 --message "Fix amount calculation"
```

**Submission flow:**

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

Check the scan and review status of a skill version.

```
skillhub status <version-id>
```

**Sample output:**

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

## Typical Workflow

```bash
# 1. Log in
skillhub login --server https://skillhub.company.com

# 2. Search to avoid duplicates
skillhub search "expense"

# 3. Initialize a new skill project
skillhub init expense-checker --namespace company/finance

# 4. Edit SKILL.md and skillhub.yaml
# ...

# 5. Validate locally
skillhub lint ./expense-checker

# 6. Submit
skillhub submit ./expense-checker --version 1.0.0

# 7. Track status
skillhub status <version-id>
```
