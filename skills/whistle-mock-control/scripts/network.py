"""Whistle Network reads and captured text response -> Mock operations."""
import base64
import binascii
import json
import re
import uuid
from urllib.parse import urlsplit

MAX_BODY = 5 * 1024 * 1024


def header(part, name):
    return next((str(v) for k, v in (part.get('headers') or {}).items() if k.lower() == name), '')


def brief(item):
    row = {k: item[k] for k in ('id', 'url', 'startTime', 'endTime', 'reqError', 'resError') if k in item}
    row.update(method=(item.get('req') or {}).get('method'), status=(item.get('res') or {}).get('statusCode'))
    row['contentType'] = header(item.get('res') or {}, 'content-type')
    return row


def decode_body(part, method=''):
    part = part or {}
    kind = header(part, 'content-type')
    mime = kind.split(';')[0].strip().lower()
    result = {'available': False, 'contentType': kind}
    def unavailable(reason):
        return dict(result, reason=reason)
    if mime and not (mime.startswith('text/') or re.search(r'json|xml|javascript|x-www-form-urlencoded|graphql', mime)):
        return unavailable('Binary or unsupported Content-Type')
    try:
        encoded, body = part.get('base64'), part.get('body')
        if encoded:
            if len(encoded) > (MAX_BODY * 4 // 3) + 8:
                return unavailable('Body exceeds 5 MB')
            data = base64.b64decode(encoded, validate=True)
        elif isinstance(body, str):
            data = body.encode('utf-8')
        elif isinstance(body, dict) and body.get('type') == 'Buffer':
            if len(body.get('data', [])) > MAX_BODY:
                return unavailable('Body exceeds 5 MB')
            data = bytes(body.get('data', []))
        else:
            data = b''
        if len(data) > MAX_BODY:
            return unavailable('Body exceeds 5 MB')
        if part.get('hasGzipError'):
            return unavailable('Whistle decompression failed')
        expected = float(part.get('unzipSize', part.get('size', 0)) or 0)
        no_body = method.upper() == 'HEAD' or str(part.get('statusCode')) in ('204', '304')
        if not no_body and expected > len(data) and ('unzipSize' in part or not header(part, 'content-encoding') or not data):
            return unavailable('Body missing or truncated in Whistle cache')
        match = re.search(r'charset\s*=\s*[\"\']?([^;\s\"\']+)', kind, re.I)
        charset = match.group(1) if match else 'utf-8'
        text = body if isinstance(body, str) and not encoded else data.decode(charset, errors='strict')
        if re.search(r'[\x00-\x08\x0e-\x1f]', text):
            return unavailable('Body contains binary data')
        return dict(result, available=True, text=text)
    except (ValueError, TypeError, LookupError, UnicodeError, binascii.Error):
        return unavailable('Invalid or unsupported body encoding')


def session(api, session_id):
    result = api.core('get-session', {'reqList': json.dumps([session_id]), 'resList': json.dumps([session_id])})
    item = result.get(session_id)
    if item == 0:
        raise ValueError('Session expired from Whistle cache; cannot recover the original body')
    if not isinstance(item, dict) or item.get('id') != session_id:
        raise ValueError('Session not ready; retry later (do not replay the request)')
    return item


def captured_response(item):
    req, res = item.get('req') or {}, item.get('res') or {}
    if urlsplit(item.get('url', '')).scheme.lower() not in ('http', 'https') or req.get('method', '').upper() == 'CONNECT':
        raise ValueError('Only HTTP/HTTPS text responses can become Mock')
    if not item.get('endTime') or item.get('reqError') or item.get('resError'):
        raise ValueError('Request incomplete or failed; cannot save a partial response')
    status = int(res.get('statusCode') or 0)
    if not 200 <= status <= 599:
        raise ValueError('No supported HTTP response status (WebSocket frames are unsupported)')
    body = decode_body(res, req.get('method', ''))
    if not body['available']:
        raise ValueError(body['reason'])
    return body


def valid_json(text):
    def invalid(value):
        raise ValueError('Non-JSON constant: ' + value)
    json.loads(text, parse_constant=invalid)


def save_mock(api, args):
    if args.enable and args.interface_id:
        raise ValueError('--enable is only for new interfaces; append preserves interface state')
    if args.make_default and not args.interface_id:
        raise ValueError('--make-default is only for append; a new Mock already uses its captured response')
    if args.interface_id and args.url_pattern:
        raise ValueError('--url-pattern is only for new interfaces; append preserves matching rules')
    item = session(api, args.session_id)
    captured = captured_response(item)
    features = api.call('GET', 'features')['data']
    if not any(f.get('id') == args.feature_id for f in features):
        raise ValueError('Target module does not exist')
    rid = str(uuid.uuid4())
    response = {'id': rid, 'name': args.name or '抓包响应', 'description': '来自 Whistle 抓包', 'content': captured['text'], 'paramMatchers': []}
    if args.interface_id:
        rows = api.call('GET', 'interfaces', {'featureId': args.feature_id})['data']
        target = next((row for row in rows if row.get('id') == args.interface_id), None)
        if not target or target.get('proxyType', 'response') != 'response':
            raise ValueError('Target interface missing or not in response mode')
        if 'json' in target.get('contentType', '').lower():
            valid_json(captured['text'])
        responses = target.get('responses') or [{'id': str(uuid.uuid4()), 'name': '默认响应', 'content': target.get('responseContent', '{}'), 'paramMatchers': []}]
        default = target.get('activeResponseId') or responses[0]['id']
        if not any(r['id'] == default for r in responses):
            raise ValueError('Existing activeResponseId is invalid; repair before appending')
        payload = {'responses': responses + [response], 'activeResponseId': rid if args.make_default else default}
        method, query = 'PATCH', {'id': args.interface_id}
        warnings = ['Append preserves interface-level status, headers, Content-Type and enabled state.']
    else:
        kind = captured['contentType'] or 'text/plain; charset=utf-8'
        kind = re.sub(r'charset\s*=\s*[\"\']?[^;\s\"\']+[\"\']?', 'charset=utf-8', kind, flags=re.I)
        if 'charset=' not in kind.lower().replace(' ', ''):
            kind += '; charset=utf-8'
        if 'json' in kind.lower():
            valid_json(captured['text'])
        pattern = args.url_pattern or urlsplit(item['url']).path or '/'
        payload = {'featureId': args.feature_id, 'name': args.name or f"{item['req'].get('method', 'GET')} {pattern}", 'urlPattern': pattern, 'httpMethod': item['req'].get('method', 'GET'), 'proxyType': 'response', 'active': args.enable, 'httpStatus': int(item['res']['statusCode']), 'contentType': kind, 'responses': [response], 'activeResponseId': rid}
        method, query = 'POST', None
        warnings = ['URL pattern defaults to pathname only (no host/query); use --url-pattern for a narrower match.']
    if args.dry_run:
        return {'code': 0, 'dryRun': True, 'method': method, 'query': query, 'payload': payload, 'warnings': warnings}
    result = api.call(method, 'interfaces', query, payload)
    interface_id = args.interface_id or result['data']['id']
    warning = api.flush()
    verified = next((r for r in api.call('GET', 'interfaces', {'featureId': args.feature_id})['data'] if r.get('id') == interface_id), None)
    if not verified or verified.get('activeResponseId') != payload['activeResponseId'] or not any(r.get('id') == rid and r.get('content') == captured['text'] for r in verified.get('responses', [])):
        raise ValueError('Write returned success but verification failed; read back before retrying')
    if warning:
        warnings.append(warning)
    return {'code': 0, 'verified': True, 'data': {'id': interface_id, 'featureId': args.feature_id, 'responseId': rid, 'active': verified.get('active'), 'activeResponseId': verified.get('activeResponseId')}, 'warnings': warnings}


def add_commands(commands):
    listing = commands.add_parser('network-list', help='Read recent captured request metadata (no bodies)')
    listing.add_argument('--count', type=int, default=50, choices=range(1, 101), metavar='1..100')
    listing.add_argument('--cursor', help='lastId from the previous result (incremental, not historical paging)')
    listing.add_argument('--pending-id', action='append', default=[])
    listing.add_argument('--url', default='', help='Case-insensitive URL substring, filtered within returned batch')
    listing.add_argument('--method', default='')
    listing.add_argument('--status', type=int)
    detail = commands.add_parser('network-detail', help='Read one capture; body text requires --body')
    detail.add_argument('session_id')
    detail.add_argument('--part', choices=['request', 'response', 'both'], default='both')
    detail.add_argument('--body', action='store_true')
    saving = commands.add_parser('network-save', help='Create Mock or append a response from a completed capture')
    saving.add_argument('session_id')
    saving.add_argument('feature_id')
    saving.add_argument('--interface-id')
    saving.add_argument('--name')
    saving.add_argument('--url-pattern')
    saving.add_argument('--enable', action='store_true')
    saving.add_argument('--make-default', action='store_true')
    saving.add_argument('--dry-run', action='store_true')
    commands.add_parser('server-info', help='Read service IP addresses (no ports)')


def run_command(api, args):
    if args.command == 'network-save':
        return save_mock(api, args)
    if args.command == 'server-info':
        server = api.core('server-info').get('server') or {}
        import ipaddress
        addresses = []
        for value in (server.get('ipv4') or []) + (server.get('ipv6') or []):
            address = value.get('address') if isinstance(value, dict) else value
            try:
                ip = ipaddress.ip_address(address)
                if not ip.is_loopback and not ip.is_unspecified and address not in addresses:
                    addresses.append(address)
            except ValueError:
                continue
        return {'code': 0, 'addresses': addresses}
    if args.command == 'network-list':
        query = {'count': args.count, 'startLogTime': -3, 'startSvrLogTime': -3}
        if args.cursor:
            query['startTime'] = args.cursor
        if args.pending_id:
            query.update(ids=','.join(args.pending_id), status=','.join('--' for _ in args.pending_id))
        packet = api.core('get-data', query).get('data')
        if not isinstance(packet, dict) or not isinstance(packet.get('data'), dict):
            raise ValueError('Incompatible Whistle Network payload')
        rows = [brief(row) for row in packet['data'].values() if isinstance(row, dict) and row.get('id')]
        rows = [row for row in rows if args.url.lower() in (row.get('url') or '').lower() and (not args.method or (row.get('method') or '').upper() == args.method.upper()) and (args.status is None or str(row.get('status')) == str(args.status))]
        rows.sort(key=lambda row: row.get('startTime', 0), reverse=True)
        return {'code': 0, 'data': rows, 'cursor': packet.get('lastId'), 'endId': packet.get('endId'), 'hasNew': bool(packet.get('hasNew')), 'filterScope': 'returned batch only'}
    item = session(api, args.session_id)
    result = {'code': 0, 'data': brief(item)}
    for name, key in (('request', 'req'), ('response', 'res')):
        if args.part in (name, 'both'):
            part = item.get(key) or {}
            value = {k: v for k, v in part.items() if k in ('method', 'statusCode', 'headers', 'trailers', 'size', 'unzipSize')}
            if args.body:
                value['body'] = ({'available': False, 'reason': 'Response not finished; refresh after completion'} if key == 'res' and not item.get('endTime') else decode_body(part, (item.get('req') or {}).get('method', '') if key == 'res' else ''))
            result['data'][name] = value
    return result
