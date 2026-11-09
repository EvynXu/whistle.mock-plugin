#!/usr/bin/env python3
"""Small standard-library HTTP client for whistle.mock-plugins management."""
import argparse
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen, build_opener, ProxyHandler


class API:
    def __init__(self, base, whistle_url=None):
        self.base = base.rstrip('/')
        if urlsplit(self.base).scheme not in ('http', 'https'):
            raise ValueError('base-url must use HTTP or HTTPS')
        parsed = urlsplit(self.base)
        self.core_base = (whistle_url or urlunsplit((parsed.scheme, parsed.netloc, '/whistle', '', ''))).rstrip('/')
        if urlsplit(self.core_base).scheme not in ('http', 'https'):
            raise ValueError('whistle-url must use HTTP or HTTPS')
        self.headers = {'Accept': 'application/json'}
        if os.environ.get('MOCKMASTER_AUTH_HEADER'):
            self.headers['Authorization'] = os.environ['MOCKMASTER_AUTH_HEADER']

    def raw(self, method, path, query=None, body=None, core=False):
        url = (self.core_base if core else self.base) + '/' + path
        if query:
            url += '?' + urlencode(query)
        headers = dict(self.headers)
        data = None
        if body is not None:
            data = json.dumps(body, ensure_ascii=False).encode('utf-8')
            headers['Content-Type'] = 'application/json'
        request = Request(url, data=data, headers=headers, method=method)
        # Local management traffic must not be sent through an environment proxy.
        local = urlsplit(url).hostname in ('localhost', '127.0.0.1', '::1')
        send = build_opener(ProxyHandler({})).open if local else urlopen
        try:
            with send(request, timeout=20) as response:
                payload = response.read(32 * 1024 * 1024 + 1)
                if len(payload) > 32 * 1024 * 1024:
                    raise ValueError('API response exceeds 32 MB; narrow the query or inspect in Whistle')
                result = json.loads(payload)
        except HTTPError as exc:
            # Do not echo headers, credentials or arbitrary HTML response bodies.
            raise ValueError('HTTP %s from plugin; check target, permissions and request' % exc.code) from exc
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise ValueError('Expected JSON; check plugin base URL (received non-API response)') from exc
        if not isinstance(result, dict):
            raise ValueError('Expected a JSON object from plugin')
        return result

    def call(self, method, endpoint, query=None, body=None):
        result = self.raw(method, 'cgi-bin/' + endpoint, query, body)
        if endpoint == 'settings':
            if not all(isinstance(result.get(key), bool) for key in ('interfaceParamMatcherEnabled', 'responseParamMatcherEnabled', 'webDavSyncEnabled')):
                raise ValueError('Invalid settings response')
            return result
        if result.get('code') != 0:
            raise ValueError('Plugin rejected request: ' + str(result.get('message', result.get('code'))))
        return result

    def core(self, endpoint, query=None):
        result = self.raw('GET', 'cgi-bin/' + endpoint, query, core=True)
        if endpoint != 'get-session' and result.get('ec') != 0:
            raise ValueError('Whistle API unavailable or incompatible; check whistle-url and authentication')
        return result

    def flush(self):
        try:
            result = self.raw('GET', '_flush_cache')
            if result.get('code') != 0 and result.get('success') is not True:
                return 'Configuration saved; cache refresh was not confirmed.'
        except (ValueError, OSError, URLError):
            return 'Configuration saved; cache refresh was not confirmed. Do not repeat the write.'
        return None


def summary(result):
    data = result.get('data')
    if not isinstance(data, list):
        return result
    fields = ('id', 'featureId', 'name', 'urlPattern', 'httpMethod', 'proxyType', 'active', 'interfaceCount', 'activeResponseId')
    rows = []
    for row in data:
        entry = {key: row[key] for key in fields if key in row}
        if isinstance(row.get('responses'), list):
            entry['responses'] = [{key: r[key] for key in ('id', 'name') if key in r} for r in row['responses']]
        rows.append(entry)
    return {**result, 'data': rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default=os.environ.get('MOCKMASTER_BASE_URL', 'http://127.0.0.1:8899/whistle.mock-plugins'))
    parser.add_argument('--whistle-url', default=os.environ.get('MOCKMASTER_WHISTLE_URL'), help='Whistle core UI base; defaults to plugin origin + /whistle')
    parser.add_argument('--output', type=Path, help='Write JSON to a new private file instead of stdout')
    commands = parser.add_subparsers(dest='command', required=True)
    request = commands.add_parser('request')
    request.add_argument('method', choices=['GET', 'POST', 'PATCH', 'PUT', 'DELETE'])
    request.add_argument('endpoint', choices=['features', 'interfaces', 'settings', 'stats'])
    request.add_argument('--query', action='append', default=[], metavar='KEY=VALUE')
    request.add_argument('--body-file', type=Path)
    request.add_argument('--summary', action='store_true')
    switch = commands.add_parser('switch-response')
    switch.add_argument('feature_id')
    switch.add_argument('interface_id')
    switch.add_argument('response_id')
    from network import add_commands, run_command
    add_commands(commands)
    args = parser.parse_args()
    if args.output and args.output.exists():
        raise ValueError('Output file already exists; choose a new path before running any operation')
    api = API(args.base_url, args.whistle_url)
    if args.command == 'request':
        query = {}
        for pair in args.query:
            key, sep, value = pair.partition('=')
            if not sep or not key:
                raise ValueError('--query expects KEY=VALUE')
            query[key] = value
        if args.endpoint == 'stats' and args.method != 'GET':
            raise ValueError('Stats supports GET only')
        if args.endpoint == 'settings' and args.method not in ('GET', 'PUT'):
            raise ValueError('Use GET or PUT for settings')
        if args.endpoint == 'stats' and query.get('type', 'overview') not in ('overview', 'top', 'timeline', 'recent'):
            raise ValueError('Stats type must be overview, top, timeline or recent')
        body = json.loads(args.body_file.read_text(encoding='utf-8')) if args.body_file else None
        if args.endpoint == 'settings' and body is not None:
            allowed = {'interfaceParamMatcherEnabled', 'responseParamMatcherEnabled', 'webDavSyncEnabled'}
            if not isinstance(body, dict) or not body or not set(body) <= allowed or not all(isinstance(v, bool) for v in body.values()):
                raise ValueError('Settings accepts only the three documented boolean flags')
        if args.method in ('POST', 'PATCH', 'PUT') and not isinstance(body, dict):
            raise ValueError('Writes require --body-file containing a JSON object')
        result = api.call(args.method, args.endpoint, query, body)
        if args.method != 'GET':
            warning = api.flush()
            if warning:
                result['warning'] = warning
        if args.summary:
            result = summary(result)
    elif args.command == 'switch-response':
        def find_interface():
            rows = api.call('GET', 'interfaces', {'featureId': args.feature_id})['data']
            item = next((r for r in rows if r['id'] == args.interface_id), None)
            if item is None:
                raise ValueError('Interface is not in the selected module')
            return item
        item = find_interface()
        if item.get('proxyType', 'response') != 'response':
            raise ValueError('Default response switching requires response proxy mode')
        if not any(r['id'] == args.response_id for r in item.get('responses', [])):
            raise ValueError('Response does not belong to the interface')
        changed = item.get('activeResponseId') != args.response_id
        warning = None
        if changed:
            api.call('PATCH', 'interfaces', {'id': args.interface_id}, {'activeResponseId': args.response_id})
            warning = api.flush()
        verified = find_interface()
        if verified.get('activeResponseId') != args.response_id:
            raise ValueError('Default response verification failed; re-read before retrying')
        result = {'code': 0, 'changed': changed, 'verified': True, 'data': {key: verified.get(key) for key in ('id', 'featureId', 'name', 'active', 'activeResponseId')}}
        if warning:
            result['warning'] = warning
    else:
        result = run_command(api, args)
    output = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        with os.fdopen(os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w', encoding='utf-8') as file:
            file.write(output + '\n')
        print(json.dumps({'saved': str(args.output)}, ensure_ascii=False))
    else:
        print(output)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, URLError, KeyError) as error:
        print(json.dumps({'error': str(error)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
