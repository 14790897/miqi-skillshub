"""Static rule scanner using Semgrep for code risk detection."""

from celery_app import app


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def run_static_scan(self, artifact_path: str, version_id: str):
    """Run Semgrep static analysis on the skill artifact."""
    import json
    import subprocess

    rules = [
        "-e", "$X = base64.b64decode(...)",   # base64 decode
        "-e", "eval(...)",                    # eval
        "-e", "exec(...)",                    # exec
        "-e", "os.system(...)",               # shell execution
        "-e", "subprocess.call(...)",         # subprocess
        "-e", "pickle.loads(...)",           # pickle deserialization
        "-e", "requests.post(...)",          # network outbound
        "-e", "shutil.rmtree(...)",          # destructive fs
        "-e", "os.remove(...)",              # file deletion
        "-e", "socket.gethostbyname(...)",    # DNS lookup
    ]

    result = {
        "scanner": "semgrep",
        "status": "passed",
        "risk_level": "info",
        "findings": [],
    }

    try:
        cmd = ["semgrep", "--json", "--lang=python", "--lang=javascript", "--lang=bash"] + rules + [artifact_path]
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=180,
        )
        if proc.returncode != 0 and proc.stdout.strip():
            findings = json.loads(proc.stdout).get("results", [])
            for f in findings:
                result["findings"].append({
                    "file": f.get("path", ""),
                    "line": f.get("start", {}).get("line", 0),
                    "rule": f.get("check_id", ""),
                    "severity": "medium",
                    "message": f.get("extra", {}).get("message", "Suspicious code pattern detected"),
                    "evidence": f.get("extra", {}).get("lines", ""),
                })

            if result["findings"]:
                result["status"] = "failed"
                risk_scores = {
                    ("os.remove", "shutil.rmtree"): "critical",
                    ("eval", "exec", "pickle"): "high",
                    ("requests.post", "base64.b64decode"): "medium",
                }
                max_risk = "medium"
                for finding in result["findings"]:
                    for patterns, level in risk_scores.items():
                        if any(p in finding["rule"].lower() for p in patterns):
                            if level == "critical":
                                max_risk = "critical"
                            elif level == "high" and max_risk != "critical":
                                max_risk = "high"
                result["risk_level"] = max_risk

    except subprocess.TimeoutExpired:
        result["status"] = "error"
        result["risk_level"] = "high"
        result["findings"].append({"message": "Static scan timed out", "severity": "high"})
    except FileNotFoundError:
        result["status"] = "error"
        result["risk_level"] = "info"
        result["findings"].append({"message": "semgrep not installed, skipping", "severity": "info"})

    return result
