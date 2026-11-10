const { captureRow, isCachedReplayDocument, isReplayDocument } = require('../ui/src/utils/network/replay-capture');
const { assertReplayEntry, createReplayQueue, parseSession, restoreCachedReplay } = require('../lib/replay-session');

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

test('discovers a complete document without a known URL, retaining its query', () => {
  const document = {
    ...item, url: 'https://different.example.test/page?sid=captured',
    req: { ip, method: 'GET', headers: { 'sec-fetch-dest': 'document' } },
    res: { statusCode: 200, body: '<html></html>', headers: { 'content-type': 'text/html; charset=utf-8' } }
  };
  const row = captureRow(document, null, null, ip);
  expect(row.url).toBe(document.url);
  expect(isReplayDocument(row)).toBe(true);
  expect(isReplayDocument(captureRow({ ...document, endTime: undefined }, null, null, ip))).toBe(false);
  expect(isReplayDocument(captureRow({ ...document, req: { ...document.req, headers: { 'sec-fetch-dest': 'iframe' } } }, null, null, ip))).toBe(false);
  expect(captureRow(document, null, null, '192.168.1.21')).toBeNull();
});

test('diagnoses a parameter mismatch without reusing the response or reporting parameter values', () => {
  const { createReplayMatcher } = require('../lib/replay-match');
  const row = { ...capture(item), url: item.url + '?page=1' };
  const match = createReplayMatcher([row]);
  const mismatch = match('POST', new URL(item.url + '?page=2'), Buffer.from('{"id":"different-order"}').toString('base64'), 'xhr');
  expect(mismatch).toEqual({ reason: '已录到同一接口，但请求参数不同', detail: '查询参数字段 page 不同，请求体字段 id 不同', candidateIds: [row.id] });
  expect(match('POST', new URL(row.url), row.requestBody, 'xhr').entry).toBe(row);
});

test('reuses only the selected captured response on a scoped parameter mismatch while the exception is active', () => {
  const { createReplayMatcher, replayMatchScope } = require('../lib/replay-match');
  const first = capture(item);
  const second = { ...first, id: '101-2', status: 200, requestBody: Buffer.from('{"id":2}').toString('base64') };
  const incomplete = { ...first, id: '102-3', outcome: 'incomplete', requestBody: null, response: null };
  const overrides = new Map();
  const match = createReplayMatcher([first, second, incomplete], overrides);
  const url = new URL(item.url);
  const live = value => Buffer.from(JSON.stringify({ sessionId: value })).toString('base64');
  const scope = replayMatchScope('POST', url, 'xhr');

  expect(match('POST', url, live('a'), 'xhr').candidateIds).toEqual([first.id, second.id]);
  overrides.set(scope, second.id);
  expect(match('POST', url, live('a'), 'xhr').entry).toBe(second);
  expect(match('POST', new URL(url.href + '?t=123'), live('b'), 'xhr').entry).toBe(second);
  expect(match('POST', url, live('a'), 'fetch').entry).toBeUndefined();
  expect(match('POST', new URL(url.href + '/other'), live('a'), 'xhr').entry).toBeUndefined();
  expect(match('GET', url, '', 'xhr').entry).toBeUndefined();
  expect(match('POST', url, first.requestBody, 'xhr').entry).toBe(first);
  expect(match('POST', url, second.requestBody, 'xhr').entry).toBe(second);
  expect(match('POST', url, second.requestBody, 'xhr').reason).toContain('已用完');
  overrides.delete(scope);
  expect(match('POST', url, live('a'), 'xhr').entry).toBeUndefined();
});

test('restores a 304 document only from a complete 200 with the same URL and strong validator', () => {
  const url = 'https://example.test/page?sid=a';
  const document = { ...item, url, req: { ip, method: 'GET', headers: { 'sec-fetch-dest': 'document' } } };
  const fresh = capture({ ...document, res: { statusCode: 200, body: '<html>saved</html>', headers: {
    'content-type': 'text/html', etag: '"build-1"'
  } } });
  const cached = capture({ ...document, id: '101-2', req: { ...document.req, headers: {
    ...document.req.headers, 'if-none-match': '"build-1"'
  } }, res: { statusCode: 304, headers: {} } });
  expect(isCachedReplayDocument(cached)).toBe(true);
  expect(cached.response.body).toBe('');
  const session = { entryUrl: url + '#/detail', records: [cached] };
  expect(() => assertReplayEntry(session)).toThrow('入口返回 304');
  const [restored] = restoreCachedReplay(session.records, [fresh]);
  expect(restored).toMatchObject({ id: cached.id, status: 200, restored304: true, response: fresh.response });
  expect(() => assertReplayEntry({ ...session, records: [restored] })).not.toThrow();
  for (const source of [{ ...fresh, url: url.replace('sid=a', 'sid=b') }, { ...fresh, cacheTag: '"build-2"' }, { ...fresh, cacheTag: 'W/"build-1"' }]) {
    expect(restoreCachedReplay([cached], [source])[0]).toBe(cached);
  }
  expect(restoreCachedReplay([cached], [fresh, { ...fresh, response: { ...fresh.response, body: 'YQ==' } }])[0]).toBe(cached);
});

test('fetches selected missing resources directly while serving captured assets and preserving other diagnostics', async () => {
  const { parseDirectReplayTypes } = require('../lib/replay-session');
  expect(parseDirectReplayTypes()).toEqual([]);
  expect(() => parseDirectReplayTypes(['fetch'])).toThrow('无法识别直连的资源类型');

  const fetchResource = jest.spyOn(require('../lib/replay-assets'), 'fetchReplayResource')
    .mockResolvedValueOnce({ status: 200, outcome: 'response', response: { headers: { 'content-type': 'image/jpeg' }, body: 'YWJj' } })
    .mockRejectedValueOnce(new Error('直连返回 HTTP 404'));
  const { installReplay } = require('../scripts/replay-session');
  let handle;
  const context = {
    once: jest.fn(),
    routeWebSocket: jest.fn(),
    route: (_, handler) => { handle = handler; }
  };
  const diagnostics = jest.fn();
  const origin = 'https://example.test';
  const saved = {
    ...capture(item), method: 'GET', requestBody: '', url: origin + '/recorded.png', status: 200
  };
  const cached = { ...saved, id: '101-2', url: origin + '/cached.png', status: 304 };
  const entry = { ...saved, id: 'entry', url: origin + '/' };
  const directTypes = ['jpg', 'png', 'js'];
  await installReplay(context, { entryUrl: entry.url, records: [saved, cached, entry] }, () => {}, diagnostics, new Map(), directTypes);

  async function request(path, type) {
    const route = {
      request: () => ({
        url: () => origin + path, resourceType: () => type, method: () => 'GET',
        postDataBuffer: () => null, redirectedFrom: () => null, isNavigationRequest: () => type === 'document',
        frame: () => ({ parentFrame: () => null }),
        headers: () => ({ origin, cookie: 'sid=private', authorization: 'Bearer private' })
      }),
      fulfill: jest.fn(), abort: jest.fn()
    };
    await handle(route);
    return route;
  }

  expect((await request('/recorded.png', 'image')).fulfill).toHaveBeenCalledWith(expect.objectContaining({ status: 200 }));
  expect((await request('/missing.JPEG?size=1', 'image')).fulfill).toHaveBeenCalledWith({
    status: 200, headers: { 'content-type': 'image/jpeg' }, body: Buffer.from('abc')
  });
  expect((await request('/extensionless', 'script')).abort).toHaveBeenCalled();
  expect((await request('/style.css', 'stylesheet')).abort).toHaveBeenCalled();
  expect((await request('/api.png', 'fetch')).abort).toHaveBeenCalled();
  expect((await request('/cached.png', 'image')).abort).toHaveBeenCalled();
  expect(fetchResource.mock.calls.map(([asset]) => asset)).toEqual([
    { url: origin + '/missing.JPEG?size=1', type: 'image', origin },
    { url: origin + '/extensionless', type: 'script', origin }
  ]);
  expect(diagnostics.mock.calls.map(([event]) => event.liveResource || event.blocked.url)).toEqual([
    'jpg', origin + '/extensionless', origin + '/style.css', origin + '/api.png', origin + '/cached.png'
  ]);
  expect(diagnostics).toHaveBeenCalledWith(expect.objectContaining({
    blocked: expect.objectContaining({ reason: '静态资源直连失败', detail: '直连返回 HTTP 404' })
  }));
  directTypes.splice(0, directTypes.length, 'css');
  expect((await request('/style.css', 'stylesheet')).abort).toHaveBeenCalled();
  await request('/', 'document');
  fetchResource.mockResolvedValueOnce({ status: 200, outcome: 'response', response: { headers: { 'content-type': 'text/css' }, body: 'YWJj' } });
  expect((await request('/style.css', 'stylesheet')).fulfill).toHaveBeenCalled();
  expect((await request('/missing.JPEG?size=1', 'image')).abort).toHaveBeenCalled();
  expect(diagnostics).toHaveBeenCalledWith({ reset: true, directTypes: ['css'], entryUrl: entry.url });
  fetchResource.mockRestore();
});
