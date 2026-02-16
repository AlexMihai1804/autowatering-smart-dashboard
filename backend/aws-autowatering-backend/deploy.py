#!/usr/bin/env python3
"""
One-click deploy for AutoWatering AWS backend.

Usage:
    python deploy.py

No parameters needed -- everything is hardcoded for the dev stack.
"""

import os
import sys
import shutil
import subprocess
import time

# -- Configuration (edit here if needed) ----------------------------------
STACK_NAME = "autowatering-backend-dev"
REGION = "eu-central-1"
APP_ENVIRONMENT = "dev"

SAM_CMD = r"C:\Program Files\Amazon\AWSSAMCLI\bin\sam.cmd"
AWS_CMD = r"C:\Program Files\Amazon\AWSCLIV2\aws.exe"
NPM_CMD = shutil.which("npm") or r"C:\Program Files\nodejs\npm.cmd"
# -------------------------------------------------------------------------

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS_DIR = os.path.normpath(os.path.join(BACKEND_DIR, "..", "..", "scripts"))
BOOTSTRAP_SCRIPT = os.path.join(SCRIPTS_DIR, "bootstrap_backend_secrets.ps1")


class DeployError(SystemExit):
    pass


def banner(text: str, color: str = "cyan"):
    codes = {"cyan": "\033[96m", "green": "\033[92m", "yellow": "\033[93m", "red": "\033[91m", "reset": "\033[0m"}
    c = codes.get(color, "")
    r = codes["reset"]
    print(f"\n{c}{'=' * 60}")
    print(f"  {text}")
    print(f"{'=' * 60}{r}")


def run(args: list, label: str, cwd: str | None = None, check: bool = True):
    """Run a subprocess, stream output, raise on failure."""
    banner(label)
    result = subprocess.run(args, cwd=cwd or BACKEND_DIR)
    if check and result.returncode != 0:
        raise DeployError(f"FAILED: {label} (exit code {result.returncode})")
    return result


def preflight():
    """Verify all tools are available and AWS credentials work."""
    banner("Pre-flight checks")

    errors = []
    if not os.path.isfile(SAM_CMD):
        errors.append(f"SAM CLI not found at {SAM_CMD}")
    if not os.path.isfile(AWS_CMD):
        errors.append(f"AWS CLI not found at {AWS_CMD}")
    npm = shutil.which("npm")
    if not npm and not os.path.isfile(NPM_CMD):
        errors.append(f"npm not found in PATH or at {NPM_CMD}")

    if errors:
        for e in errors:
            print(f"  ERROR: {e}", file=sys.stderr)
        raise DeployError(1)

    # Verify AWS credentials
    r = subprocess.run(
        [AWS_CMD, "sts", "get-caller-identity", "--region", REGION],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        print("  ERROR: AWS credentials not configured. Run 'aws configure' first.", file=sys.stderr)
        raise DeployError(1)

    print("  AWS credentials OK")
    print("  SAM CLI OK")
    print("  npm OK")


def bootstrap_secrets():
    """Run the PowerShell secrets bootstrap if the script exists."""
    if not os.path.isfile(BOOTSTRAP_SCRIPT):
        banner("Bootstrap secrets -- SKIPPED (script not found)", "yellow")
        print(f"  {BOOTSTRAP_SCRIPT}")
        print("  (OK for first-ever deploy -- secrets must already exist in Secrets Manager)")
        return

    run(
        [
            "powershell", "-NoProfile", "-ExecutionPolicy", "Bypass",
            "-File", BOOTSTRAP_SCRIPT,
            "-StackName", STACK_NAME,
            "-Region", REGION,
            "-AppEnvironment", APP_ENVIRONMENT,
        ],
        "Bootstrap secrets (Secrets Manager)",
    )


def npm_install():
    run([NPM_CMD, "install", "--no-fund", "--no-audit"], "npm install")


def ts_build():
    run([NPM_CMD, "run", "build"], "TypeScript build (npm run build)")


def sam_build():
    run([SAM_CMD, "build"], "SAM build")


def sam_deploy():
    run([SAM_CMD, "deploy"], "SAM deploy")


def print_api_url():
    """Query CloudFormation for the deployed API URL."""
    try:
        r = subprocess.run(
            [
                AWS_CMD, "cloudformation", "describe-stacks",
                "--region", REGION,
                "--stack-name", STACK_NAME,
                "--query", "Stacks[0].Outputs[?OutputKey=='ApiBaseUrl'].OutputValue",
                "--output", "text",
            ],
            capture_output=True, text=True, timeout=15,
        )
        url = r.stdout.strip()
        if url and url != "None":
            print(f"\n\033[93m  API URL: {url}\033[0m\n")
    except Exception:
        pass


def main():
    t0 = time.monotonic()

    preflight()
    bootstrap_secrets()
    npm_install()
    ts_build()
    sam_build()
    sam_deploy()

    elapsed = time.monotonic() - t0
    mins = int(elapsed) // 60
    secs = int(elapsed) % 60

    banner("DEPLOY COMPLETE", "green")
    print(f"  Stack : {STACK_NAME}")
    print(f"  Region: {REGION}")
    print(f"  Time  : {mins}m {secs}s")
    print(f"{'=' * 60}")

    print_api_url()


if __name__ == "__main__":
    main()
