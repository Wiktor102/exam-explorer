"""Build a committed revision and deploy it using local SSH credentials."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile
import uuid


def load_settings(path: Path) -> dict[str, str]:
    settings = {}
    for number, line in enumerate(path.read_text().splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, separator, value = line.partition("=")
        key = key.strip()
        if not separator or key not in {
            "MYDEVIL_HOST", "MYDEVIL_DOMAIN_DIRECTORY", "MYDEVIL_PRODUCTION_URL",
            "MYDEVIL_SSH_KEY",
        }:
            raise RuntimeError(f"Invalid deployment setting at {path}:{number}")
        try:
            values = shlex.split(value, comments=True)
        except ValueError:
            raise RuntimeError(f"Invalid deployment value at {path}:{number}") from None
        if len(values) > 1:
            raise RuntimeError(f"Quote values containing spaces at {path}:{number}")
        settings[key] = values[0] if values else ""
    for key in ("MYDEVIL_HOST", "MYDEVIL_DOMAIN_DIRECTORY", "MYDEVIL_PRODUCTION_URL"):
        if not settings.get(key):
            raise RuntimeError(f"Missing {key} in {path}")
    return settings

# Executed by the server's Python, with configuration passed as JSON on stdin.
REMOTE_SCRIPT = r'''
import hashlib
import json
import os
from pathlib import Path
import sys
import time
from urllib.parse import quote
from urllib.request import Request, urlopen

config = json.load(sys.stdin)
base = Path(config["directory"])
production = base / "public_html"
stage = base / ("release-" + config["release"])
backup = base / ("public_html.before-" + config["release"])
lock = base / ".deploy-lock"
owner = lock / "owner.json"
action = sys.argv[1]

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

if action == "prepare":
    require(production.is_dir() and not production.is_symlink(),
            "Expected a production directory, not a symlink")
    lock.mkdir()  # Exclusive lock shared by local deploy commands.
    try:
        state = {"release": config["release"],
                 "previousIndex": digest(production / "index.html")}
        owner.write_text(json.dumps(state))
        stage.mkdir()
    except BaseException:
        owner.unlink(missing_ok=True)
        lock.rmdir()
        raise
    print("Deployment lock acquired; upload directory:", stage, flush=True)
else:
    state = json.loads(owner.read_text())
    require(state["release"] == config["release"], "Deployment lock owner changed")
    if action == "release":
        owner.unlink()
        lock.rmdir()
    elif action == "activate":
        manifest = config["manifest"]
        actual = {p.relative_to(stage).as_posix()
                  for p in stage.rglob("*") if p.is_file()}
        require(actual == set(manifest), "Unexpected or missing uploaded files")
        for relative, expected in manifest.items():
            path = stage / relative
            require(not path.is_symlink() and digest(path) == expected,
                    "Uploaded checksum mismatch: " + relative)
        require(not backup.exists(), "Rollback directory already exists")
        require(digest(production / "index.html") == state["previousIndex"],
                "Production changed during upload")
        print("Verified", len(manifest), "uploaded files", flush=True)
        os.rename(production, backup)
        try:
            os.rename(stage, production)
        except BaseException:
            os.rename(backup, production)
            raise
        try:
            # Retry briefly while the web server observes the directory change.
            for attempt in range(3):
                try:
                    for relative in config["checks"]:
                        url = (config["url"] + "/" + quote(relative, safe="/")
                               + "?deploy=" + config["release"])
                        request = Request(url, headers={"Cache-Control": "no-cache"})
                        with urlopen(request, timeout=30) as response:
                            require(response.status == 200, "HTTP check failed: " + relative)
                            require(hashlib.sha256(response.read()).hexdigest()
                                    == manifest[relative], "Live checksum mismatch: " + relative)
                    break
                except Exception:
                    if attempt == 2:
                        raise
                    time.sleep(2)
        except BaseException:
            os.rename(production, stage)
            os.rename(backup, production)
            print("Live checks failed; previous production restored.", file=sys.stderr)
            raise
        print("Deployed:", config["url"], flush=True)
        print("Rollback copy:", backup, flush=True)
    else:
        raise RuntimeError("Unknown deployment action: " + action)
'''


def run(args: list[str], **kwargs: object) -> subprocess.CompletedProcess:
    return subprocess.run(args, check=True, **kwargs)


def remote(ssh: list[str], host: str, action: str, config: dict) -> None:
    command = shlex.join(["python3", "-c", REMOTE_SCRIPT, action])
    run([*ssh, host, command], input=json.dumps(config), text=True)


def build_manifest(dist: Path) -> dict[str, str]:
    return {
        path.relative_to(dist).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(dist.rglob("*"))
        if path.is_file()
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ref", default="HEAD", help="Local Git revision to deploy, default HEAD")
    parser.add_argument("--dry-run", action="store_true",
                        help="Build and mirror resources without connecting to production")
    args = parser.parse_args()
    for executable in ("git", "tar", "pnpm", "ssh", "rsync"):
        if shutil.which(executable) is None:
            parser.error(f"Required command not found: {executable}")

    repository = Path(__file__).resolve().parents[2]
    commit = subprocess.check_output(
        ["git", "rev-parse", "--verify", "--end-of-options", args.ref + "^{commit}"],
        cwd=repository, text=True,
    ).strip()
    print(f"Building committed revision {commit}; working tree changes are excluded.", flush=True)

    ssh = ["ssh", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes",
           "-o", "ConnectTimeout=15", "-o", "ServerAliveInterval=15",
           "-o", "ServerAliveCountMax=3"]
    settings = {} if args.dry_run else load_settings(Path(__file__).resolve().with_name(".env"))
    identity = settings.get("MYDEVIL_SSH_KEY")
    if identity:
        ssh.extend(["-i", str(Path(identity).expanduser()), "-o", "IdentitiesOnly=yes"])

    with tempfile.TemporaryDirectory(prefix="exam-explorer-deploy-") as temporary:
        source = Path(temporary) / "source"
        source.mkdir()
        archive = Path(temporary) / "source.tar"
        with archive.open("wb") as output:
            run(["git", "archive", commit], cwd=repository, stdout=output)
        run(["tar", "-xf", str(archive), "-C", str(source)])
        run(["pnpm", "install", "--frozen-lockfile"], cwd=source)
        run(["pnpm", "build"], cwd=source)
        run([sys.executable, "scripts/mirror_resources.py", "--public", "dist"], cwd=source)
        dist = source / "dist"
        manifest = build_manifest(dist)
        checks = ["index.html", "data/inf03/catalog.json", "data/inf04/catalog.json"]
        checks.extend(path for path in manifest if path.startswith("assets/"))
        for relative in [*checks, ".htaccess"]:
            if relative not in manifest:
                raise RuntimeError(f"Required build file missing: {relative}")
        print(f"Build ready: {len(manifest)} files.", flush=True)
        if args.dry_run:
            print("Dry run complete. No connection to production was made.", flush=True)
            return

        config = {
            "directory": settings["MYDEVIL_DOMAIN_DIRECTORY"],
            "release": commit[:12] + "-" + uuid.uuid4().hex[:12],
            "url": settings["MYDEVIL_PRODUCTION_URL"].rstrip("/"),
            "manifest": manifest,
            "checks": checks,
        }
        host = settings["MYDEVIL_HOST"]
        remote(ssh, host, "prepare", config)
        try:
            destination = f"{host}:{config['directory']}/release-{config['release']}/"
            run(["rsync", "--archive", "--checksum", "--copy-dest=../public_html",
                 "--stats", "-e", shlex.join(ssh),
                 str(dist) + "/", destination])
            remote(ssh, host, "activate", config)
        finally:
            remote(ssh, host, "release", config)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        print(f"Deployment failed: {error.cmd[0]} exited with status {error.returncode}.",
              file=sys.stderr)
        sys.exit(1)
    except (OSError, RuntimeError) as error:
        print(f"Deployment failed: {error}", file=sys.stderr)
        sys.exit(1)
