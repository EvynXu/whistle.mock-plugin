const { header } = require('./model');
const { httpUrl, replayHeaders, requestKey, strongCacheTag } = require('../../../../lib/replay-session');

const MAX_BODY = 5 * 1024 * 1024;
const DETAIL_HEADERS = /^(accept(?:-encoding|-language)?|cache-control|content-(?:encoding|length|range|type)|date|etag|expires|if-modified-since|if-none-match|last-modified|origin|pragma|sec-fetch-[a-z-]+|server|user-agent|vary)$/i;

function detailHeaders(headers) {
  return Object.fromEntries(Object.entries(headers || {}).flatMap(([name, value]) => {
    const text = Array.isArray(value) ? value.join(', ') : value;
    return DETAIL_HEADERS.test(name) && typeof text === 'string' && text.length <= 1024 ? [[name.toLowerCase(), text]] : [];
  }));
}

function matchesCapturedRequest(item, row, ip) {
  if (item?.id !== row.id || item.startTime !== row.startTime || (ip && item.req?.ip !== ip) ||
      (item.req?.method && item.req.method !== row.method)) return false;
  try {
    return requestKey(row.method, item.url, '') === requestKey(row.method, row.url, '');
  } catch {
    return false;
  }
}

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
  if (hosts && !hosts.has(url.hostname) && !scope?.includes(item, url)) return null;
  const method = req.method || previous?.method;
  if (!method || !/^[A-Z]+$/.test(method) || method === 'CONNECT') return null;
  const status = Number(res.statusCode) || null;
  const failure = item.reqError || item.resError;
  const duration = Math.max(0, (item.endTime || item.responseTime || item.startTime) - item.startTime);
  const record = { id: item.id, url: url.href, method, status, startTime: item.startTime, duration,
    outcome: 'pending', requestBody: null, response: null };
  const destination = header(req.headers, 'sec-fetch-dest');
  const mode = header(req.headers, 'sec-fetch-mode');
  record.document = destination ? destination === 'document' : mode ? mode === 'navigate' : previous?.document;
  if (!item.endTime && !failure) return record;
  record.requestHeaders = detailHeaders(req.headers);
  record.responseHeaders = detailHeaders(res.headers);
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
  if (method === 'GET' && (status === 200 || status === 304) && String(header(res.headers, 'vary')).trim() !== '*') {
    const etag = header(res.headers, 'etag');
    const cacheTag = strongCacheTag(etag || (status === 304 && header(req.headers, 'if-none-match')));
    if (cacheTag) record.cacheTag = cacheTag;
  }
  return record;
}

function isCachedReplayDocument(row) {
  return row.method === 'GET' && row.status === 304 && row.document !== false &&
    (row.document === true || /^(text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(header(row.response?.headers, 'content-type')));
}

function isReplayDocument(row) {
  return row.method === 'GET' && row.requestBody === '' && row.document !== false &&
    row.outcome === 'response' && !!row.response?.body && (row.status < 300 || row.status >= 400) &&
    /^(text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(header(row.response.headers, 'content-type'));
}

module.exports = { captureRow, createCaptureScope, isReplayDocument, isCachedReplayDocument, matchesCapturedRequest };
