const { header } = require('./model');
const { httpUrl, replayHeaders } = require('../../../../lib/replay-session');

const MAX_BODY = 5 * 1024 * 1024;

function capturedBody(part, empty = false) {
  if (empty) return '';
  if (!part || part.hasGzipError) return null;
  try {
    const expected = Number(part.unzipSize ?? part.size ?? header(part.headers, 'content-length') ?? 0);
    if (expected > MAX_BODY) return null;
    let bytes = '';
    if (part.base64) {
      if (typeof part.base64 !== 'string' || part.base64.length > Math.ceil(MAX_BODY / 3) * 4) return null;
      bytes = atob(part.base64);
    } else if (part.body?.type === 'Buffer' && Array.isArray(part.body.data)) {
      if (part.body.data.length > MAX_BODY) return null;
      bytes = Array.from(part.body.data, value => String.fromCharCode(value)).join('');
    } else if (typeof part.body === 'string') {
      if (part.body.length > MAX_BODY) return null;
      bytes = Array.from(new TextEncoder().encode(part.body), value => String.fromCharCode(value)).join('');
    }
    return bytes.length <= MAX_BODY && bytes.length >= expected ? btoa(bytes) : null;
  } catch {
    return null;
  }
}

function relatedUrl(value, base) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = httpUrl(base ? new URL(value, base).href : value);
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

function createCaptureScope(entryUrl) {
  const entry = relatedUrl(entryUrl);
  const sources = new Set([entry.href]);
  const documentOrigins = new Set([entry.origin]);

  return {
    includes(item, url) {
      const headers = item.req?.headers;
      const referrer = relatedUrl(header(headers, 'referer'));
      const origin = relatedUrl(header(headers, 'origin'));
      return sources.has(url.href) ||
        (origin && documentOrigins.has(origin.origin)) ||
        (referrer && (sources.has(referrer.href) ||
          (referrer.pathname === '/' && !referrer.search && documentOrigins.has(referrer.origin))));
    },
    remember(item, row) {
      const url = relatedUrl(row.url);
      sources.add(url.href);
      if (['document', 'iframe', 'frame'].includes(header(item.req?.headers, 'sec-fetch-dest'))) {
        documentOrigins.add(url.origin);
      }
      if (row.status >= 300 && row.status < 400) {
        const target = relatedUrl(header(item.res?.headers, 'location'), url);
        if (target) sources.add(target.href);
      }
    }
  };
}

function captureRow(item, previous, hosts, ip, scope) {
  const req = item.req || {};
  const res = item.res || {};
  if (!item.id || !Number.isFinite(item.startTime) || req.ip !== ip) return null;
  let url;
  try { url = httpUrl(item.url); } catch { return null; }
  if (!hosts.has(url.hostname) && !scope?.includes(item, url)) return null;
  const method = req.method || previous?.method;
  if (!method || !/^[A-Z]+$/.test(method) || method === 'CONNECT') return null;
  const status = Number(res.statusCode) || null;
  const failure = item.reqError || item.resError;
  const duration = Math.max(0, (item.endTime || item.responseTime || item.startTime) - item.startTime);
  const record = { id: item.id, url: url.href, method, status, startTime: item.startTime, duration,
    outcome: 'pending', requestBody: null, response: null };
  if (!item.endTime && !failure) return record;
  record.requestBody = capturedBody(req);
  record.requestType = String(header(req.headers, 'content-type'));
  if (failure) {
    record.outcome = 'network-error';
    return record;
  }
  const noBody = method === 'HEAD' || [204, 205, 304].includes(status);
  const body = capturedBody(res, noBody);
  if (!Number.isInteger(status) || status < 200 || status > 599 || body === null ||
      String(header(res.headers, 'content-type')).includes('text/event-stream')) {
    record.outcome = 'incomplete';
    return record;
  }
  record.outcome = record.requestBody === null ? 'incomplete' : 'response';
  record.response = { headers: replayHeaders(res.headers), body };
  return record;
}

module.exports = { captureRow, createCaptureScope };
