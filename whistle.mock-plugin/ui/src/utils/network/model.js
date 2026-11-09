// Keep only metadata in the list; response bodies are loaded for one selected session.
const MAX_ROWS = 500;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const header = (headers = {}, name) => Object.entries(headers || {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] || '';
const summarize = item => {
  const row = { id: item.id };
  for (const key of ['url', 'startTime', 'endTime', 'requestTime', 'responseTime', 'reqError', 'resError']) {
    if (item[key] !== undefined) row[key] = item[key];
  }
  if (item.req?.method) row.method = item.req.method;
  if (item.res?.statusCode !== undefined) row.status = item.res.statusCode;
  if (item.res?.size !== undefined) row.size = item.res.size;
  const type = header(item.res?.headers, 'content-type');
  if (type) row.contentType = type;
  return row;
};
const mergeRows = (oldRows, incoming, limit = MAX_ROWS) => {
  const rows = new Map(oldRows.map(row => [row.id, row]));
  for (const row of incoming) if (row?.id) rows.set(row.id, { ...rows.get(row.id), ...row });
  return [...rows.values()].sort((a, b) => (b.startTime || 0) - (a.startTime || 0) || String(b.id).localeCompare(String(a.id))).slice(0, limit);
};
const decodeBody = (part = {}, method = '') => {
  part = part || {};
  const type = String(header(part.headers, 'content-type'));
  const result = { text: '', available: false, reason: '', contentType: type };
  const mime = type.split(';')[0].trim().toLowerCase();
  if (mime && !(/^text\//.test(mime) || /json|xml|javascript|x-www-form-urlencoded|graphql/.test(mime))) {
    return { ...result, reason: '二进制或不支持的内容类型，请在 Whistle 中查看或下载。' };
  }
  let bytes;
  try {
    if (typeof part.base64 === 'string' && part.base64.length) {
      if (part.base64.length > Math.ceil(MAX_BODY_BYTES * 4 / 3) + 4) return { ...result, reason: '内容超过 5 MB，请在 Whistle 中查看或下载。' };
      bytes = Uint8Array.from(atob(part.base64), char => char.charCodeAt(0));
    } else if (part.body?.type === 'Buffer' && Array.isArray(part.body.data)) {
      if (part.body.data.length > MAX_BODY_BYTES) return { ...result, reason: '内容超过 5 MB，请在 Whistle 中查看或下载。' };
      bytes = Uint8Array.from(part.body.data);
    } else if (typeof part.body === 'string') {
      bytes = new TextEncoder().encode(part.body);
    } else {
      bytes = new Uint8Array();
    }
    if (bytes.length > MAX_BODY_BYTES) return { ...result, reason: '内容超过 5 MB，请在 Whistle 中查看或下载。' };
    if (part.hasGzipError) return { ...result, reason: 'Whistle 解压响应失败，无法确认内容完整。' };
    const expected = Number(part.unzipSize ?? part.size ?? 0);
    const noBody = method === 'HEAD' || [204, 304].includes(Number(part.statusCode));
    if (!noBody && expected > 0 && bytes.length === 0) return { ...result, reason: 'Whistle 未保留此请求/响应体，可能被清除或超过抓包大小限制。' };
    if (!noBody && expected > bytes.length && (part.unzipSize !== undefined || !header(part.headers, 'content-encoding'))) {
      return { ...result, reason: '捕获内容不完整，不能作为完整 Mock 保存。' };
    }
    const charset = /charset\s*=\s*["']?([^;\s"']+)/i.exec(type)?.[1] || 'utf-8';
    const text = typeof part.body === 'string' && !part.base64 ? part.body : new TextDecoder(charset, { fatal: true }).decode(bytes);
    if (/[\x00-\x08\x0e-\x1f]/.test(text)) return { ...result, reason: '包含二进制数据，不能作为文本 Mock 保存。' };
    return { ...result, available: true, text };
  } catch (e) {
    return { ...result, reason: '内容编码无效或暂不支持，不能按文本导入。' };
  }
};
const sessionDetail = session => {
  const request = decodeBody(session.req), response = decodeBody(session.res, session.req?.method);
  const http = /^https?:\/\//i.test(session.url || '') && session.req?.method !== 'CONNECT';
  const code = Number(session.res?.statusCode);
  const validStatus = code >= 200 && code <= 599;
  const completed = !!session.endTime && !session.resError && !session.reqError;
  return { session, request, response, canSave: http && validStatus && completed && response.available,
    reason: !http || code === 101 ? '当前仅支持 HTTP/HTTPS 文本响应转为 Mock。' : !completed ? '请求尚未结束或发生传输错误，请等待或刷新详情。' : !validStatus ? '没有可用的 HTTP 响应状态，无法转为 Mock。' : response.reason };

};
module.exports = { MAX_ROWS, MAX_BODY_BYTES, header, summarize, mergeRows, decodeBody, sessionDetail };
