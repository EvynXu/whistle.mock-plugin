import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { AimOutlined, DatabaseOutlined, DesktopOutlined, RadarChartOutlined, SearchOutlined } from '@ant-design/icons';
import ReplayRequestDetails from './ReplayRequestDetails';
import ReplayCacheSetting, { useReplayCacheSetting } from './ReplayCacheSetting';
import { Alert, Button, Checkbox, Input, Segmented, Select, Space, Table, Tag, Typography, theme } from 'antd';
import { fetchNetwork, fetchSession, fetchSessions, readNetwork } from '../utils/network/client';
import { captureRow, createCaptureScope, isCachedReplayDocument, isReplayDocument, matchesCapturedRequest } from '../utils/network/replay-capture';
import { header } from '../utils/network/model';
import { BODY_BUDGET, MAX_FILE_BYTES, MAX_RECORDS, REPLAY_RESOURCE_TYPES, createReplayQueue, httpUrl, parseSession, replayCookies, requestKey, restoreCachedReplay } from '../../../lib/replay-session';
import '../styles/network.css';
import '../styles/replay.css';

const outcomeLabels = {
  response: '可回放',
  'network-error': '传输错误',
  incomplete: '数据不全',
  pending: '未完成'
};
const emptyRows = [];
const emptyFilters = { query: '', method: '', status: '' };

function isEntryRequest(row, url) {
  return row.method === 'GET' && requestKey('GET', row.url, '') === requestKey('GET', url.href, '');
}

async function recoverCachedEntry(session, url) {
  const entry = createReplayQueue(session.records)('GET', url.href, '');
  if (entry?.status !== 304 || !session.deviceIp || restoreCachedReplay([entry], session.records)[0].restored304) return session;

  let target = entry;
  if (!target.cacheTag) {
    const { [entry.id]: item } = await fetchSessions([entry.id], undefined, 4000).catch(() => ({}));
    if (item?.id !== entry.id || item.startTime !== entry.startTime) return session;
    const captured = captureRow(item, null, new Set([url.hostname]), session.deviceIp);
    if (captured?.status !== 304 || !captured.cacheTag || !isEntryRequest(captured, url)) return session;
    target = { ...entry, cacheTag: captured.cacheTag };
  }

  const address = new URL(url);
  address.hash = '';
  const { items } = await readNetwork({ ip: session.deviceIp, url: address.href, count: 20, dumpCount: 300 });
  const sources = items.flatMap(item => {
    if (Number(item.res?.statusCode) !== 200) return [];
    const row = captureRow(item, null, new Set([url.hostname]), session.deviceIp);
    return row && isEntryRequest(row, url) && isReplayDocument(row) ? [row] : [];
  });
  const [resolved] = restoreCachedReplay([target], sources);
  if (resolved === target) return session;
  const records = session.records.map(row => row === entry ? resolved : row);
  if (records.reduce((size, row) => size + (row.requestBody?.length || 0) + (row.response?.body.length || 0), 0) > BODY_BUDGET) {
    throw new Error('找到同版本的 HTML，但会话空间不足，请缩短录制时间后重抓。');
  }
  return { ...session, records };
}

function readRequestCookie(captured, row, url, deviceIp) {
  if (!matchesCapturedRequest(captured, row, deviceIp)) {
    throw new Error('抓包缓存已移除或变化，请重新抓取或手动输入 Cookie。');
  }
  const value = header(captured.req?.headers, 'cookie');
  return replayCookies(value, url.href).length ? value : '';
}

function ReplaySurface({ children }) {
  const { token } = theme.useToken();
  return <div className="mm-replay-page" style={{
    '--mm-primary': token.colorPrimary, '--mm-bg': token.colorBgLayout, '--mm-surface': token.colorBgContainer,
    '--mm-text': token.colorText, '--mm-muted': token.colorTextSecondary, '--mm-border': token.colorBorderSecondary,
    '--mm-subtle': token.colorPrimaryBg, '--mm-replay-success': token.colorSuccess,
    '--mm-replay-warning': token.colorWarningText
  }}>{children}</div>;
}

function ReplayPanelHeading({ icon: Icon, title, children }) {
  return <div className="mm-replay-section-heading">
    <h2>{Icon && <Icon aria-hidden="true" />}{title}</h2>
    {children}
  </div>;
}

function CapturedResponseChoice({ item, rowsById, chosen, busy, onChange, onInspect }) {
  const candidates = item.candidateIds.map(id => rowsById.get(id)).filter(Boolean);
  const onlyCandidate = candidates.length === 1 ? candidates[0] : null;
  const selected = rowsById.get(chosen) || onlyCandidate;
  return <Space wrap size="small" className="mm-replay-mismatch-actions">
    {onlyCandidate && <Checkbox checked={chosen === onlyCandidate.id} disabled={busy}
      onChange={event => onChange(item.scope, event.target.checked ? onlyCandidate.id : undefined)}>使用这条抓取响应</Checkbox>}
    {candidates.length > 1 && <Select size="small" aria-label="选择抓取响应" placeholder="选择抓取响应" allowClear
      value={chosen} disabled={busy} onChange={id => onChange(item.scope, id)} options={candidates.map(row => ({
        value: row.id, label: `${row.status} · ${new Date(row.startTime).toLocaleTimeString()} · ${row.id}`
      }))} />}
    {selected && <Button size="small" type="link" onClick={() => onInspect(selected.id)}>查看抓取详情</Button>}
  </Space>;
}

export default function ReplayWorkspace({ open, layout: Layout = React.Fragment }) {
  const [devices, setDevices] = useState([]);
  const [deviceError, setDeviceError] = useState('');
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let cursor, timer;
    async function discover() {
      try {
        const batch = await fetchNetwork(cursor, [], controller.signal);
        if (controller.signal.aborted) return;
        cursor = batch.cursor || batch.endId || cursor;
        setDeviceError('');
        setDevices(current => [...new Set([...current, ...batch.rows.map(row => row.clientIp).filter(Boolean)])].sort());
      } catch (error) {
        if (!controller.signal.aborted) setDeviceError(error.message);
      }
      if (!controller.signal.aborted) timer = setTimeout(discover, 2500);
    }
    discover();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [open]);
  const [ip, setIp] = useState('');
  const [entryValue, setEntry] = useState(null);
  const entry = entryValue ?? '';
  const [extraHosts, setExtraHosts] = useState('');
  const [recording, setRecording] = useState(null);
  const [session, setSession] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [notice, setNotice] = useState('');
  const [stopping, setStopping] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [directTypes, setDirectTypes] = useState([]);
  const [replayAction, setReplayAction] = useState(null);
  const [overrideDraft, setOverrideDraft] = useState(null);
  const [diagnosticView, setDiagnosticView] = useState('blocked');
  const [actionFeedback, setActionFeedback] = useState(null);
  const [supplementing, setSupplementing] = useState(false);
  const [supplementResult, setSupplementResult] = useState(null);
  const [replayStatus, setReplayStatus] = useState(null);
  const [replayRun, setReplayRun] = useState(null);
  const [cookieHeader, setCookieHeader] = useState('');
  const [autoCookie, setAutoCookie] = useState(true);
  const [cookieLoading, setCookieLoading] = useState(false);
  const [cookieError, setCookieError] = useState('');
  const recordedCookie = useRef(null);
  const stopRequested = useRef(false);
  const fileInput = useRef(null);
  const requestDetails = useRef(null);
  const capturePanel = useRef(null);
  const requestList = useRef(null);
  const cacheIp = ip || session?.deviceIp || '';
  const cacheSetting = useReplayCacheSetting(open, cacheIp);
  const cacheSyncPending = cacheSetting.busy || cacheSetting.needsSync;

  const start = () => {
    if (cacheSyncPending) return;
    try {
      if (!ip || !devices.includes(ip)) throw new Error('请先让手机通过代理访问一次，再选择抓包中出现的设备 IP');
      const address = entry.trim() ? httpUrl(entry.trim()) : null;
      const hosts = address ? new Set([address.hostname]) : null;
      for (const host of address ? extraHosts.split(/[\s,，]+/).filter(Boolean) : []) {
        const parsed = httpUrl('https://' + host);
        if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.port) {
          throw new Error('其他域名请填写主机名，用逗号分隔');
        }
        hosts.add(parsed.hostname);
      }
      stopRequested.current = false;
      setNotice('');
      setSelected(null);
      setFilters(emptyFilters);
      setSession(null);
      setReplayStatus(null);
      setReplayRun(null);
      setCookieHeader('');
      setCookieError('');
      recordedCookie.current = null;
      setRecording({ ip, entryUrl: address?.href || '', hosts });
    } catch (error) {
      setNotice(error.message);
    }
  };

  useEffect(() => {
    if (!recording) return;
    const controller = new AbortController();
    const records = new Map();
    const { ip, entryUrl, hosts } = recording;
    let entryAddress = entryUrl ? httpUrl(entryUrl) : null;
    const scope = entryUrl ? createCaptureScope(entryUrl) : null;
    let cursor;
    let timer;
    let bodySize = 0;
    let drainCount = 0;
    let truncated = false;
    const startedAt = Date.now();

    function snapshot() {
      return { version: 1, entryUrl: entryAddress?.href || '', deviceIp: ip, startedAt, truncated,
        records: [...records.values()].sort((a, b) => a.startTime - b.startTime) };
    }
    function finish(message) {
      setNotice(message || (!entryAddress ? '没有录到完整的入口 HTML，请让对方重新打开或刷新问题页面后再抓取。' : ''));
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
          scope?.remember(item, row);
          const size = (row.requestBody?.length || 0) + (row.response?.body.length || 0);
          if (bodySize + size > BODY_BUDGET) {
            truncated = true;
            row.requestBody = null;
            row.response = null;
            row.outcome = 'incomplete';
          } else {
            bodySize += size;
          }
          if (!entryAddress && (isReplayDocument(row) || isCachedReplayDocument(row))) entryAddress = httpUrl(row.url);
          if (entryAddress && httpUrl(row.url).origin === entryAddress.origin &&
              (!recordedCookie.current || (!recordedCookie.current.fromEntry && isEntryRequest(row, entryAddress)))) {
            try {
              const value = readRequestCookie(item, row, entryAddress, ip);
              if (value) recordedCookie.current = { origin: entryAddress.origin, value, fromEntry: isEntryRequest(row, entryAddress) };
            } catch {
              // Some captured Cookie headers cannot be used in a browser.
            }
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
    let entryUrl;
    try { entryUrl = httpUrl(entry.trim() || session.entryUrl).href; }
    catch { setNotice('请选择已抓取的入口页，或输入有效的 HTTP/HTTPS 地址。'); return; }
    const blob = new Blob([JSON.stringify({ ...session, entryUrl })], { type: 'application/json' });
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
      setCookieError('');
      setReplayStatus(null);
      setReplayRun(null);
      setSelected(null);
      setFilters(emptyFilters);
      setNotice('');
    } catch (error) {
      setNotice(error.message);
    }
  };

  const replayId = replayRun?.id;
  const changeOverrideDraft = (scope, recordId) => {
    setOverrideDraft(current => {
      const selections = new Map(current?.id === replayId ? current.selections : []);
      if (recordId !== undefined) selections.set(scope, recordId);
      else selections.delete(scope);
      return { id: replayId, selections };
    });
  };
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
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error.response?.status === 404) {
          setReplayRun(current => current?.id === replayId ? { ...current, running: false } : current);
        } else {
          timer = setTimeout(poll, 2000);
        }
      }
    }
    poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [open, replayId]);

  const controlReplay = async action => {
    if (!replayId || replayAction) return;
    setReplayAction(action);
    setActionFeedback(null);
    try {
      await axios.post('/cgi-bin/replay-session/control', action, {
        params: { id: replayId }, timeout: 3000
      });
      if (action.type === 'apply-overrides') {
        setOverrideDraft(null);
        setActionFeedback({ id: replayId, type: 'success', message: `已提交 ${action.selections.length} 条参数例外。` });
      } else if (action.type === 'remove-override') {
        setActionFeedback({ id: replayId, type: 'success', message: '已撤销例外，正在按原规则重新加载。' });
      }
    } catch (error) {
      setActionFeedback({ id: replayId, type: 'error', address: action.entryUrl !== undefined,
        message: error.response?.data?.message || '复现操作没有送达，请检查窗口状态后重试。' });
    } finally {
      setReplayAction(null);
    }
  };

  async function supplementAssets() {
    setSupplementing(true);
    setSupplementResult(null);
    try {
      const { data } = await axios.post('/cgi-bin/replay-session/supplement', null, {
        params: { id: replayId }, timeout: 22000
      });
      if (!Array.isArray(data?.records) || !Array.isArray(data.failures)) throw new Error('插件未返回补录结果，请刷新后重试。');
      setSession(current => {
        const ids = new Set(current.records.map(row => row.id));
        return { ...current, records: [...current.records, ...data.records.filter(row => !ids.has(row.id))] };
      });
      const failed = data.failures.length;
      setSupplementResult({
        id: replayId,
        type: failed || data.notice || !data.records.length ? 'warning' : 'success',
        message: data.notice || (data.added ? `已直连补录 ${data.added} 条资源，正在重新回放。` :
          failed ? '未能补录静态资源' : data.records.length ? '补录数据已同步到会话。' : '暂无可补录的静态资源。'),
        description: failed ? <ul className="mm-replay-supplement-failures">{data.failures.map((item, index) =>
          <li key={index}>{item.url} · {item.reason}</li>)}</ul> : undefined
      });
    } catch (error) {
      setSupplementResult({ id: replayId, type: 'error', message: error.response?.data?.message || error.message });
    } finally {
      setSupplementing(false);
    }
  }

  const readCapturedCookie = async () => {
    setCookieLoading(true);
    setCookieError('');
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
      setCookieError(error.message);
    } finally {
      setCookieLoading(false);
    }
  };

  const changeEntry = value => {
    setCookieError('');
    // An edited hash or path can reuse credentials, but a different origin cannot.
    try {
      if (httpUrl(value?.trim()).origin !== httpUrl(entry.trim() || session?.entryUrl).origin) setCookieHeader('');
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
    setDiagnosticView('blocked');
    setLaunching(true);
    try {
      const url = httpUrl(entry.trim() || session.entryUrl);
      const recovered = await recoverCachedEntry(session, url);
      if (recovered !== session) setSession(recovered);
      const manual = cookieHeader.trim();
      const cookie = manual || (autoCookie ? await findAutomaticCookie(url) : '');
      replayCookies(cookie, url.href);
      const { data } = await axios.post('/cgi-bin/replay-session', {
        session: { ...recovered, entryUrl: url.href },
        cookieHeader: cookie,
        directTypes
      }, { timeout: 25000 });
      if (data?.ok !== true) throw new Error('插件未返回复现状态，请确认已加载最新版。');
      setReplayStatus({
        type: 'success', message: data.message,
        description: cookie ? (manual ? '已使用手动输入的 Cookie。' : '已自动使用抓包 Cookie。')
          : autoCookie ? '未找到可用的抓包 Cookie。如页面需要登录，可手动输入或重新抓取。' : undefined
      });
      if (data.id) setReplayRun({
        id: data.id, blocked: [], running: true, directTypes, entryUrl: url.href,
        supportsBatchOverrides: data.supportsBatchOverrides
      });
    } catch (error) {
      setReplayStatus({ type: 'error', message: error.response?.data?.message || error.message });
    } finally {
      setLaunching(false);
    }
  };

  const rows = session?.records || emptyRows;
  const blockedRequests = replayRun?.blocked || [];
  const appliedDirectTypes = replayRun?.directTypes || [];
  const directTypesChanged = directTypes.length !== appliedDirectTypes.length ||
    directTypes.some(type => !appliedDirectTypes.includes(type));
  const liveResources = Object.entries(replayRun?.liveResources || {});
  const liveResourceCount = liveResources.reduce((sum, [, count]) => sum + count, 0);
  const overrides = replayRun?.overrides || [];
  const appliedScopes = new Set(overrides.map(item => item.scope));
  const availableOverrides = replayRun?.running ? blockedRequests.filter(item => item.scope && !appliedScopes.has(item.scope)) : [];
  const selectedOverrides = overrideDraft?.id === replayId ? overrideDraft?.selections : undefined;
  const overrideSelections = availableOverrides.flatMap(item => {
    const recordId = selectedOverrides?.get(item.scope);
    return item.candidateIds.includes(recordId) ? [{ scope: item.scope, recordId }] : [];
  });
  const controlBusy = supplementing || !!replayAction;
  const directCount = rows.filter(row => row.source === 'direct').length;
  const canSupplement = replayRun?.running && (replayRun.missingAssets > 0 || replayRun.directCount > directCount);
  const supplementFeedback = supplementResult && supplementResult.id === replayId && <Alert showIcon
    type={supplementResult.type} message={supplementResult.message} description={supplementResult.description} />;
  const missingStartupResources = blockedRequests.filter(item =>
    (item.type === 'script' || item.type === 'stylesheet') && item.reason === '会话里没有录到这条请求');
  const diagnosticFeedback = actionFeedback?.id === replayId && !actionFeedback?.address ? actionFeedback : null;
  const restoredRows = useMemo(() => restoreCachedReplay(rows), [rows]);
  const rowsById = useMemo(() => new Map(restoredRows.map(row => [row.id, row])), [restoredRows]);
  const inspectCapturedResponse = id => {
    setSelected(id);
    requestAnimationFrame(() => requestDetails.current?.scrollIntoView({ block: 'nearest' }));
  };
  const methods = useMemo(() => [...new Set(rows.map(row => row.method))].sort(), [rows]);
  const filteredRows = useMemo(() => {
    const terms = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return restoredRows.filter(row => {
      const status = row.restored304 ? 304 : row.status;
      const value = `${row.method} ${row.url} ${status || ''} ${outcomeLabels[row.outcome] || ''}`.toLowerCase();
      if ((filters.method && row.method !== filters.method) || !terms.every(term => value.includes(term))) return false;
      if (filters.status === 'error') return status >= 400 || row.outcome === 'network-error';
      if (filters.status === 'pending') return row.outcome === 'pending';
      if (filters.status === '304') return status === 304;
      return !filters.status || Math.floor(status / 100) === Number(filters.status);
    });
  }, [filters, restoredRows]);
  const changeFilter = (field, value) => setFilters(current => ({ ...current, [field]: value || '' }));
  const previewActive = !!replayRun?.running;
  const pages = new Map();
  for (const row of restoredRows) {
    if (!pages.has(row.url) && (isReplayDocument(row) || isCachedReplayDocument(row))) {
      pages.set(row.url, { value: row.url, label: row.url + (row.restored304 ? '（304，已补齐正文）' : row.status === 304 ? '（304，缺少正文）' : '') });
    }
  }
  const entryOptions = [...pages.values()];
  const replayEntry = entry.trim() || session?.entryUrl;
  const hasEntry = !!replayEntry;
  let normalizedEntry = replayEntry;
  if (replayEntry) {
    try { normalizedEntry = httpUrl(replayEntry).href; } catch { /* The replay API reports invalid addresses. */ }
  }
  const entryChanged = !!replayRun?.entryUrl && normalizedEntry !== replayRun.entryUrl;
  const replaySettingsChanged = directTypesChanged || entryChanged;
  const reloadLabel = replaySettingsChanged ? '应用并重新加载' : '重新加载入口';
  const capturedEntry = session?.entryUrl && entryOptions.find(({ value }) =>
    requestKey('GET', value, '') === requestKey('GET', session.entryUrl, ''))?.value;
  const origin = rows.length ? Math.min(...rows.map(row => row.startTime)) : 0;
  const total = Math.max(1, ...rows.map(row => row.startTime - origin + row.duration));
  const chosen = restoredRows.find(row => row.id === selected);
  useEffect(() => {
    if (!open) return;
    const list = requestList.current;
    const workspace = list.closest('.mm-replay-workspace');
    const measure = () => {
      const workspaceTop = workspace.getBoundingClientRect().top + window.scrollY;
      workspace.style.setProperty('--mm-replay-side-height', `${Math.max(0, Math.floor(window.innerHeight - workspaceTop - 24))}px`);
      const body = list.querySelector('.ant-table-body');
      if (!body) return;
      const top = body.getBoundingClientRect().top + window.scrollY;
      const padding = Number.parseFloat(window.getComputedStyle(list).paddingBottom) || 0;
      const available = Math.max(155, Math.floor(window.innerHeight - top - padding - 24));
      list.style.setProperty('--mm-replay-available-height', `${available}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    observer.observe(capturePanel.current);
    window.addEventListener('resize', measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [open]);
  const selectEntry = value => {
    setSession(current => ({ ...current, entryUrl: value }));
    changeEntry(null);
  };
  const columns = [
    { title: '请求', render: (_, row) => {
      const url = new URL(row.url);
      return <button className="mm-replay-request-link" title={row.url} aria-label={row.method + ' ' + row.url}
        onClick={event => { event.stopPropagation(); inspectCapturedResponse(row.id); }}>
        <span className="mm-replay-method">{row.method}</span>
        <span className="mm-replay-request-address">
          <strong>{url.pathname}</strong>
          <small>{url.host}{url.search}</small>
        </span>
      </button>;
    } },
    { title: '状态', width: 116, render: (_, row) => <Tag color={row.status >= 400 || row.outcome === 'network-error' ? 'error' :
      row.status === 304 ? 'warning' : row.outcome === 'response' ? 'success' : undefined}>
      {row.source === 'direct' ? '200 直连补录' : row.restored304 ? '304 已补齐正文' : row.status === 304 ? '304 缺少正文' : `${row.status || ''} ${outcomeLabels[row.outcome] || row.outcome}`}
    </Tag> },
    { title: '耗时 / 偏移', width: 100, render: (_, row) => <div className="mm-replay-row-timing">
      <span>{row.duration} ms</span>
      <small>+{((row.startTime - origin) / 1000).toFixed(2)} s</small>
      <div className="mm-replay-track" aria-hidden="true"><span style={{
        left: (row.startTime - origin) / total * 100 + '%',
        width: Math.max(1, row.duration / total * 100) + '%'
      }} /></div>
    </div> }
  ];

  if (!open) return null;
  const canLaunch = !recording && rows.length > 0 && hasEntry && !cookieLoading && !previewActive && !launching;
  return <Layout><ReplaySurface>
    <header className="mm-replay-heading">
      <div className="mm-replay-heading-title">
        <span className="mm-replay-heading-icon"><AimOutlined aria-hidden="true" /></span>
        <div>
          <h1>故障复现</h1>
          <p>采集设备请求，检查会话，并在独立 Chrome 窗口复现页面。</p>
        </div>
      </div>
      <dl className="mm-replay-summary">
        <div><dt>会话请求</dt><dd>{session ? rows.length : '—'}</dd></div>
        <div><dt>未匹配</dt><dd className={blockedRequests.length ? 'mm-replay-summary-warning' : ''}>
          {replayRun ? blockedRequests.length : '—'}</dd></div>
        <div><dt>直连加载</dt><dd className={liveResourceCount ? 'mm-replay-summary-success' : ''}>
          {replayRun ? liveResourceCount : '—'}</dd></div>
      </dl>
    </header>
    <div className="mm-replay-workspace">
      <section ref={capturePanel} className="mm-replay-capture-settings" aria-label="采集设置">
        <ReplayPanelHeading icon={DatabaseOutlined} title="采集与会话">
          <Tag color={recording ? 'processing' : session ? 'success' : undefined}>
            {recording ? '采集中' : session ? '会话已就绪' : '等待采集'}
          </Tag>
        </ReplayPanelHeading>
        {!session && <Typography.Text type="secondary">先让手机通过 Whistle 代理访问一次，再选择设备。也可以直接打开会话文件。</Typography.Text>}
        <div className={`mm-replay-inputs${!recording && entryOptions.length ? ' mm-replay-inputs-with-history' : ''}`}>
          <div className="mm-replay-field">
            <label htmlFor="replay-device-ip">设备 IP</label>
            <Select id="replay-device-ip" aria-label="抓包设备 IP" placeholder="选择设备 IP" showSearch disabled={!!recording || cacheSetting.busy}
              value={ip || undefined} onChange={setIp} options={devices.map(value => ({ value }))}
              notFoundContent="暂无可选设备" />
          </div>
          <div className="mm-replay-field">
            <label htmlFor="replay-entry-url">入口 URL <small>可选</small></label>
            <Input id="replay-entry-url" aria-label="复现入口 URL" placeholder="留空时从抓包识别" disabled={!!recording || cookieLoading || launching || previewActive}
              value={entry} onChange={e => changeEntry(e.target.value)} />
          </div>
          {!recording && !!entryOptions.length && <div className="mm-replay-field">
            <label htmlFor="replay-captured-entry">抓包入口</label>
            <Select id="replay-captured-entry" aria-label="从抓包选择入口页" placeholder="从抓包选择入口页" showSearch
              className="mm-replay-entry-select" value={capturedEntry} disabled={cookieLoading || launching || previewActive}
              options={entryOptions} onChange={selectEntry} />
          </div>}
        </div>
        {deviceError && <Alert type="warning" showIcon message={deviceError} />}
        <div className="mm-replay-capture-options">
          <ReplayCacheSetting ip={cacheIp} setting={cacheSetting} />
          <details className="mm-replay-disclosure">
            <summary>补充抓包域名 {extraHosts.trim() && <small>已填写</small>}</summary>
            <div className="mm-replay-disclosure-content">
              <Input aria-label="其他抓包域名" placeholder="多个域名用逗号分隔" disabled={!!recording || !entry.trim()}
                value={extraHosts} onChange={e => setExtraHosts(e.target.value)} />
              <Typography.Text type="secondary">填写入口 URL 后，可补充其他 API 或静态资源域名。</Typography.Text>
            </div>
          </details>
        </div>
        {notice && <Alert type="warning" showIcon message={notice} />}
        {recording && <Alert type="info" showIcon message={session ? '抓取中，请让对方复现问题' : '正在连接 Whistle，请稍候'} />}
        <div className="mm-replay-capture-footer">
          <Space wrap>
            {recording ? <Button danger loading={stopping} onClick={() => { stopRequested.current = true; setStopping(true); }}>结束抓取</Button>
              : <Button type={rows.length ? 'default' : 'primary'} disabled={launching || cookieLoading || previewActive || cacheSyncPending} onClick={start}>开始抓取</Button>}
            <Button disabled={!!recording || launching || cookieLoading || previewActive} onClick={() => fileInput.current?.click()}>打开会话文件</Button>
            <input ref={fileInput} hidden type="file" accept=".json,application/json" onChange={load} />
            <Button disabled={!!recording || !rows.length || !hasEntry || supplementing} onClick={download}>保存会话文件</Button>
          </Space>
          {session && <div className="mm-replay-session-meta">
            {typeof session.deviceIp === 'string' && <span>{session.deviceIp}</span>}
            <time>{new Date(session.startedAt).toLocaleString()}</time>
            {session.truncated && <Tag color="warning">部分数据未保存</Tag>}
          </div>}
        </div>
      </section>
      <section className="mm-replay-workspace-side" aria-label="回放和诊断">
        <div className="mm-replay-playback-settings">
          <ReplayPanelHeading icon={DesktopOutlined} title="Chrome 复现">
            <Tag color={previewActive ? 'processing' : undefined}>
              {previewActive ? '窗口运行中' : launching ? '正在启动' : '独立窗口'}
            </Tag>
          </ReplayPanelHeading>
          <div className="mm-replay-playback-entry">
            <label htmlFor="replay-playback-url">复现地址</label>
            <Input id="replay-playback-url" aria-label="复现地址" placeholder={session?.entryUrl || '输入或粘贴完整 URL'}
              value={entryValue ?? session?.entryUrl ?? ''} disabled={!!recording || launching || cookieLoading}
              onChange={event => {
                changeEntry(event.target.value);
                if (actionFeedback?.address) setActionFeedback(null);
              }}
              suffix={replayEntry && <Typography.Text copyable={{ text: replayEntry }} />} />
          </div>
          {previewActive && entryChanged && <Typography.Text type="secondary">当前窗口仍使用原地址。应用后会从新地址重新加载。</Typography.Text>}
          {actionFeedback?.address && actionFeedback.id === replayId &&
            <Alert showIcon type={actionFeedback.type} message={actionFeedback.message} />}
          {!!rows.length && hasEntry && !recording && <details className="mm-replay-disclosure">
            <summary>登录与 Cookie <small>{cookieHeader ? '已设置' : autoCookie ? '自动读取' : '已关闭'}</small></summary>
            <div className="mm-replay-disclosure-content">
              <Checkbox checked={autoCookie} disabled={cookieLoading || launching}
                onChange={event => setAutoCookie(event.target.checked)}>复现时自动读取抓包 Cookie</Checkbox>
              <div className="mm-replay-cookie-input">
                <Input.Password aria-label="复现 Cookie" placeholder="复现 Cookie（可选）" autoComplete="off"
                  value={cookieHeader} disabled={cookieLoading || launching} onChange={event => {
                    setCookieHeader(event.target.value);
                    setCookieError('');
                  }} />
                <Button loading={cookieLoading} disabled={launching} onClick={readCapturedCookie}>从抓包读取 Cookie</Button>
              </div>
              <Typography.Text type="secondary">手动值优先，仅用于隔离浏览器的入口域名。导出会话文件时不会写入这个值。</Typography.Text>
              {cookieError && <Alert showIcon type="warning" message={cookieError} />}
            </div>
          </details>}
          <div className="mm-replay-direct-options" role="group" aria-label="缺失资源直连类型">
            <Typography.Text strong>缺失资源直连（可多选）</Typography.Text>
            <Space wrap size="small">
              {['js', 'css', 'font', 'png', 'jpg', 'gif', 'webp', 'svg'].map(type => {
                const checked = directTypes.includes(type);
                return <Button key={type} size="small" aria-pressed={checked} type={checked ? 'primary' : 'default'}
                  disabled={launching || controlBusy}
                  onClick={() => setDirectTypes(current => current.includes(type) ? current.filter(value => value !== type) : [...current, type])}>{REPLAY_RESOURCE_TYPES[type]}</Button>;
              })}
            </Space>
            <Typography.Text type="secondary">优先使用抓包。勾选类型中未录到的资源会绕过 Whistle，直接向公网域名请求。</Typography.Text>
            {replayRun?.running && <Typography.Text type="secondary">
              当前生效：{appliedDirectTypes.map(type => REPLAY_RESOURCE_TYPES[type]).join('、') || '未开启直连'}
              {directTypesChanged && '。点击「应用并重新加载」使新选择生效。'}
            </Typography.Text>}
          </div>
          <Space wrap className="mm-replay-card-actions">
            {previewActive ? <>
              <Button type={replaySettingsChanged ? 'primary' : 'default'} disabled={controlBusy}
                aria-label={reloadLabel}
                loading={replayAction?.type === 'restart'}
                onClick={() => controlReplay({ type: 'restart', ...(directTypesChanged && { directTypes }),
                  ...(entryChanged && { entryUrl: normalizedEntry || '' }) })}>
                {reloadLabel}
              </Button>
              <Button danger disabled={controlBusy} onClick={() => controlReplay({ type: 'stop' })}>结束复现</Button>
            </> : <Button type="primary" icon={<DesktopOutlined aria-hidden="true" />} disabled={!canLaunch} loading={launching}
              onClick={replay}>在 Chrome 窗口复现</Button>}
          </Space>
          {replayRun && !replayRun.running ? <Typography.Text type="secondary">复现已结束</Typography.Text>
            : replayStatus && <Alert className="mm-replay-inline-status" showIcon {...replayStatus} />}
        </div>
        <section className="mm-replay-diagnostic-panel" data-idle={!replayRun || undefined} aria-label="复现诊断">
          <div className="mm-replay-diagnostic-header">
            <ReplayPanelHeading icon={RadarChartOutlined} title="复现诊断" />
            {liveResourceCount > 0 && <div className="mm-replay-diagnostic-summary">
              <strong>{`已直连加载 ${liveResourceCount} 条缺失资源`}</strong>
              <span>{liveResources.map(([type, count]) => `${REPLAY_RESOURCE_TYPES[type]} ${count} 条`).join(' · ')}</span>
            </div>}
            {replayRun && <Segmented size="small" block aria-label="诊断列表" value={diagnosticView} onChange={setDiagnosticView}
              options={[
                { value: 'blocked', label: `未匹配 ${blockedRequests.length}` },
                { value: 'applied', label: `已应用 ${overrides.length}` }
              ]} />}
          </div>
          <div className="mm-replay-diagnostic-scroll" key={diagnosticView} role="region" tabIndex={0}
            aria-label={diagnosticView === 'applied' ? '已应用的参数例外' : '未匹配的请求'}>
            {diagnosticFeedback && <Typography.Text role={diagnosticFeedback.type === 'error' ? 'alert' : 'status'}
              type={diagnosticFeedback.type === 'error' ? 'danger' : 'success'} className="mm-replay-diagnostic-feedback">
              {diagnosticFeedback.message}
            </Typography.Text>}
            {diagnosticView === 'applied' ? (
              overrides.length ? <ul className="mm-replay-diagnostic-list">{overrides.map(item => <li key={item.scope}>
                <div className="mm-replay-diagnostic-request">
                  <span className="mm-replay-method">{item.method}</span>
                  <span title={item.url}>{item.url}</span>
                </div>
                <Space wrap size="small" className="mm-replay-mismatch-actions">
                  <Button size="small" type="link" aria-label="查看使用的抓取响应" onClick={() => inspectCapturedResponse(item.recordId)}>查看响应</Button>
                  {replayRun.running && <Button size="small" type="text" disabled={controlBusy}
                    loading={replayAction?.type === 'remove-override' && replayAction.scope === item.scope}
                    onClick={() => controlReplay({ type: 'remove-override', scope: item.scope })}>撤销例外</Button>}
                </Space>
              </li>)}</ul> : <div className="mm-replay-empty"><strong>暂无已应用的参数例外</strong></div>
            ) : <>
              {(canSupplement || supplementing) && <div className="mm-replay-diagnostic-tools">
                {!!missingStartupResources.length && <span>缺少 {missingStartupResources.length} 条脚本或样式</span>}
                <Button size="small" disabled={controlBusy} loading={supplementing}
                  onClick={supplementAssets}>直连补录静态资源</Button>
              </div>}
              {supplementFeedback}
              {!!availableOverrides.length && <div className="mm-replay-batch-actions">
                <span title="参数例外仅在本次窗口生效">已选 {overrideSelections.length} 条参数例外</span>
                <Button type="primary" size="small" disabled={controlBusy || !overrideSelections.length || !replayRun.supportsBatchOverrides}
                  loading={replayAction?.type === 'apply-overrides'}
                  onClick={() => controlReplay({ type: 'apply-overrides', selections: overrideSelections })}>应用所选例外</Button>
                {!replayRun.supportsBatchOverrides && <Typography.Text type="warning" className="mm-replay-batch-version">
                  当前 Whistle 插件后端还未更新。请保存会话并结束复现，重新加载插件后即可批量应用。
                </Typography.Text>}
              </div>}
              {blockedRequests.length ? <ul className="mm-replay-diagnostic-list">
                {blockedRequests.map(item => <li key={item.scope || JSON.stringify(item)}>
                  <div className="mm-replay-diagnostic-request">
                    <span className="mm-replay-method">{item.method}</span>
                    <span title={item.url}>{item.url}</span>
                  </div>
                  <div className="mm-replay-diagnostic-reason">{item.reason}{item.detail && `（${item.detail}）`}</div>
                  {replayRun.running && item.scope && !appliedScopes.has(item.scope) &&
                    <CapturedResponseChoice item={item} rowsById={rowsById} busy={controlBusy}
                      chosen={item.candidateIds.includes(selectedOverrides?.get(item.scope)) ? selectedOverrides.get(item.scope) : undefined}
                      onChange={changeOverrideDraft} onInspect={inspectCapturedResponse} />}
                </li>)}
              </ul> : !supplementing && !canSupplement && !supplementFeedback && <div className="mm-replay-empty">
                <strong>{replayRun ? '暂无未匹配请求' : '等待回放'}</strong>
              </div>}
            </>}
          </div>
        </section>
      </section>
      <div className={`mm-replay-inspection${chosen ? ' mm-replay-inspection-detail' : ''}`}>
        <section ref={requestList} className="mm-replay-record-list" aria-label="会话请求列表">
          <ReplayPanelHeading icon={SearchOutlined} title="会话请求">
            <Tag>{filteredRows.length === rows.length ? rows.length : `${filteredRows.length} / ${rows.length}`} 条</Tag>
          </ReplayPanelHeading>
          <div className="mm-replay-search">
            <Input aria-label="搜索会话请求" placeholder="搜索 URL、方法或状态码" allowClear prefix={<SearchOutlined aria-hidden="true" />}
              value={filters.query} onChange={e => changeFilter('query', e.target.value)} />
            <Select aria-label="筛选会话请求方法" value={filters.method || undefined} placeholder="全部方法" allowClear
              onChange={value => changeFilter('method', value)} options={methods.map(value => ({ value }))} />
            <Select aria-label="筛选会话请求状态" value={filters.status || undefined} placeholder="全部状态" allowClear
              onChange={value => changeFilter('status', value)} options={[
                { value: '2', label: '2xx' }, { value: '3', label: '3xx' }, { value: '4', label: '4xx' },
                { value: '5', label: '5xx' }, { value: '304', label: '304 缓存' },
                { value: 'error', label: '失败请求' }, { value: 'pending', label: '未完成' }
              ]} />
          </div>
          <Table rowKey="id" size="small" columns={columns} dataSource={filteredRows}
            tableLayout="fixed" scroll={{ x: 350, y: `var(--mm-replay-table-height, ${chosen ? 'clamp(155px, 30vh, 450px)' : 'clamp(220px, 46vh, 550px)'})` }} pagination={false}
            rowClassName={row => row.id === selected ? 'mm-replay-row-selected' : ''}
            onRow={row => ({ onClick: () => inspectCapturedResponse(row.id) })}
            locale={{ emptyText: <div className="mm-replay-empty">
              <strong>{rows.length ? '没有符合筛选条件的请求' : '暂无会话请求'}</strong>
              <span>{rows.length ? '试试清除筛选或更换关键词。' : '开始抓取或打开会话文件后，请求会出现在这里。'}</span>
            </div> }} />
        </section>
        {chosen && <ReplayRequestDetails key={chosen.id} panelRef={requestDetails} row={chosen} deviceIp={session.deviceIp}
          onClose={() => setSelected(null)} onUseEntry={selectEntry}
          allowUseEntry={!recording && !cookieLoading && !launching && !previewActive} />}
      </div>
    </div>
  </ReplaySurface></Layout>;
}
