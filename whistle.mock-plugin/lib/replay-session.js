const MAX_RECORDS = 250;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const BODY_BUDGET = 18 * 1024 * 1024;

function httpUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('请输入不带账号密码的 HTTP/HTTPS 地址');
  }
  return url;
}

function requestKey(method, address, body) {
  const url = httpUrl(address);
  url.hash = '';
  return JSON.stringify([method.toUpperCase(), url.href, body]);
}

const RESPONSE_HEADERS = /^(content-type|content-range|location|content-security-policy|cross-origin-(resource|embedder|opener)-policy|access-control-[a-z-]+|timing-allow-origin|x-content-type-options)$/;

function replayHeaders(headers) {
  return Object.fromEntries(Object.entries(headers || {}).flatMap(([name, value]) => {
    const key = name.toLowerCase();
    if (!RESPONSE_HEADERS.test(key) || (typeof value !== 'string' && !Array.isArray(value))) return [];
    const text = Array.isArray(value) ? value.join(', ') : value;
    return /^[^\r\n\0]*$/.test(text) ? [[key, text]] : [];
  }));
}

function parseSession(input) {
  const session = typeof input === 'string' ? JSON.parse(input) : input;
  if (session?.version !== 1 || typeof session.entryUrl !== 'string' ||
      !Array.isArray(session.records) || session.records.length > MAX_RECORDS ||
      !Number.isFinite(session.startedAt)) {
    throw new Error('无法识别此复现会话文件');
  }
  httpUrl(session.entryUrl);
  for (const record of session.records) {
    if (!record || typeof record.id !== 'string' || typeof record.method !== 'string' ||
        !/^[A-Z]+$/.test(record.method) || !Number.isFinite(record.startTime) ||
        !Number.isFinite(record.duration) || record.duration < 0 ||
        typeof record.url !== 'string' || typeof record.outcome !== 'string' ||
        (record.requestBody !== null && typeof record.requestBody !== 'string')) {
      throw new Error('会话中的请求记录格式有误');
    }
    httpUrl(record.url);
    if (record.response && (typeof record.response.body !== 'string' ||
        !Number.isInteger(record.status) || record.status < 200 || record.status > 599)) {
      throw new Error('会话中的响应格式有误');
    }
  }
  return session;
}

function replayCookies(header, address) {
  if (header === undefined || header === '') return [];
  if (typeof header !== 'string' || header.length > 16384 || /[\r\n\0]/.test(header)) {
    throw new Error('请输入一行有效的 Cookie 请求头。');
  }
  const origin = httpUrl(address).origin + '/';
  const cookies = new Map();
  for (const pair of header.trim().replace(/^Cookie:\s*/i, '').split(';')) {
    if (!pair.trim()) continue;
    const separator = pair.indexOf('=');
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim().replace(/^"([^"]*)"$/, '$1');
    if (separator < 1 || !/^[!#$%&'*+.^_`|~0-9a-z-]+$/i.test(name) ||
        !/^[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]*$/.test(value)) {
      throw new Error('Cookie 格式有误，请复制请求头里的 Cookie 值。');
    }
    // An existing header can list the same name for different paths, most specific first.
    if (!cookies.has(name)) cookies.set(name, { name, value, url: origin });
  }
  return [...cookies.values()];
}

function assertReplayEntry(session) {
  const entry = createReplayQueue(session.records)('GET', session.entryUrl, '');
  if (!entry?.response || entry.outcome !== 'response' || entry.status === 304) {
    throw new Error('入口 HTML 未完整录到，请重新抓取页面后再复现。');
  }
}

// Some boot scripts append a new millisecond timestamp to a fixed build ID.
function scriptCacheKey(address) {
  const url = httpUrl(address);
  if (!/\.m?js$/i.test(url.pathname)) return null;
  const build = /^\?(\d{6,}):\d{13}$/.exec(url.search);
  if (build) return url.origin + url.pathname + '?' + build[1];
  const encodedTime = /^\?v([0-9a-z]{8})$/.exec(url.search);
  if (encodedTime) {
    const time = parseInt(encodedTime[1], 36);
    if (time >= Date.UTC(2020, 0, 1) && time < Date.UTC(2100, 0, 1)) {
      return url.origin + url.pathname + '?v[timestamp]';
    }
  }
  const params = [...url.searchParams];
  if (params.length === 1 && /^(?:_|_t|t|timestamp)$/.test(params[0][0]) &&
      /^\d{13}$/.test(params[0][1])) return url.origin + url.pathname + '?' + params[0][0];
  return null;
}

function createScriptFallback(records) {
  const scripts = new Map();
  for (const row of records) {
    if (row.method !== 'GET' || row.requestBody !== '' || row.outcome !== 'response' ||
        row.status !== 200 || !row.response ||
        !/javascript|ecmascript/i.test(row.response.headers?.['content-type'] || '')) continue;
    const key = scriptCacheKey(row.url);
    if (!key) continue;
    if (!scripts.has(key)) scripts.set(key, row);
    else {
      const previous = scripts.get(key);
      if (previous && (previous.response.body !== row.response.body ||
        JSON.stringify(previous.response.headers) !== JSON.stringify(row.response.headers))) scripts.set(key, null);
    }
  }
  return url => scripts.get(scriptCacheKey(url));
}

function createReplayQueue(records) {
  const queues = new Map();
  for (const row of [...records].sort((a, b) => a.startTime - b.startTime ||
    a.id.localeCompare(b.id, undefined, { numeric: true }))) {
    if (row.requestBody === null) continue;
    const key = requestKey(row.method, row.url, row.requestBody);
    if (!queues.has(key)) queues.set(key, []);
    queues.get(key).push(row);
  }
  return (method, url, body) => queues.get(requestKey(method, url, body))?.shift();
}

module.exports = { MAX_RECORDS, MAX_FILE_BYTES, BODY_BUDGET, httpUrl, requestKey, replayHeaders, parseSession, assertReplayEntry, createReplayQueue, createScriptFallback, replayCookies };
