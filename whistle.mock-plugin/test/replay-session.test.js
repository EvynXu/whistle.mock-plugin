const { captureRow } = require('../ui/src/utils/network/replay-capture');
const { createReplayQueue, parseSession } = require('../lib/replay-session');

const host = 'example.test';
const ip = '192.168.1.20';
const item = {
  id: '100-1', url: 'https://example.test/api/order', startTime: 100, endTime: 240,
  req: { ip, method: 'POST', body: '{"id":1}' },
  res: { statusCode: 500, headers: {
    'content-type': 'application/json', 'content-encoding': 'gzip', 'set-cookie': 'sid=private'
  }, body: '{"error":true}', size: 25, unzipSize: 14 }
};
const capture = value => captureRow(value, null, new Set([host]), ip);

test('captures complete bytes and timing for only the chosen device and hosts', () => {
  const row = capture(item);
  expect(row).toMatchObject({ outcome: 'response', status: 500, duration: 140 });
  expect(Buffer.from(row.response.body, 'base64').toString()).toBe('{"error":true}');
  expect(row.response.headers).toEqual({ 'content-type': 'application/json' });
  expect(capture({ ...item, req: { ...item.req, ip: '192.168.1.21' } })).toBeNull();
  expect(capture({ ...item, url: 'https://other.test/api' })).toBeNull();
  expect(capture({ ...item, res: { ...item.res, body: '' } }).outcome).toBe('incomplete');
  expect(capture({ ...item, endTime: undefined }).outcome).toBe('pending');
});

test('matches exact method, query and request body and consumes repeats in captured order', () => {
  const first = capture(item);
  const second = { ...first, id: '101-2', startTime: 101, status: 200 };
  const session = parseSession(JSON.stringify({ version: 1, entryUrl: item.url, startedAt: 100, records: [second, first] }));
  const next = createReplayQueue(session.records);
  expect(next('GET', first.url, first.requestBody)).toBeUndefined();
  expect(next('POST', first.url + '?page=2', first.requestBody)).toBeUndefined();
  expect(next('POST', first.url, '')).toBeUndefined();
  expect(next('POST', first.url, first.requestBody).status).toBe(500);
  expect(next('POST', first.url, first.requestBody).status).toBe(200);
  expect(next('POST', first.url, first.requestBody)).toBeUndefined();
});

test('reuses a script for a new cache timestamp without changing the build or API URL', () => {
  const { createScriptFallback } = require('../lib/replay-session');
  const script = {
    ...capture(item),
    method: 'GET',
    url: 'https://example.test/index.html.js?2611052039:1794203422496',
    requestBody: '',
    status: 200,
    response: { headers: { 'content-type': 'application/javascript' }, body: 'YQ==' }
  };
  const find = createScriptFallback([script]);
  expect(find('https://example.test/index.html.js?2611052039:1794203423553')).toBe(script);
  expect(find('https://example.test/index.html.js?2611052040:1794203423553')).toBeUndefined();
  expect(find('https://example.test/index.html.js?sid=1794203423553')).toBeUndefined();
  expect(find('https://example.test/api/order?2611052039:1794203423553')).toBeUndefined();
  const sdk = { ...script, url: 'https://example.test/sdk.js?v' + (1794203422496).toString(36) };
  expect(createScriptFallback([sdk])('https://example.test/sdk.js?v' + (1794203423553).toString(36))).toBe(sdk);
  const conflicting = { ...script, response: { ...script.response, body: 'Yg==' } };
  expect(createScriptFallback([script, conflicting])('https://example.test/index.html.js?2611052039:1794203423553')).toBeNull();
});

test('cookie overrides are scoped to the entry host and preserve values containing equals signs', () => {
  const { replayCookies } = require('../lib/replay-session');
  const entry = 'https://capture.example.test/orders#/detail';
  expect(replayCookies('Cookie: token=a=b==; token=other; view=mobile', entry)).toEqual([
    { name: 'token', value: 'a=b==', url: 'https://capture.example.test/' },
    { name: 'view', value: 'mobile', url: 'https://capture.example.test/' }
  ]);
  expect(replayCookies('', entry)).toEqual([]);
  expect(() => replayCookies('token=a\r\nX-Test: b', entry)).toThrow('Cookie');
});

test('matches a regenerated trace ID without changing business values or replay order', () => {
  const { createReplayMatcher } = require('../lib/replay-match');
  const body = (trace, order = '9007199254740992') => Buffer.from(
    `{"traceId":"${trace}","orderSerialNo":${order},"keys":["policy"]}`
  ).toString('base64');
  const url = new URL(item.url);
  const first = { ...capture(item), requestBody: body('T179420341663500') };
  const second = { ...first, id: '101-2', startTime: 101, status: 200, requestBody: body('T179420341663501') };
  const match = createReplayMatcher([second, first]);
  expect(match('POST', url, body('T179420341663599', '9007199254740993'), 'xhr').reason).toContain('参数不同');
  expect(match('POST', url, body('T179420341663599'), 'xhr').entry.status).toBe(500);
  expect(match('POST', url, second.requestBody, 'xhr').entry.status).toBe(200);
  expect(match('POST', url, first.requestBody, 'xhr').reason).toContain('已用完');

  const get = { ...first, method: 'GET', requestBody: '',
    url: url.href + '?traceId=T179420341663500&sid=order-a' };
  const queryMatch = createReplayMatcher([get]);
  expect(queryMatch('GET', new URL(get.url.replace('order-a', 'order-b')), '', 'xhr').entry).toBeUndefined();
  expect(queryMatch('GET', new URL(get.url.replace('500&', '599&')), '', 'xhr').entry).toBe(get);
});

test('rewrites only a recorded JSONP wrapper and preserves other query parameters and response data', () => {
  const { createReplayMatcher } = require('../lib/replay-match');
  const url = 'https://example.test/config?url=page-a&callback=oldFn';
  const row = { ...capture(item), method: 'GET', url, requestBody: '', status: 200,
    response: { body: Buffer.from('oldFn({"value":"oldFn"})').toString('base64') } };
  const match = createReplayMatcher([row]);
  const updated = new URL(url.replace('oldFn', 'newFn'));
  expect(match('GET', updated, '', 'xhr').entry).toBeUndefined();
  expect(match('GET', new URL(updated.href.replace('page-a', 'page-b')), '', 'script').entry).toBeUndefined();
  expect(Buffer.from(match('GET', updated, '', 'script').entry.response.body, 'base64').toString())
    .toBe('newFn({"value":"oldFn"})');
  expect(match('GET', new URL(url), '', 'script').reason).toContain('已用完');
});

test('auto-captures linked resources for the selected device without admitting the entire CDN', () => {
  const { createCaptureScope } = require('../ui/src/utils/network/replay-capture');
  const entryUrl = 'https://example.test/orders/#/detail';
  const scope = createCaptureScope(entryUrl);
  const hosts = new Set([host]);
  const row = (url, headers, device = ip) => ({
    ...item, url, req: { ip: device, method: 'GET', headers },
    res: { statusCode: 200, body: 'asset' }
  });
  const accept = item => captureRow(item, null, hosts, ip, scope);

  const css = row('https://cdn.example.test/style.css', { Referer: 'https://example.test/' });
  const accepted = accept(css);
  expect(accepted).not.toBeNull();
  scope.remember(css, accepted);
  expect(accept(row('https://fonts.example.test/font.woff2', { referer: css.url }))).not.toBeNull();
  expect(accept(row('https://api.example.test/orders', { origin: 'https://example.test' }))).not.toBeNull();
  expect(accept(row('https://cdn.example.test/unrelated.js', {}))).toBeNull();
  expect(accept(row('https://api.example.test/other', { referer: 'https://example.test/other-page' }))).toBeNull();
  expect(accept(row('https://api.example.test/another-device', { referer: entryUrl }, '192.168.1.21'))).toBeNull();

  const redirect = row('https://example.test/orders/', {});
  redirect.res = { statusCode: 302, headers: { Location: 'https://next.example.test/entry' } };
  scope.remember(redirect, accept(redirect));
  expect(accept(row('https://next.example.test/entry', {}))).not.toBeNull();
});
