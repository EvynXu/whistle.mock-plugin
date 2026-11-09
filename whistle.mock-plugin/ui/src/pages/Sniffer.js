import React, { useEffect, useState } from 'react';
import { Alert, App, Button, Card, Drawer, Empty, Input, Popconfirm, Select, Space, Table, Tabs, Tag } from 'antd';
import { CopyOutlined, DeleteOutlined, HistoryOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import axios from 'axios';
import PageHeader from '../components/PageHeader';
import SaveMockDrawer from '../components/SaveMockDrawer';
import { createId } from '../components/workbench/model';
const pairs = obj => Object.entries(obj || {}).map(([key, value]) => ({
  id: createId(),
  key,
  value
}));
const object = list => Object.fromEntries(list.filter(p => p.key).map(p => [p.key, p.value]));
const readHistory = () => {
  try {
    const v = JSON.parse(localStorage.getItem('sniffer-history'));
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
};
function PairEditor({
  value,
  onChange,
  label
}) {
  return <div>{value.map((p, i) => <div className="mm-pair" key={p.id}><Input aria-label={`${label} ${i + 1} 名称`} placeholder="名称" value={p.key} onChange={e => onChange(value.map((n, j) => i === j ? {
        ...n,
        key: e.target.value
      } : n))} /><Input aria-label={`${label} ${i + 1} 值`} placeholder="值" value={p.value} onChange={e => onChange(value.map((n, j) => i === j ? {
        ...n,
        value: e.target.value
      } : n))} /><Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除 ${label} ${i + 1}`} onClick={() => onChange(value.filter((_, j) => i !== j))} /></div>)}<Button type="dashed" icon={<PlusOutlined />} onClick={() => onChange([...value, {
      id: createId(),
      key: '',
      value: ''
    }])}>添加{label}</Button></div>;
}
export default function Sniffer() {
  const {
    message
  } = App.useApp();
  const [url, setUrl] = useState(''),
    [method, setMethod] = useState('GET'),
    [query, setQuery] = useState([]),
    [headers, setHeaders] = useState([]),
    [bodyType, setBodyType] = useState('none'),
    [body, setBody] = useState('');
  const [response, setResponse] = useState(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [history, setHistory] = useState(readHistory),
    [historyOpen, setHistoryOpen] = useState(false),
    [storageError, setStorageError] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const persist = records => {
    let keep = records.slice(0, 100);
    try {
      while (keep.length > 1 && new Blob([JSON.stringify(keep)]).size > 2 * 1024 * 1024) keep.pop();
      localStorage.setItem('sniffer-history', JSON.stringify(keep));
      setHistory(keep);
      setStorageError('');
    } catch (e) {
      setHistory(keep);
      setStorageError('当前响应较大或浏览器存储已满；本次记录只保留在内存中，刷新后不会恢复。');
    }
  };
  const send = async () => {
    if (!url.trim()) {
      message.warning('请输入请求 URL');
      return;
    }
    try {
      const u = new URL(url.trim());
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    } catch (e) {
      message.warning('请输入有效的 HTTP / HTTPS URL');
      return;
    }
    if (bodyType === 'json' && body) {
      try {
        JSON.parse(body);
      } catch (e) {
        message.error(`请求 JSON 格式有误：${e.message}`);
        return;
      }
    }
    setLoading(true);
    setError('');
    setResponse(null);
    const request = {
      url: url.trim(),
      method,
      headers: object(headers),
      queryParams: object(query),
      body,
      bodyType
    };
    try {
      const {
        data
      } = await axios.post('/cgi-bin/proxy-fetch', request);
      if (data.code !== 0) throw new Error(data.message);
      const resp = {
        ...data.data,
        request
      };
      setResponse(resp);
      persist([{
        id: createId(),
        timestamp: new Date().toISOString(),
        url: request.url,
        method,
        status: resp.status,
        preview: String(resp.body || '').slice(0, 200),
        request,
        response: resp
      }, ...history]);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };
  const restore = record => {
    const request = record.request || {
      url: record.url,
      method: record.method
    };
    setUrl(request.url || '');
    setMethod(request.method || 'GET');
    setQuery(pairs(request.queryParams));
    setHeaders(pairs(request.headers));
    setBodyType(request.bodyType || 'none');
    setBody(typeof request.body === 'string' ? request.body : JSON.stringify(request.body || ''));
    setResponse(record.response ? {
      ...record.response,
      request
    } : {
      status: record.status,
      body: record.preview,
      headers: {},
      request,
      incomplete: true
    });
    setHistoryOpen(false);
  };
  const openSave = () => setSaveOpen(true);
  const format = value => {
    if (typeof value !== 'string') return JSON.stringify(value, null, 2);
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch (e) { return value; }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(response?.body || ''); message.success('已复制'); }
    catch (e) { message.error('复制失败，请手动选择内容复制'); }
  };
  return <div className="page-container"><PageHeader kicker="REQUEST LAB" title="接口嗅探" description="发送真实请求，保留完整响应并转换为 Mock。" actions={<Button icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)}>历史记录（{history.length}）</Button>} />
  <div className="mm-request-bar"><Select aria-label="请求方法" value={method} onChange={setMethod} options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(v => ({
        value: v,
        label: v
      }))} /><Input aria-label="请求 URL" className="mm-code" placeholder="https://api.example.com/users" value={url} onChange={e => setUrl(e.target.value)} onPressEnter={send} /><Button type="primary" icon={<SendOutlined />} loading={loading} onClick={send}>发送请求</Button></div>
  {error && <Alert type="error" showIcon message="请求失败" description={error} />} {storageError && <Alert type="warning" showIcon message={storageError} />}
  <div className="mm-sniffer-columns"><Card title="请求配置"><Tabs items={[{
          key: 'query',
          label: 'Query',
          children: <PairEditor label="参数" value={query} onChange={setQuery} />
        }, {
          key: 'headers',
          label: 'Headers',
          children: <PairEditor label="Header" value={headers} onChange={setHeaders} />
        }, {
          key: 'body',
          label: 'Body',
          children: <><Select aria-label="请求体类型" value={bodyType} onChange={setBodyType} options={[{
              value: 'none',
              label: '无请求体'
            }, {
              value: 'json',
              label: 'JSON'
            }, {
              value: 'form',
              label: '表单'
            }, {
              value: 'text',
              label: '纯文本'
            }]} />{bodyType !== 'none' && <Input.TextArea aria-label="请求体" className="mm-response-code" value={body} onChange={e => setBody(e.target.value)} autoSize={{
              minRows: 12,
              maxRows: 24
            }} style={{
              marginTop: 12
            }} />}</>
        }]} /></Card>
  <Card title={<Space>响应{response && <Tag color={response.status >= 400 ? 'error' : 'success'}>{response.status} {response.statusText}</Tag>}</Space>} extra={response && <Space wrap><Button size="small" icon={<CopyOutlined />} onClick={copy}>复制</Button><Button size="small" disabled={response.incomplete} onClick={openSave}>保存为 Mock</Button></Space>}>{response ? <>{response.incomplete && <Alert type="warning" message="这是旧历史的摘要，请重新发送获取完整响应。" />}<Tabs items={[{
            key: 'body',
            label: 'Body',
            children: <Input.TextArea aria-label="响应内容" className="mm-response-code" value={format(response.body)} readOnly autoSize={{
              minRows: 16,
              maxRows: 30
            }} />
          }, {
            key: 'headers',
            label: 'Headers',
            children: <pre>{JSON.stringify(response.headers, null, 2)}</pre>
          }]} /></> : <div className="mm-sniffer-empty"><Empty description={loading ? '正在请求真实接口…' : '发送请求后在这里查看响应'} /></div>}</Card></div>
  <Drawer title="请求历史" open={historyOpen} onClose={() => setHistoryOpen(false)} width="min(880px, 100vw)" extra={<Popconfirm title="清空历史记录？" onConfirm={() => persist([])}><Button danger>清空</Button></Popconfirm>}><Table rowKey="id" size="small" scroll={{
        x: 620
      }} pagination={{
        pageSize: 10
      }} dataSource={history} columns={[{
        title: '时间',
        dataIndex: 'timestamp',
        render: t => new Date(t).toLocaleString()
      }, {
        title: '方法',
        dataIndex: 'method'
      }, {
        title: 'URL',
        dataIndex: 'url',
        ellipsis: true
      }, {
        title: '状态',
        dataIndex: 'status'
      }, {
        title: '操作',
        render: (_, r) => <Space><Button onClick={() => restore(r)}>加载</Button><Popconfirm title="删除此记录？" onConfirm={() => persist(history.filter(h => h.id !== r.id))}><Button danger>删除</Button></Popconfirm></Space>
      }]} /></Drawer>
  <SaveMockDrawer open={saveOpen} onClose={() => setSaveOpen(false)} response={response} />
 </div>;
}
