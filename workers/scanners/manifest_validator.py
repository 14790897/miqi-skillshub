"""Manifest validator for skillhub.yaml validation."""

from celery_app import app


@app.task(bind=True)
def validate_manifest(self, manifest: dict, version_id: str):
    """Validate skillhub.yaml manifest against the schema."""
    REQUIRED_METADATA = ["name", "namespace", "displayName", "description", "owner"]
    REQUIRED_SPEC = ["version", "type", "permissions", "dataPolicy"]
    VALID_TYPES = {
        "prompt_only", "prompt_with_references", "prompt_with_scripts",
        "workflow_skill", "mcp_adapter_skill",
    }
    VALID_PERMISSIONS = {"read", "write", "none"}

    result = {
        "scanner": "manifest-validator",
        "status": "passed",
        "risk_level": "info",
        "findings": [],
    }

    def add_finding(severity: str, message: str):
        result["findings"].append({"severity": severity, "message": message})
        if severity == "critical" or severity == "high":
            result["status"] = "failed"

    # Check apiVersion and kind
    if manifest.get("apiVersion") != "skillhub.company/v1":
        add_finding("high", "Missing or invalid apiVersion, expected 'skillhub.company/v1'")
    if manifest.get("kind") != "Skill":
        add_finding("high", "kind must be 'Skill'")

    metadata = manifest.get("metadata", {})
    for field in REQUIRED_METADATA:
        if not metadata.get(field):
            add_finding("critical", f"Missing required metadata field: {field}")

    spec = manifest.get("spec", {})
    for field in REQUIRED_SPEC:
        if field not in spec:
            add_finding("critical", f"Missing required spec field: {field}")

    skill_type = spec.get("type", "")
    if skill_type and skill_type not in VALID_TYPES:
        add_finding("high", f"Invalid skill type '{skill_type}'. Must be one of: {', '.join(sorted(VALID_TYPES))}")

    permissions = spec.get("permissions", {})
    filesystem = permissions.get("filesystem", {})
    for perm_key in ("read", "write"):
        val = filesystem.get(perm_key)
        if val and val not in VALID_PERMISSIONS:
            add_finding("medium", f"Invalid filesystem permission '{perm_key}: {val}'")

    network = permissions.get("network", "")
    if network and network not in ("allow", "deny", "limited"):
        add_finding("low", f"Unusual network permission value: {network}")

    data_policy = spec.get("dataPolicy", {})
    prohibited = data_policy.get("prohibitedDataClasses", [])
    if "trade_secret" in prohibited and "regulated_personal_data" in prohibited:
        add_finding("low", "Skill properly marks sensitive data classes as prohibited")

    version = spec.get("version", "")
    import re
    if version and not re.match(r"^\d+\.\d+\.\d+$", version):
        add_finding("high", f"Version '{version}' does not follow SemVer (MAJOR.MINOR.PATCH)")

    # Security section
    security = manifest.get("security", {})
    if not security.get("policyProfile"):
        add_finding("low", "No policyProfile specified, default-enterprise will be used")

    return result
