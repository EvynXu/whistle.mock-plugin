import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App, Button, Drawer, Empty, Input, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import { ClearOutlined, PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import PageHeader from '../components/PageHeader';
import SaveMockDrawer from '../components/SaveMockDrawer';
import CapturedRequestDetails from '../components/CapturedRequestDetails';
import { useHistory } from 'react-router-dom';
import { fetchNetwork, fetchSession } from '../utils/network/client';
import { MAX_ROWS, mergeRows, sessionDetail, header } from '../utils/network/model';
import '../styles/network.css';
const size = value => value == null ? '—' : value < 1024 ? `${value} B` : value < 1048576 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1048576).toFixed(1)} MB`;
const time = value => value ? new Date(value).toLocaleTimeString() : '—';
export default function Network() {
  const history = useHistory();
  const {
    message
  } = App.useApp();
  const [rows, setRows] = useState([]),
    [running, setRunning] = useState(true),
    [loading, setLoading] = useState(true);
  const [error, setError] = useState(''),
    [updated, setUpdated] = useState(null),
    [feedKey, setFeedKey] = useState(0);
  const [query, setQuery] = useState(''),
    [method, setMethod] = useState('ALL'),
    [status, setStatus] = useState('all');
  const cursor = useRef(),
    endId = useRef(),
    pending = useRef([]),
    generation = useRef(0),
    tableHost = useRef(null);
  const [tableHeight, setTableHeight] = useState(300);
  const [selected, setSelected] = useState(null),
    [detail, setDetail] = useState(null),
    [detailError, setDetailError] = useState(''),
    [detailLoading, setDetailLoading] = useState(false),
    [detailRetry, setDetailRetry] = useState(0);
  const [saveCapture, setSaveCapture] = useState(null);
  useEffect(() => {
    const host = tableHost.current;
    if (!host) return;
    const observer = new ResizeObserver(() => setTableHeight(Math.max(80, host.clientHeight - 60)));
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!running) {
      setLoading(false);
      return;
    }
    let stopped = false,
      timer,
      controller;
    const version = generation.current;
    const poll = async () => {
      if (stopped) return;
      if (document.hidden) {
        timer = setTimeout(poll, 2000);
        return;
      }
      controller = new AbortController();
      let soon = false;
      try {
        const result = await fetchNetwork(cursor.current, pending.current, controller.signal);
        if (stopped || version !== generation.current) return;
        if (result.cursor) cursor.current = result.cursor;
        if (result.endId) endId.current = result.endId;
        setRows(previous => {
          const next = mergeRows(previous, result.rows);
          pending.current = next.filter(row => !row.endTime && !row.reqError && !row.resError).slice(0, 25).map(row => row.id);
          return next;
        });
        setUpdated(Date.now());
        setError('');
        soon = result.hasNew;
      } catch (e) {
        if (!stopped && version === generation.current && !axios.isCancel(e)) {
          setError(e.message);
          setRunning(false);
        }
      } finally {
        if (!stopped && version === generation.current) {
          setLoading(false);
          timer = setTimeout(poll, soon ? 200 : 2500);
        }
      }
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [running, feedKey]);
  const selectedRow = rows.find(row => row.id === selected);
  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let live = true;
    const controller = new AbortController();
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    fetchSession(selected, controller.signal).then(session => {
      if (live) setDetail(sessionDetail(session));
    }).catch(e => {
      if (live && !axios.isCancel(e)) setDetailError(e.message);
    }).finally(() => {
      if (live) setDetailLoading(false);
    });
    return () => {
      live = false;
      controller.abort();
    };
  }, [selected, selectedRow?.endTime, detailRetry]);
  const filtered = useMemo(() => rows.filter(row => {
    const code = Number(row.status),
      failed = row.reqError || row.resError;
    return (!query || String(row.url || '').toLowerCase().includes(query.toLowerCase())) && (method === 'ALL' || row.method === method) && (status === 'all' || (status === 'pending' ? !row.endTime && !failed : status === 'error' ? failed || code >= 400 : Math.floor(code / 100) === Number(status)));
  }), [rows, query, method, status]);
  const clear = reload => {
    generation.current++;
    pending.current = [];
    setRows([]);
    setSelected(null);
    setError('');
    cursor.current = reload ? undefined : endId.current || cursor.current;
    if (reload) {
      endId.current = undefined;
      setLoading(true);
      setRunning(true);
    }
    setFeedKey(key => key + 1);
  };
  const copy = async text => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制');
    } catch (e) {
      message.error('复制失败，请手动选择文本');
    }
  };
  const capture = () => {
    if (!detail?.canSave) return;
    setSaveCapture({
      status: Number(detail.session.res.statusCode),
      headers: detail.session.res.headers || {},
      body: detail.response.text,
      request: {
        url: detail.session.url,
        method: detail.session.req?.method || 'GET'
      }
    });
  };
  const columns = [{
    title: '时间',
    dataIndex: 'startTime',
    width: 100,
    render: time
  }, {
    title: '方法',
    dataIndex: 'method',
    width: 85,
    render: value => <Tag>{value || '—'}</Tag>
  }, {
    title: '状态',
    width: 95,
    render: (_, row) => <Tag color={row.reqError || row.resError || Number(row.status) >= 400 ? 'error' : Number(row.status) >= 200 ? 'success' : 'default'}>{row.reqError || row.resError ? '传输错误' : row.status || '进行中'}</Tag>
  }, {
    title: 'URL',
    dataIndex: 'url',
    ellipsis: true,
    render: (url, row) => <button className="mm-network-url" title={url} onClick={() => setSelected(row.id)}>{url || row.id}</button>
  }, {
    title: '耗时',
    width: 90,
    render: (_, row) => row.endTime ? `${Math.max(0, row.endTime - row.startTime)} ms` : '—'
  }, {
    title: '大小',
    dataIndex: 'size',
    width: 85,
    render: size
  }, {
    title: '类型',
    dataIndex: 'contentType',
    width: 180,
    ellipsis: true,
    render: value => value || '—'
  }];
  const session = detail?.session;
  const overview = session && [
    ['状态', session.res?.statusCode || '进行中'],
    ['耗时', session.endTime ? `${Math.max(0, session.endTime - session.startTime)} ms` : '进行中'],
    ['开始时间', session.startTime ? new Date(session.startTime).toLocaleString() : '—'],
    ['设备 IP', session.req?.ip || '—'], ['来源', 'Whistle 抓取'],
    ['请求正文', size(session.req?.unzipSize ?? session.req?.size)],
    ['响应正文', size(session.res?.unzipSize ?? session.res?.size)],
    ['请求 ID', session.id], ['响应类型', header(session.res?.headers, 'content-type') || '—']
  ];
  return <div className="mm-network-page"><PageHeader kicker="WHISTLE NETWORK" title="抓包列表" description="查看 Whistle 已捕获的请求，直接将响应转为 Mock，无需重新发送。" actions={<>
    <Button onClick={() => history.push('/replay')}>故障复现</Button>
    <Button icon={running ? <PauseCircleOutlined /> : <PlayCircleOutlined />} onClick={() => setRunning(value => !value)}>{running ? '暂停同步' : '继续同步'}</Button>
    <Button aria-label="重新载入最近请求" icon={<ReloadOutlined />} onClick={() => clear(true)} /><Button icon={<ClearOutlined />} onClick={() => clear(false)}>清空本页</Button>
  </>} />
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => {
      setError('');
      setRunning(true);
      setFeedKey(v => v + 1);
    }}>重试连接</Button>} />}
    <div className="mm-network-controls"><Input.Search aria-label="搜索抓包 URL" placeholder="搜索 URL" allowClear value={query} onChange={e => setQuery(e.target.value)} />
      <Select aria-label="筛选请求方法" value={method} onChange={setMethod} options={['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'CONNECT'].map(value => ({
        value,
        label: value === 'ALL' ? '全部方法' : value
      }))} />
      <Select aria-label="筛选请求状态" value={status} onChange={setStatus} options={[['all', '全部状态'], ['2', '2xx'], ['3', '3xx'], ['4', '4xx'], ['5', '5xx'], ['pending', '进行中'], ['error', '错误请求']].map(([value, label]) => ({
        value,
        label
      }))} />
      <span className="mm-network-state">{filtered.length} / {rows.length} 条 · {running && !error ? '同步中' : '已暂停'}{updated ? ` · ${time(updated)}` : ''}</span>
    </div>
    <Typography.Text type="secondary" className="mm-network-note">仅保留本页最近 {MAX_ROWS} 条，单页滚动；首次载入最近 50 条，后续增量同步。清空本页不影响 Whistle 的 Network 记录。</Typography.Text>
    <div className="mm-network-table" ref={tableHost}><Table rowKey="id" size="small" loading={loading} dataSource={filtered} columns={columns} scroll={{
        x: 1000,
        y: tableHeight
      }} pagination={false} locale={{
        emptyText: <Empty description={error ? '连接 Whistle 后查看抓包数据' : '暂无匹配请求，请确认请求已经过 Whistle 代理'} />
      }} /></div>
    <Drawer title="抓包详情" open={!!selected} onClose={() => setSelected(null)} width="min(900px, 100vw)" extra={<Button aria-label="刷新抓包详情" icon={<ReloadOutlined />} onClick={() => setDetailRetry(v => v + 1)} />} footer={<Space wrap><Button disabled={!detail?.canSave} type="primary" onClick={capture}>保存为 Mock</Button><Button disabled={!detail?.response.available} onClick={() => copy(detail.response.text)}>复制响应体</Button></Space>}>
      <Spin spinning={detailLoading}>{detailError && <Alert type="error" message={detailError} action={<Button onClick={() => setDetailRetry(v => v + 1)}>重试</Button>} />}
        {detail && <>
          {!detail.canSave && detail.reason !== detail.response.reason && <Alert className="mm-error" type="warning" showIcon message={detail.reason} />}
          <CapturedRequestDetails key={session.id} url={session.url} method={session.req?.method} status={session.res?.statusCode || '进行中'} overview={overview}
            requestHeaders={session.req?.headers} responseHeaders={session.res?.headers}
            requestBody={detail.request} responseBody={detail.response}
            note="数据来自 Whistle 内存缓存。WebSocket 帧可在 Whistle 中查看。" />
        </>}
      </Spin>
    </Drawer>
    <SaveMockDrawer open={!!saveCapture} onClose={() => setSaveCapture(null)} response={saveCapture} initialActive={false} source="Whistle Network" />
  </div>;
}
