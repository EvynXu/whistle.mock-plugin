"""Isolated contract checks: no live Whistle traffic or business data."""
import base64
import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit
from network import decode_body, captured_response, valid_json

SCRIPT = Path(__file__).with_name('mockmaster.py')
TEXT = '{"orderId":900719925474099312345,"message":"测试"}'
SESSION = {'id': 's', 'url': 'https://example.test/api/orders?secret=discard', 'endTime': 123, 'startTime': 100, 'req': {'method': 'POST', 'headers': {'Authorization': 'fixture-only'}}, 'res': {'statusCode': 500, 'headers': {'Content-Type': 'application/json; charset=utf-8', 'Set-Cookie': 'fixture-only'}, 'size': len(TEXT.encode()), 'base64': base64.b64encode(TEXT.encode()).decode()}}


class ClientTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass
            def reply(self, value, status=200):
                self.send_response(status)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(value).encode())
            def do_GET(self):
                path = urlsplit(self.path)
                query = parse_qs(path.query)
                cls.requests.append((path.path, query))
                if self.headers.get('Authorization') != 'Basic fixture':
                    return self.reply({'error': 'unauthorized'}, 401)
                if path.path == '/whistle/cgi-bin/get-data':
                    return self.reply({'ec': 0, 'data': {'data': {'s': SESSION}, 'lastId': 'cursor', 'hasNew': True}})
                if path.path == '/whistle/cgi-bin/get-session':
                    ids = json.loads(query['reqList'][0])
                    self.assert_response_ids(query, ids)
                    sid = ids[0]
                    return self.reply({sid: 0} if sid == 'expired' else {sid: dict(SESSION, id=sid, endTime=None)} if sid == 'pending' else {sid: dict(SESSION, id=sid)})
                if path.path == '/whistle/cgi-bin/server-info':
                    return self.reply({'ec': 0, 'server': {'ipv4': ['127.0.0.1', '10.1.2.3', '10.1.2.3'], 'ipv6': ['::1', 'fd00::1'], 'port': 8899}})
                if path.path == '/plugin/cgi-bin/features':
                    return self.reply({'code': 0, 'data': [{'id': 'f', 'active': True}]})
                if path.path == '/plugin/cgi-bin/interfaces':
                    return self.reply({'code': 0, 'data': cls.items})
                if path.path == '/plugin/cgi-bin/settings':
                    return self.reply(cls.settings)
                if path.path == '/plugin/cgi-bin/stats':
                    return self.reply({'code': 0, 'data': {'totalHits': 3}})
                if path.path == '/plugin/_flush_cache':
                    return self.reply({'success': True})
                return self.reply({'error': 'unknown route'}, 404)
            def assert_response_ids(self, query, ids):
                if json.loads(query['resList'][0]) != ids:
                    raise AssertionError('Session ID query mismatch')
            def write_data(self):
                payload = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                path = urlsplit(self.path)
                cls.writes.append((self.command, path.path, payload))
                if path.path == '/plugin/cgi-bin/settings':
                    cls.settings.update(payload)
                    return self.reply(cls.settings)
                if path.path != '/plugin/cgi-bin/interfaces':
                    return self.reply({}, 404)
                if self.command == 'POST':
                    item = dict(payload, id='new')
                    cls.items.append(item)
                else:
                    item = next(row for row in cls.items if row['id'] == parse_qs(path.query)['id'][0])
                    item.update(payload)
                self.reply({'code': 0, 'data': item})
            do_POST = write_data
            do_PATCH = write_data
            do_PUT = write_data
        cls.http = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.http.server_port}/plugin'

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.thread.join()

    def setUp(self):
        type(self).requests, type(self).writes = [], []
        type(self).items = [{'id': 'i', 'featureId': 'f', 'name': 'Old', 'proxyType': 'response', 'active': True, 'httpStatus': 200, 'contentType': 'application/json', 'activeResponseId': 'old', 'responses': [{'id': 'old', 'name': 'old', 'content': '{}'}], 'paramMatchers': [{'paramPath': 'id', 'paramValue': '1'}]}]
        type(self).settings = dict(interfaceParamMatcherEnabled=True, responseParamMatcherEnabled=True, webDavSyncEnabled=False)

    def cli(self, *args, fail=False):
        env = dict(os.environ, MOCKMASTER_AUTH_HEADER='Basic fixture')
        env.pop('MOCKMASTER_WHISTLE_URL', None)
        run = subprocess.run([sys.executable, str(SCRIPT), '--base-url', self.base, *args], env=env, capture_output=True, text=True)
        self.assertEqual(run.returncode, 1 if fail else 0, run.stderr)
        return json.loads(run.stderr if fail else run.stdout)

    def test_list_filters_and_cursor_without_body_leak(self):
        result = self.cli('network-list', '--url', '/API/orders', '--method', 'post', '--status', '500', '--cursor', 'before', '--pending-id', 's')
        self.assertEqual(result['data'][0]['id'], 's')
        self.assertEqual(result['cursor'], 'cursor')
        self.assertNotIn('base64', json.dumps(result))
        self.assertNotIn('fixture-only', json.dumps(result))
        query = self.requests[-1][1]
        self.assertEqual(query['startTime'], ['before'])
        self.assertEqual(query['status'], ['--'])
        self.assertEqual(self.cli('network-list', '--status', '200')['data'], [])

    def test_detail_explicit_body_expiry_and_pending(self):
        self.assertNotIn('body', self.cli('network-detail', 's')['data']['response'])
        result = self.cli('network-detail', 's', '--part', 'response', '--body')['data']
        self.assertEqual(result['response']['body']['text'], TEXT)
        self.assertNotIn('request', result)
        self.assertIn('expired', self.cli('network-detail', 'expired', fail=True)['error'])
        self.assertFalse(self.cli('network-detail', 'pending', '--body')['data']['response']['body']['available'])
        self.cli('network-save', 'pending', 'f', fail=True)
        self.assertEqual(self.writes, [])

    def test_new_mock_disabled_no_credentials_verified(self):
        result = self.cli('network-save', 's', 'f')
        self.assertTrue(result['verified'])
        saved = self.items[-1]
        self.assertIs(saved['active'], False)
        self.assertEqual(saved['httpStatus'], 500)
        self.assertEqual(saved['urlPattern'], '/api/orders')
        self.assertEqual(saved['responses'][0]['content'], TEXT)
        self.assertNotIn('fixture-only', json.dumps(saved))
        self.assertNotIn('headers', saved)

    def test_append_preserves_old_response_default_and_settings(self):
        original = copy.deepcopy(self.items[0])
        result = self.cli('network-save', 's', 'f', '--interface-id', 'i')
        saved = self.items[0]
        self.assertEqual(saved['responses'][0], original['responses'][0])
        self.assertEqual(len(saved['responses']), 2)
        for key in ('active', 'activeResponseId', 'httpStatus', 'paramMatchers', 'contentType'):
            self.assertEqual(saved[key], original[key])
        self.assertEqual(result['data']['activeResponseId'], 'old')
        result = self.cli('network-save', 's', 'f', '--interface-id', 'i', '--make-default')
        self.assertEqual(result['data']['activeResponseId'], result['data']['responseId'])

    def test_dry_run_and_flags_and_legacy(self):
        self.assertTrue(self.cli('network-save', 's', 'f', '--enable', '--dry-run')['payload']['active'])
        self.cli('network-save', 's', 'f', '--interface-id', 'i', '--enable', fail=True)
        self.cli('network-save', 's', 'missing', fail=True)
        self.assertEqual(self.writes, [])
        self.items[0].pop('responses')
        self.items[0].pop('activeResponseId')
        self.items[0]['responseContent'] = '{"legacy":1}'
        self.cli('network-save', 's', 'f', '--interface-id', 'i')
        self.assertEqual(self.items[0]['responses'][0]['content'], '{"legacy":1}')
        self.assertEqual(self.items[0]['activeResponseId'], self.items[0]['responses'][0]['id'])

    def test_settings_stats_ip_and_private_export(self):
        with tempfile.TemporaryDirectory() as directory:
            patch, output = Path(directory)/'patch.json', Path(directory)/'detail.json'
            patch.write_text('{"responseParamMatcherEnabled":false}')
            self.cli('request', 'PUT', 'settings', '--body-file', str(patch))
            self.assertIs(self.cli('request', 'GET', 'settings')['responseParamMatcherEnabled'], False)
            self.cli('--output', str(output), 'network-detail', 's', '--body')
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            self.assertEqual(json.loads(output.read_text())['data']['response']['body']['text'], TEXT)
            self.cli('--output', str(output), 'network-save', 's', 'f', fail=True)
            self.assertEqual(len(self.writes), 1)  # only settings above
        self.assertEqual(self.cli('request', 'GET', 'stats')['data']['totalHits'], 3)
        self.cli('request', 'GET', 'stats', '--query', 'type=hits', fail=True)
        self.assertEqual(self.cli('server-info')['addresses'], ['10.1.2.3', 'fd00::1'])

    def test_existing_mock_commands_and_auth_failure(self):
        self.assertEqual(self.cli('request', 'GET', 'interfaces', '--query', 'featureId=f', '--summary')['data'][0]['responses'], [{'id': 'old', 'name': 'old'}])
        self.items[0]['responses'].append({'id': 'other', 'name': 'Other', 'content': '{}'})
        result = self.cli('switch-response', 'f', 'i', 'other')
        self.assertTrue(result['verified'])
        self.assertEqual(result['data']['activeResponseId'], 'other')
        env = dict(os.environ, MOCKMASTER_AUTH_HEADER='Basic rejected-fixture')
        env.pop('MOCKMASTER_WHISTLE_URL', None)
        run = subprocess.run([sys.executable, str(SCRIPT), '--base-url', self.base, 'network-list'], env=env, capture_output=True, text=True)
        self.assertEqual(run.returncode, 1)
        self.assertIn('401', run.stderr)
        self.assertNotIn('rejected-fixture', run.stderr)

    def test_decoding_guards(self):
        for part in [{'headers': {'Content-Type': 'image/png'}, 'body': 'x'}, {'body': 'x', 'size': 99}, {'base64': '!!!'}, {'hasGzipError': True}, {'body': 'a' * (5*1024*1024+1)}]:
            self.assertFalse(decode_body(part)['available'])
        self.assertEqual(decode_body({'headers': {'content-type': 'text/plain; charset=gbk'}, 'base64': base64.b64encode('你好'.encode('gbk')).decode()})['text'], '你好')
        self.assertTrue(decode_body({'statusCode': 204, 'size': 10})['available'])
        self.assertEqual(decode_body({'body': {'type': 'Buffer', 'data': [65]}})['text'], 'A')
        for patch in [{'endTime': None}, {'resError': True}, {'url': 'wss://example.test'}, {'res': {'statusCode': 101}}]:
            with self.assertRaises(ValueError):
                captured_response(dict(SESSION, **patch))
        with self.assertRaises(ValueError):
            valid_json('{\"notJson\":NaN}')


if __name__ == '__main__':
    unittest.main()
