const { requestKey } = require('./replay-session');

const TRACE_ID = /^T\d{15,17}$/;
const CALLBACK = /^[a-z_$][\w$]*$/i;
const utf8 = new TextDecoder('utf-8', { fatal: true });
const PARAMETER_MISMATCH = '已录到同一接口，但请求参数不同';
const MISSING_REQUEST = '会话里没有录到这条请求';

function endpointKey(method, url) {
  return method + ' ' + url.origin + url.pathname;
}

function replayMatchScope(method, address, type) {
  return JSON.stringify([endpointKey(method, new URL(address)), type]);
}

// Keep the exact JSON tokens for business fields, including large numbers.
function bodyWithoutTrace(body) {
  if (!body || body.length > 350000) return null;
  try {
    const text = utf8.decode(Buffer.from(body, 'base64'));
    if (!/^\s*\{/.test(text) || !text.includes('traceId')) return null;
    JSON.parse(text);
    const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}\[\],:]|[^\s{}\[\],:"]+/g);
    let depth = 0;
    let traceIndex = -1;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === '{' || token === '[') depth++;
      else if (token === '}' || token === ']') depth--;
      else if (depth === 1 && token.startsWith('"') && tokens[i + 1] === ':' &&
          JSON.parse(token) === 'traceId') {
        if (traceIndex !== -1 || !/^"T\d{15,17}"$/.test(tokens[i + 2])) return null;
        traceIndex = i + 2;
      }
    }
    if (traceIndex === -1) return null;
    // An empty token is distinct from every valid JSON value.
    tokens[traceIndex] = '';
    return tokens.join('');
  } catch {
    return null;
  }
}

function normalize(method, url, body, jsonp) {
  let changed = false;
  const traces = url.searchParams.getAll('traceId');
  const callbacks = url.searchParams.getAll('callback');
  const callback = jsonp && callbacks.length === 1 && CALLBACK.test(callbacks[0]) ? callbacks[0] : null;
  const query = url.search.slice(1).split('&').map(part => {
    const key = part.split('=', 1)[0];
    if ((key === 'traceId' && traces.length === 1 && TRACE_ID.test(traces[0])) ||
        (key === 'callback' && callback)) {
      changed = true;
      return [key];
    }
    return part;
  });
  const normalizedBody = method === 'POST' ? bodyWithoutTrace(body) : null;
  if (!changed && normalizedBody === null) return null;
  return {
    key: JSON.stringify([method, url.origin, url.pathname, query, normalizedBody === null ? body : [normalizedBody]]),
    callback
  };
}

function readJsonp(row, url) {
  const callbacks = url.searchParams.getAll('callback');
  const callback = callbacks[0];
  if (row.method !== 'GET' || row.requestBody !== '' || row.outcome !== 'response' || row.status !== 200 ||
      !row.response || callbacks.length !== 1 || !CALLBACK.test(callback)) return null;
  try {
    const source = utf8.decode(Buffer.from(row.response.body, 'base64'));
    const wrapper = /^(\s*)([a-z_$][\w$]*)(\s*\()/i.exec(source);
    return wrapper?.[2] === callback ? { source, callback, offset: wrapper[1].length } : null;
  } catch {
    return null;
  }
}

function describeFields(label, names) {
  const visible = names.filter(name => /^[\w.-]{1,64}$/.test(name)).slice(0, 6);
  return visible.length ? `${label}字段 ${visible.join('、')}${visible.length < names.length ? ' 等' : ''} 不同` : `${label}内容不同`;
}

function describeMismatch(record, url, body) {
  const details = [];
  const recorded = new URL(record.url);
  if (recorded.search !== url.search) {
    const names = [...new Set([...recorded.searchParams.keys(), ...url.searchParams.keys()])];
    details.push(describeFields('查询参数', names.filter(name =>
      JSON.stringify(recorded.searchParams.getAll(name)) !== JSON.stringify(url.searchParams.getAll(name)))));
  }
  if (record.requestBody !== body) {
    let names = [];
    if (record.requestBody.length <= 350000 && body.length <= 350000) {
      try {
        const previous = JSON.parse(utf8.decode(Buffer.from(record.requestBody, 'base64')));
        const current = JSON.parse(utf8.decode(Buffer.from(body, 'base64')));
        if (previous && current && typeof previous === 'object' && typeof current === 'object' &&
            !Array.isArray(previous) && !Array.isArray(current)) {
          names = [...new Set([...Object.keys(previous), ...Object.keys(current)])].filter(name =>
            JSON.stringify(previous[name]) !== JSON.stringify(current[name]));
        }
      } catch {
        // Other body formats are reported without exposing their contents.
      }
    }
    details.push(describeFields('请求体', names));
  }
  return details.join('，');
}

function withJsonpCallback({ row, jsonp }, newCallback) {
  if (!newCallback || !jsonp || newCallback === jsonp.callback) return row;
  const { source, callback, offset } = jsonp;
  const text = source.slice(0, offset) + newCallback + source.slice(offset + callback.length);
  return { ...row, response: { ...row.response, body: Buffer.from(text).toString('base64') } };
}

function createReplayMatcher(records, overrides = new Map()) {
  const exact = new Map();
  const normalized = new Map();
  const paths = new Map();
  const usableResponses = new Map();
  const ordered = [...records].sort((a, b) => a.startTime - b.startTime ||
    a.id.localeCompare(b.id, undefined, { numeric: true }));
  function add(map, key, item) {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  for (const row of ordered) {
    const url = new URL(row.url);
    const path = endpointKey(row.method, url);
    if (paths.get(path)?.requestBody == null) paths.set(path, row);
    const jsonp = readJsonp(row, url);
    const item = { row, jsonp, used: false };
    if (row.outcome === 'response' && row.response && row.status !== 304) add(usableResponses, path, item);
    if (row.requestBody === null) continue;
    add(exact, requestKey(row.method, row.url, row.requestBody), item);
    const key = normalize(row.method, url, row.requestBody, !!jsonp);
    if (key) add(normalized, key.key, item);
  }
  return (method, url, body, type) => {
    const literal = exact.get(requestKey(method, url.href, body));
    const item = literal?.find(candidate => !candidate.used);
    if (item) {
      item.used = true;
      return { entry: item.row };
    }
    // A callback can only be renamed for a script load and a known JSONP wrapper.
    const keys = [normalize(method, url, body, false)];
    if (type === 'script' && method === 'GET') keys.unshift(normalize(method, url, body, true));
    let exhausted = !!literal;
    for (const key of keys) {
      if (!key) continue;
      const candidates = normalized.get(key.key);
      exhausted ||= !!candidates;
      const match = candidates?.find(candidate => !candidate.used);
      if (!match) continue;
      match.used = true;
      return { entry: withJsonpCallback(match, key.callback) };
    }
    if (exhausted) return { reason: '录制的响应已用完' };
    const path = endpointKey(method, url);
    const recorded = paths.get(path);
    if (!recorded) return { reason: MISSING_REQUEST };
    if (recorded.requestBody === null) return { reason: '已录到同一接口，但请求体未完整录到' };
    const candidates = usableResponses.get(path) || [];
    const selection = overrides.get(replayMatchScope(method, url, type));
    const approved = candidates.find(candidate => candidate.row.id === selection);
    if (approved) {
      const callback = type === 'script' ? normalize(method, url, body, true)?.callback : null;
      return { entry: withJsonpCallback(approved, callback) };
    }
    return { reason: PARAMETER_MISMATCH, detail: describeMismatch(recorded, url, body),
      candidateIds: candidates.map(candidate => candidate.row.id) };
  };
}

module.exports = { createReplayMatcher, replayMatchScope, PARAMETER_MISMATCH, MISSING_REQUEST };
