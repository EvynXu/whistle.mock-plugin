import React, { useMemo, useState } from 'react';
import { Descriptions, Empty, Segmented, Space, Tabs, Tag, Typography } from 'antd';
import { decodeBody } from '../utils/network/model';
import { formatJSONForDisplay } from '../utils/network/format';
import '../styles/network.css';

const sensitiveHeader = /authorization|cookie|token|secret|(?:api|session)[-_]?key|credential/i;

function HeadersView({ headers, maskSensitive }) {
  const entries = Object.entries(headers || {}).sort(([a], [b]) => a.localeCompare(b));
  return <Pairs entries={entries.map(([name, value]) => [name, maskSensitive && sensitiveHeader.test(name) ? '（已隐藏）' : value])}
    empty="没有可展示的请求头或响应头" />;
}

function Pairs({ entries, empty }) {
  if (!entries.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} />;
  return <dl className="mm-captured-detail-pairs">{entries.map(([key, value], index) => <div key={index}>
    <dt>{key}</dt><dd>{Array.isArray(value) ? value.join('\n') : String(value ?? '')}</dd>
  </div>)}</dl>;
}

function CapturedBody({ data }) {
  const [mode, setMode] = useState('pretty');
  const body = useMemo(() => data && ('available' in data ? data : decodeBody(data)), [data]);
  const formatted = useMemo(() => body?.available ? formatJSONForDisplay(body.text) : null, [body]);
  if (!body?.available) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={body?.reason || '正文不可用'} />;
  return <>
    <Space wrap size="small">
      {formatted.available && <Segmented size="small" aria-label="正文展示方式" options={[
        { value: 'pretty', label: '格式化' }, { value: 'raw', label: '原文' }
      ]} value={mode} onChange={setMode} />}
      {body.text && <Typography.Text copyable={{ text: body.text }}>复制原文</Typography.Text>}
    </Space>
    <pre className="mm-capture-body">{(formatted.available && mode === 'pretty' ? formatted.text : body.text) || '（空内容）'}</pre>
  </>;
}

export default function CapturedRequestDetails({
  url, method, status, overview, note, actions, requestHeaders, responseHeaders, requestBody, responseBody, maskSensitive
}) {
  let query = [];
  try { query = [...new URL(url).searchParams]; } catch { /* CONNECT and incomplete entries may lack a URL. */ }
  return <div className="mm-captured-detail">
    <div className="mm-captured-detail-url">
      <Tag>{method || '—'}</Tag>
      {status && <Tag>{status}</Tag>}
      {url && <Typography.Text copyable={{ text: url }} ellipsis={{ tooltip: url }}>{url}</Typography.Text>}
    </div>
    {actions}
    {note && <Typography.Text type="secondary" className="mm-captured-detail-note">{note}</Typography.Text>}
    <Tabs size="small" items={[
      { key: 'overview', label: '概览', children: <Descriptions bordered size="small" column={1} items={overview.map(([label, children]) =>
        ({ key: label, label, children }))} /> },
      { key: 'query', label: '查询参数', children: <Pairs entries={query} empty="没有查询参数" /> },
      { key: 'request-headers', label: '请求头', children: <HeadersView headers={requestHeaders} maskSensitive={maskSensitive} /> },
      { key: 'request-body', label: '请求体', children: <CapturedBody data={requestBody} /> },
      { key: 'response-headers', label: '响应头', children: <HeadersView headers={responseHeaders} maskSensitive={maskSensitive} /> },
      { key: 'response-body', label: '响应体', children: <CapturedBody data={responseBody} /> }
    ]} />
  </div>;
}
