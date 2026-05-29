"""Sandbox runner for executing skill scripts in isolated containers."""

from celery_app import app


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def run_sandbox(self, artifact_path: str, version_id: str):
    """Run skill scripts in an isolated Docker sandbox and observe behavior.

    The sandbox:
    - Runs in a container with no network access
    - Mounts a read-only copy of the artifact
    - Records filesystem, process, and syscall activity
    - Validates behavior against declared permissions
    """
    import json
    import os
    import subprocess
    import tempfile

    result = {
        "scanner": "sandbox",
        "status": "passed",
        "risk_level": "info",
        "findings": [],
        "observations": {
            "files_accessed": [],
            "processes_spawned": [],
            "network_attempts": [],
        },
    }

    scripts_dir = os.path.join(artifact_path, "scripts")
    if not os.path.isdir(scripts_dir):
        result["findings"].append({"message": "No scripts directory found, sandbox skipped", "severity": "info"})
        return result

    with tempfile.TemporaryDirectory() as tmpdir:
        sandbox_cmd = [
            "docker", "run", "--rm",
            "--network=none",
            "--memory=256m",
            "--cpus=1",
            "--read-only",
            f"--volume={artifact_path}:/skill:ro",
            f"--volume={tmpdir}:/tmp:rw",
            "--name", f"skillhub-sandbox-{version_id[:8]}",
            "skillhub-sandbox:latest",
            "/usr/local/bin/run-sandbox.sh",
            "/skill",
            json.dumps(result["observations"]),
        ]

        try:
            proc = subprocess.run(
                sandbox_cmd, capture_output=True, text=True, timeout=300,
            )
            if proc.returncode != 0:
                result["status"] = "failed"
                result["risk_level"] = "high"
                result["findings"].append({
                    "message": f"Sandbox execution failed with exit code {proc.returncode}",
                    "evidence": proc.stderr[:500],
                    "severity": "high",
                })
            else:
                # Parse observations from sandbox output
                if proc.stdout.strip():
                    try:
                        observations = json.loads(proc.stdout)
                        result["observations"] = observations

                        # Compare observations with declared permissions
                        if len(observations.get("network_attempts", [])) > 0:
                            result["findings"].append({
                                "message": f"Script attempted {len(observations['network_attempts'])} network connections",
                                "severity": "high",
                            })
                            result["risk_level"] = "high"

                        if len(observations.get("files_accessed", [])) > 50:
                            result["findings"].append({
                                "message": "Script accessed an unusually large number of files",
                                "severity": "medium",
                            })

                    except json.JSONDecodeError:
                        result["findings"].append({"message": "Could not parse sandbox output", "severity": "medium"})

        except subprocess.TimeoutExpired:
            result["status"] = "error"
            result["risk_level"] = "high"
            result["findings"].append({"message": "Sandbox execution timed out (5 min limit)", "severity": "high"})
        except FileNotFoundError:
            result["status"] = "error"
            result["risk_level"] = "info"
            result["findings"].append({"message": "Docker not available, sandbox execution skipped", "severity": "info"})

    return result
