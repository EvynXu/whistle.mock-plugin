import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'antd';
import CapturedRequestDetails from './CapturedRequestDetails';
import { fetchSessions } from '../utils/network/client';
import { header } from '../utils/network/model';
import { matchesCapturedRequest } from '../utils/network/replay-capture';

function bodySize(data) {
  if (typeof data !== 'string') return '—';
  const bytes = Math.floor(data.length * 3 / 4) - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);
  return bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB';
}

export default function ReplayRequestDetails({ panelRef, row, deviceIp, onClose, onUseEntry, allowUseEntry }) {
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(false);
  const { id, url, method, startTime, outcome, source } = row;
  useEffect(() => {
    if (source === 'direct') return;
    const controller = new AbortController();
    setLoading(true);
    fetchSessions([id], controller.signal, 4000).then(result => {
      const item = result[id];
      if (!controller.signal.aborted && matchesCapturedRequest(item, { id, url, method, startTime }, deviceIp)) {
        setLive({ requestHeaders: item.req?.headers, responseHeaders: item.res?.headers });
      }
    }).catch(() => {}).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [id, url, method, startTime, outcome, source, deviceIp]);

  const requestHeaders = live?.requestHeaders || row.requestHeaders;
  const responseHeaders = live?.responseHeaders || { ...row.responseHeaders, ...row.response?.headers };
  const requestBody = useMemo(() => row.requestBody == null ? null :
    ({ base64: row.requestBody, headers: { 'content-type': row.requestType || '' } }), [row.requestBody, row.requestType]);
  const responseType = header(row.response?.headers, 'content-type');
  const responseData = row.response?.body;
  const responseBody = useMemo(() => {
    if (row.status === 304) return { available: false, reason: '304 响应没有正文。复现时会尝试查找同版本的历史 200 响应。' };
    return responseData == null ? null : { base64: responseData, headers: { 'content-type': responseType } };
  }, [row.status, responseData, responseType]);
  const overview = [
    ['状态', row.restored304 ? '304 · 已使用同版本正文' : row.status || '—'],
    ['耗时', row.duration + ' ms'], ['开始时间', new Date(startTime).toLocaleString()],
    ['设备 IP', deviceIp || '—'], ['来源', source === 'direct' ? '直连补录' : 'Whistle 抓取'],
    ['请求正文', bodySize(row.requestBody)], ['响应正文', bodySize(row.response?.body)],
    ['请求 ID', id], ['响应类型', header(responseHeaders, 'content-type') || '—']
  ];
  return <section ref={panelRef} className="mm-replay-request-details" aria-label="复现请求详情">
    <div className="mm-replay-section-heading">
      <h2>请求详情</h2>
      <Button size="small" type="text" onClick={onClose}>关闭详情</Button>
    </div>
    <CapturedRequestDetails url={url} method={method} status={row.restored304 ? 304 : row.status} overview={overview} maskSensitive
      requestHeaders={requestHeaders} responseHeaders={responseHeaders} requestBody={requestBody} responseBody={responseBody}
      note={loading ? '正在补充 Whistle 原始头信息…' :
        live ? '正文来自会话，头信息来自 Whistle 抓包' : '正在查看会话快照'}
      actions={method === 'GET' && (row.status === 304 || row.restored304) && <Button size="small" disabled={!allowUseEntry}
        onClick={() => onUseEntry(url)}>设为复现入口</Button>} />
  </section>;
}
