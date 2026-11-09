import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import ReplayPreview from './ReplayPreview';
import { Alert, Button, Checkbox, Drawer, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { fetchSession, fetchSessions, readNetwork } from '../utils/network/client';
import { captureRow, createCaptureScope } from '../utils/network/replay-capture';
import { decodeBody, header } from '../utils/network/model';
import { BODY_BUDGET, MAX_FILE_BYTES, MAX_RECORDS, httpUrl, parseSession, replayCookies, requestKey } from '../../../lib/replay-session';
import '../styles/replay.css';

const outcomeLabels = {
  response: '可回放',
  'network-error': '传输错误',
  incomplete: '数据不全',
  pending: '未完成'
};

function isEntryRequest(row, url) {
  return row.method === 'GET' && requestKey('GET', row.url, '') === requestKey('GET', url.href, '');
}

function readRequestCookie(captured, row, url, deviceIp) {
  if (captured?.id !== row.id || captured.startTime !== row.startTime ||
      requestKey(row.method, captured.url, '') !== requestKey(row.method, row.url, '') ||
      (deviceIp && captured.req?.ip !== deviceIp)) {
    throw new Error('抓包缓存已移除或变化，请重新抓取或手动输入 Cookie。');
  }
  const value = header(captured.req?.headers, 'cookie');
  return replayCookies(value, url.href).length ? value : '';
}

function CapturedBody({ data, type }) {
  if (data === null || data === undefined) return <Typography.Text type="secondary">正文不可用</Typography.Text>;
  const body = decodeBody({ base64: data, headers: { 'content-type': type || '' } });
  return body.available ? <pre className="mm-capture-body">{body.text || '（空内容）'}</pre>
    : <Typography.Text type="secondary">{body.reason}</Typography.Text>;
}

export default function ReplayDrawer({ open, onClose, devices }) {
  const [ip, setIp] = useState('');
  const [entry, setEntry] = useState('');
  const [extraHosts, setExtraHosts] = useState('');
  const [recording, setRecording] = useState(null);
  const [session, setSession] = useState(null);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');
  const [stopping, setStopping] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [replayStatus, setReplayStatus] = useState(null);
  const [replayRun, setReplayRun] = useState(null);
  const [cookieHeader, setCookieHeader] = useState('');
  const [autoCookie, setAutoCookie] = useState(true);
  const [cookieLoading, setCookieLoading] = useState(false);
  const recordedCookie = useRef(null);
  const stopRequested = useRef(false);
  const fileInput = useRef(null);

  const start = () => {
    try {
      const address = httpUrl(entry.trim());
      if (!ip || !devices.includes(ip)) throw new Error('请先让手机通过代理访问一次，再选择抓包中出现的设备 IP');
      const hosts = new Set([address.hostname]);
      for (const host of extraHosts.split(/[\s,，]+/).filter(Boolean)) {
        const parsed = httpUrl('https://' + host);
        if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.port) {
          throw new Error('其他域名请填写主机名，用逗号分隔');
        }
        hosts.add(parsed.hostname);
      }
      stopRequested.current = false;
      setNotice('');
      setSelected(null);
      setSession(null);
      setReplayStatus(null);
      setReplayRun(null);
      setCookieHeader('');
      recordedCookie.current = null;
      setRecording({ ip, entryUrl: address.href, hosts });
    } catch (error) {
      setNotice(error.message);
    }
  };

  useEffect(() => {
    if (!recording) return;
    const controller = new AbortController();
    const records = new Map();
    const { ip, entryUrl, hosts } = recording;
    const entryAddress = httpUrl(entryUrl);
    const scope = createCaptureScope(entryUrl);
    let cursor;
    let timer;
    let bodySize = 0;
    let drainCount = 0;
    let truncated = false;
    const startedAt = Date.now();

    function snapshot() {
      return { version: 1, entryUrl, deviceIp: ip, startedAt, truncated,
        records: [...records.values()].sort((a, b) => a.startTime - b.startTime) };
    }
    function finish(message) {
      setNotice(message);
      setRecording(null);
      setStopping(false);
      setSession(snapshot());
    }
    async function poll() {
      const finalPoll = stopRequested.current;
      try {
        const ids = [...records.values()].filter(row => row.outcome === 'pending').map(row => row.id);
        const batch = await readNetwork({ ip, count: 20, startTime: cursor, ids: ids.join(',') || undefined }, controller.signal);
        if (controller.signal.aborted) return;
        cursor = batch.cursor || batch.endId || cursor;
        batch.items.sort((a, b) => a.startTime - b.startTime || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
        for (const item of batch.items) {
          const previous = records.get(item.id);
          if (previous && previous.outcome !== 'pending') continue;
          const row = captureRow(item, previous, hosts, ip, scope);
          if (!row) continue;
          if (!previous && records.size >= MAX_RECORDS) {
            truncated = true;
            continue;
          }
          scope.remember(item, row);
          if (httpUrl(row.url).origin === entryAddress.origin &&
              (!recordedCookie.current || (!recordedCookie.current.fromEntry && isEntryRequest(row, entryAddress)))) {
            try {
              const value = readRequestCookie(item, row, entryAddress, ip);
              if (value) recordedCookie.current = { origin: entryAddress.origin, value, fromEntry: isEntryRequest(row, entryAddress) };
            } catch {
              // Some captured Cookie headers cannot be used in a browser.
            }
          }
          const size = (row.requestBody?.length || 0) + (row.response?.body.length || 0);
          if (bodySize + size > BODY_BUDGET) {
            truncated = true;
            row.requestBody = null;
            row.response = null;
            row.outcome = 'incomplete';
          } else {
            bodySize += size;
          }
          records.set(row.id, row);
        }
        setSession(snapshot());
        if (finalPoll && (!batch.hasNew || !batch.cursor || ++drainCount >= 10)) {
          if (batch.hasNew && drainCount >= 10) truncated = true;
          finish(truncated ? '会话达到容量或收尾读取上限，部分记录或正文未保存。' : '');
        } else {
          timer = setTimeout(poll, batch.hasNew || stopRequested.current ? 50 : 1000);
        }
      } catch (error) {
        if (!controller.signal.aborted) finish('抓包连接中断，已保留目前读取到的记录。' + error.message);
      }
    }

    // -2 asks Whistle for its current end cursor without reading older captures.
    readNetwork({ startTime: '-2', ip }, controller.signal).then(batch => {
      if (controller.signal.aborted) return;
      cursor = batch.endId || '0';
      setSession(snapshot());
      poll();
    }).catch(error => {
      if (!controller.signal.aborted) finish(error.message);
    });
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [recording]);

  const download = () => {
    const blob = new Blob([JSON.stringify(session)], { type: 'application/json' });
    if (blob.size > MAX_FILE_BYTES) {
      setNotice('会话文件超过 25 MB，请缩小录制范围。');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mockmaster-replay-' + session.startedAt + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const load = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error('会话文件超过 25 MB');
      const imported = parseSession(await file.text());
      setSession(imported);
      recordedCookie.current = null;
      setEntry(imported.entryUrl);
      setCookieHeader('');
      setReplayStatus(null);
      setReplayRun(null);
      setSelected(null);
      setNotice('');
    } catch (error) {
      setNotice(error.message);
    }
  };

  const replayId = replayRun?.id;
  useEffect(() => {
    if (!open || !replayId) return;
    const controller = new AbortController();
    let timer;
    async function poll() {
      try {
        const { data } = await axios.post('/cgi-bin/replay-session/status', null, {
          params: { id: replayId }, signal: controller.signal, timeout: 5000
        });
        if (controller.signal.aborted) return;
        setReplayRun(data);
        if (data.running) timer = setTimeout(poll, 1000);
      } catch {
        if (!controller.signal.aborted) setReplayRun(null);
      }
    }
    poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [open, replayId]);

  const controlReplay = useCallback(action => {
    if (!replayId) return;
    axios.post('/cgi-bin/replay-session/control', action, {
      params: { id: replayId }, timeout: 3000
    }).catch(() => {
      if (action.type === 'restart' || action.type === 'stop') {
        setReplayStatus({ type: 'warning', message: '复现操作没有送达，请重试。' });
      }
    });
  }, [replayId]);

  const readCapturedCookie = async () => {
    setCookieLoading(true);
    setNotice('');
    try {
      const url = httpUrl(entry.trim() || session.entryUrl);
      const picked = session.records.find(row => row.id === selected);
      const initial = session.records.find(row => isEntryRequest(row, url));
      const source = picked || initial;
      if (!source || httpUrl(source.url).origin !== url.origin) {
        throw new Error('请选择一条和复现入口同源的录制请求。');
      }
      const captured = await fetchSession(source.id);
      const value = readRequestCookie(captured, source, url, session.deviceIp);
      if (!value) throw new Error('这条请求没有 Cookie，可以选择同源的接口请求，或手动输入。');
      setCookieHeader(value);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setCookieLoading(false);
    }
  };

  const changeEntry = value => {
    // An edited hash or path can reuse credentials, but a different origin cannot.
    try {
      if (httpUrl(value.trim()).origin !== httpUrl(entry.trim()).origin) setCookieHeader('');
    } catch {
      setCookieHeader('');
    }
    setEntry(value);
  };

  const findAutomaticCookie = async url => {
    if (recordedCookie.current?.origin === url.origin) return recordedCookie.current.value;
    const sameOrigin = session.records.filter(row => httpUrl(row.url).origin === url.origin);
    const initial = sameOrigin.find(row => isEntryRequest(row, url));
    const candidates = [initial, ...sameOrigin.filter(row => row !== initial)].filter(Boolean).slice(0, 4);
    if (!candidates.length) return '';
    try {
      const captures = await fetchSessions(candidates.map(row => row.id), undefined, 4000);
      for (const row of candidates) {
        try {
          const value = readRequestCookie(captures[row.id], row, url, session.deviceIp);
          if (value) return value;
        } catch {
          // Cache entries can expire, even while the rest of the session remains available.
        }
      }
    } catch {
      // An unavailable Whistle cache must not block replaying an imported file.
    }
    return '';
  };

  const replay = async () => {
    setReplayStatus(null);
    setReplayRun(null);
    setLaunching(true);
    try {
      const url = httpUrl(entry.trim() || session.entryUrl);
      const manual = cookieHeader.trim();
      const cookie = manual || (autoCookie ? await findAutomaticCookie(url) : '');
      replayCookies(cookie, url.href);
      const { data } = await axios.post('/cgi-bin/replay-session', {
        session: { ...session, entryUrl: url.href },
        cookieHeader: cookie,
        embedded: true
      }, { timeout: 25000 });
      if (data?.ok !== true) throw new Error('插件未返回复现状态，请确认已加载最新版。');
      setReplayStatus({
        type: 'success', message: data.message,
        description: cookie ? (manual ? '已使用手动输入的 Cookie。' : '已自动使用抓包 Cookie。')
          : autoCookie ? '未找到可用的抓包 Cookie。如页面需要登录，可手动输入或重新抓取。' : undefined
      });
      if (data.id) setReplayRun({ id: data.id, blocked: [], running: true, embedded: true });
    } catch (error) {
      setReplayStatus({ type: 'error', message: error.response?.data?.message || error.message });
    } finally {
      setLaunching(false);
    }
  };

  const rows = session?.records || [];
  const previewActive = !!replayRun?.running;
  const origin = rows.length ? Math.min(...rows.map(row => row.startTime)) : 0;
  const total = Math.max(1, ...rows.map(row => row.startTime - origin + row.duration));
  const chosen = rows.find(row => row.id === selected);
  const columns = [
    { title: '偏移', width: 90, render: (_, row) => ((row.startTime - origin) / 1000).toFixed(2) + ' s' },
    { title: '请求', ellipsis: true, render: (_, row) => <button className="mm-network-url" title={row.url} onClick={() => setSelected(row.id)}>{row.method} {row.url}</button> },
    { title: '状态', width: 145, render: (_, row) => <Tag color={row.status >= 400 || row.outcome === 'network-error' ? 'error' : undefined}>{row.status || ''} {outcomeLabels[row.outcome] || row.outcome}</Tag> },
    { title: '耗时', width: 85, render: (_, row) => row.duration + ' ms' },
    { title: '时间线', width: 135, render: (_, row) => <div className="mm-replay-track"><span style={{
      left: (row.startTime - origin) / total * 100 + '%',
      width: Math.max(0.5, row.duration / total * 100) + '%'
    }} /></div> }
  ];

  return <Drawer title="故障复现会话" open={open} width="min(1080px, 100vw)"
    closable={!recording && !cookieLoading && !launching} keyboard={!recording && !cookieLoading && !launching}
    maskClosable={!recording && !cookieLoading && !launching}
    onClose={() => {
      if (recording || cookieLoading || launching) return;
      if (previewActive) controlReplay({ type: 'stop' });
      setReplayRun(null);
      setReplayStatus(null);
      setCookieHeader('');
      recordedCookie.current = null;
      onClose();
    }}>
    <Space direction="vertical" size="middle" className="mm-replay-panel">
      <Typography.Paragraph type="secondary">先让手机通过 Whistle 代理访问一次，再选设备 IP。开始后重新打开页面并复现故障，录制会按请求来源自动识别相关资源。</Typography.Paragraph>
      <div className="mm-replay-inputs">
        <Select aria-label="抓包设备 IP" placeholder="选择设备 IP" showSearch disabled={!!recording}
          value={ip || undefined} onChange={setIp} options={devices.map(value => ({ value }))} />
        <Input aria-label="复现入口 URL" placeholder="完整页面 URL，包含 # 后的页面路由" disabled={!!recording || cookieLoading || launching} value={entry} onChange={e => changeEntry(e.target.value)} />
        <Input aria-label="其他抓包域名" placeholder="手动补充域名（可选），用逗号分隔" disabled={!!recording} value={extraHosts} onChange={e => setExtraHosts(e.target.value)} />
      </div>
      <Space wrap>
        {recording ? <Button danger loading={stopping} onClick={() => { stopRequested.current = true; setStopping(true); }}>结束抓取</Button>
          : <Button type={rows.length ? 'default' : 'primary'} disabled={launching || cookieLoading || previewActive} onClick={start}>开始抓取</Button>}
        <Button disabled={!!recording || launching || cookieLoading || previewActive} onClick={() => fileInput.current?.click()}>打开会话文件</Button>
        <input ref={fileInput} hidden type="file" accept=".json,application/json" onChange={load} />
        <Button disabled={!!recording || !rows.length} onClick={download}>保存会话文件</Button>
        <Button type="primary" disabled={!!recording || !rows.length || cookieLoading || previewActive} loading={launching} onClick={replay}>开始复现</Button>
      </Space>
      {!!rows.length && !recording && <div>
        <Space wrap>
          <Checkbox checked={autoCookie} disabled={cookieLoading || launching}
            onChange={event => setAutoCookie(event.target.checked)}>复现时自动读取抓包 Cookie</Checkbox>
          <Input.Password aria-label="复现 Cookie" placeholder="复现 Cookie（可选）" autoComplete="off"
            value={cookieHeader} disabled={cookieLoading || launching} onChange={e => setCookieHeader(e.target.value)} />
          <Button loading={cookieLoading} disabled={launching} onClick={readCapturedCookie}>从抓包读取 Cookie</Button>
        </Space>
        <div><Typography.Text type="secondary">手动输入会覆盖自动读取。Cookie 仅用于入口域名的隔离浏览器，页面脚本可读取，导出文件不包含此值。</Typography.Text></div>
      </div>}
      {replayStatus && <Alert showIcon {...replayStatus} />}
      {replayRun?.embedded && <ReplayPreview run={replayRun} onAction={controlReplay} />}
      {!!replayRun?.blocked?.length && <Alert type="warning" showIcon
        message={`本次复现有 ${replayRun.blocked.length} 条请求未匹配`}
        description={<div>
          <p>缺少来源信息的请求，可通过「手动补充域名」纳入下一次抓取。
            如果跳到了登录页，原页面可能依赖抓包之外的登录状态。</p>
          <ul style={{ maxHeight: 150, overflow: 'auto', paddingInlineStart: 20 }}>
            {replayRun.blocked.map(item => <li key={JSON.stringify(item)}>{item.method} {item.url} · {item.reason}</li>)}
          </ul>
        </div>} />}
      {notice && <Alert type="warning" showIcon message={notice} />}
      {recording && <Alert type="info" showIcon message={session ? '抓取中，请让对方复现问题' : '正在连接 Whistle，请稍候'} />}
      {session && <div>
        <Typography.Paragraph copyable>{session.entryUrl}</Typography.Paragraph>
        <Typography.Text type="secondary">
          {typeof session.deviceIp === 'string' && session.deviceIp + ' · '}
          {new Date(session.startedAt).toLocaleString()} · {rows.length} 条请求
          {session.truncated ? ' · 部分数据未保存' : ''}
        </Typography.Text>
      </div>}
      <Table rowKey="id" size="small" columns={columns} dataSource={rows} scroll={{ x: 650, y: 340 }} pagination={false} />
      {chosen && <div>
        <Typography.Paragraph copyable>{chosen.method} {chosen.url}</Typography.Paragraph>
        <Typography.Title level={5}>请求正文</Typography.Title>
        <CapturedBody data={chosen.requestBody} type={chosen.requestType} />
        <Typography.Title level={5}>响应正文</Typography.Title>
        <CapturedBody data={chosen.response?.body} type={chosen.response?.headers?.['content-type']} />
      </div>}
      <Typography.Paragraph type="secondary">
        在 Whistle 所在电脑打开插件，点击「开始复现」后可在浮层内点击、滚动和输入。页面使用录制的响应，缺失的请求会被拦截。
      </Typography.Paragraph>
    </Space>
  </Drawer>;
}
