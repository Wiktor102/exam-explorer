from __future__ import annotations

import io
import json
from pathlib import Path
import socket
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

import mirror_resources as mirror


class ResourceMirrorTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.catalog_path = self.root / 'data/inf03/catalog.json'
        self.catalog_path.parent.mkdir(parents=True)
        self.upstream = 'https://unavailable.example/files/pliki.7z'
        self.catalog = {
            'exams': [{
                'code': 'INF.03-01-26.06-SG',
                'assetFiles': ['pliki.7z'],
                'assetUrls': {'pliki.7z': self.upstream},
            }],
        }
        self.catalog_path.write_text(json.dumps(self.catalog))
        self.destination = self.root / 'resources/inf03/INF.03-01-26.06-SG.7z'
        self.fallback = 'https://production.example/resources/inf03/INF.03-01-26.06-SG.7z'

    def test_dns_failure_recovers_from_production_and_rewrites_catalog(self):
        with patch.object(mirror, 'urlopen', side_effect=[
            URLError(socket.gaierror(-2, 'Name or service not known')),
            io.BytesIO(b'archive contents'),
        ]) as request:
            count, size = mirror.mirror_catalog(self.root, 'inf03', 'https://production.example/')
        self.assertEqual((count, size), (1, 16))
        self.assertEqual(self.destination.read_bytes(), b'archive contents')
        self.assertEqual([call.args[0].full_url for call in request.call_args_list], [self.upstream, self.fallback])
        catalog = json.loads(self.catalog_path.read_text())
        self.assertEqual(catalog['exams'][0]['assetUrls']['pliki.7z'], '/resources/inf03/INF.03-01-26.06-SG.7z')

    def test_successful_upstream_does_not_use_fallback(self):
        with patch.object(mirror, 'urlopen', return_value=io.BytesIO(b'new archive')) as request:
            mirror.mirror_catalog(self.root, 'inf03', 'https://production.example')
        self.assertEqual(request.call_count, 1)
        self.assertEqual(self.destination.read_bytes(), b'new archive')

    def test_missing_fallback_aborts_without_rewriting_catalog(self):
        with patch.object(mirror, 'urlopen', side_effect=[
            URLError('DNS failed'), HTTPError(self.fallback, 404, 'Not found', {}, None),
        ]):
            with self.assertRaisesRegex(RuntimeError, 'Could not download .* or fallback'):
                mirror.mirror_catalog(self.root, 'inf03', 'https://production.example')
        self.assertEqual(json.loads(self.catalog_path.read_text()), self.catalog)
        self.assertFalse(self.destination.exists())
        self.assertFalse(list(self.root.rglob('*.part')))

    def test_no_configured_fallback_reports_failed_url(self):
        with patch.object(mirror, 'urlopen', side_effect=URLError('DNS failed')):
            with self.assertRaisesRegex(RuntimeError, self.upstream):
                mirror.mirror_catalog(self.root, 'inf03')
        self.assertEqual(json.loads(self.catalog_path.read_text()), self.catalog)

    def test_partial_upstream_download_is_replaced_with_complete_fallback(self):
        response = unittest.mock.MagicMock()
        response.__enter__.return_value = response
        response.read.side_effect = [b'partial', TimeoutError('Read timed out')]
        with patch.object(mirror, 'urlopen', side_effect=[response, io.BytesIO(b'complete')]):
            mirror.mirror_catalog(self.root, 'inf03', 'https://production.example')
        self.assertEqual(self.destination.read_bytes(), b'complete')
        self.assertFalse(list(self.root.rglob('*.part')))


if __name__ == '__main__':
    unittest.main()
