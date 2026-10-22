"""Exercise upload verification, deployment locking, and rollback locally."""

import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest

from deploy_production import REMOTE_SCRIPT, build_manifest


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.base = Path(self.temporary.name)
        self.production = self.base / "public_html"
        self.production.mkdir()
        (self.production / "index.html").write_text("previous release")
        handler = functools.partial(QuietHandler, directory=str(self.production))
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        self.config = {
            "directory": str(self.base),
            "release": "test-release",
            "url": f"http://127.0.0.1:{self.server.server_port}",
            "checks": ["index.html"],
        }

    def remote(self, action, config=None):
        return subprocess.run(
            [sys.executable, "-c", REMOTE_SCRIPT, action],
            input=json.dumps(config or self.config), text=True,
            capture_output=True, timeout=20,
        )

    def prepare(self):
        result = self.remote("prepare")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.stage = self.base / "release-test-release"
        (self.stage / "index.html").write_text("new release")
        self.config["manifest"] = build_manifest(self.stage)

    def assert_previous_release(self):
        self.assertEqual((self.production / "index.html").read_text(), "previous release")

    def test_upload_and_live_checks_then_preserve_backup(self):
        self.prepare()
        result = self.remote("activate")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.production / "index.html").read_text(), "new release")
        self.assertEqual(
            (self.base / "public_html.before-test-release/index.html").read_text(),
            "previous release",
        )
        result = self.remote("release")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.base / ".deploy-lock").exists())

    def test_corrupted_upload_leaves_production_untouched(self):
        self.prepare()
        (self.stage / "index.html").write_text("corrupt upload")
        result = self.remote("activate")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Uploaded checksum mismatch", result.stderr)
        self.assert_previous_release()

    def test_missing_upload_leaves_production_untouched(self):
        self.prepare()
        (self.stage / "index.html").unlink()
        result = self.remote("activate")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Unexpected or missing uploaded files", result.stderr)
        self.assert_previous_release()

    def test_failed_live_check_restores_previous_release(self):
        self.prepare()
        # Serve a separate directory so the HTTPS-equivalent check sees stale data.
        stale = self.base / "stale"
        stale.mkdir()
        (stale / "index.html").write_text("stale release")
        self.server.RequestHandlerClass = functools.partial(QuietHandler, directory=str(stale))
        result = self.remote("activate")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("previous production restored", result.stderr)
        self.assert_previous_release()
        self.assertEqual((self.stage / "index.html").read_text(), "new release")

    def test_concurrent_deployment_cannot_take_or_release_lock(self):
        self.prepare()
        other = {**self.config, "release": "other-release"}
        self.assertNotEqual(self.remote("prepare", other).returncode, 0)
        self.assertNotEqual(self.remote("release", other).returncode, 0)
        owner = json.loads((self.base / ".deploy-lock/owner.json").read_text())
        self.assertEqual(owner["release"], "test-release")
        self.assert_previous_release()

    def test_production_change_during_upload_aborts_activation(self):
        self.prepare()
        (self.production / "index.html").write_text("another deployment")
        result = self.remote("activate")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Production changed during upload", result.stderr)
        self.assertEqual((self.production / "index.html").read_text(), "another deployment")


if __name__ == "__main__":
    unittest.main()
