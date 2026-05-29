from celery_app import app


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def run_secret_scan(self, artifact_path: str, version_id: str):
    """Run Gitleaks secret detection on the skill artifact."""
    import json
    import subprocess

    result = {
        "scanner": "gitleaks",
        "status": "passed",
        "risk_level": "info",
        "findings": [],
    }

    try:
        proc = subprocess.run(
            ["gitleaks", "detect", "--source", artifact_path, "--no-git", "--format", "json"],
            capture_output=True, text=True, timeout=120,
        )
        if proc.returncode == 1:
            findings = json.loads(proc.stdout) if proc.stdout.strip() else []
            for f in findings:
                result["findings"].append({
                    "file": f.get("File", ""),
                    "line": f.get("StartLine", 0),
                    "rule": f.get("RuleID", ""),
                    "severity": "high",
                    "message": f.get("Description", f"Secret detected: {f.get('RuleID', '')}"),
                    "evidence": f.get("Secret", ""),
                })

            if result["findings"]:
                result["status"] = "failed"
                result["risk_level"] = "critical"

    except subprocess.TimeoutExpired:
        result["status"] = "error"
        result["risk_level"] = "high"
        result["findings"].append({"message": "Secret scan timed out", "severity": "high"})
    except FileNotFoundError:
        result["status"] = "error"
        result["risk_level"] = "info"
        result["findings"].append({"message": "gitleaks not installed, skipping", "severity": "info"})

    return result
