import React, { useEffect, useState } from 'react';
import { Alert, Button, Popover, Typography } from 'antd';
import { CopyOutlined, GlobalOutlined, ReloadOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { normalizeServerAddress } from '../utils/server-address';
import '../styles/local-address.css';

let cached = null, cachedAt = 0, pending = null;
const load = force => {
  if (!force && cached && Date.now() - cachedAt < 60000) return Promise.resolve(cached);
  if (pending) return pending;
  pending = axios.get('/whistle/cgi-bin/server-info', { timeout: 5000 }).then(({ data }) => {
    cached = normalizeServerAddress(data); cachedAt = Date.now(); return cached;
  }).finally(() => { pending = null; });
  return pending;
};
export default function LocalAddress() {
  const location = useLocation();
  const [info, setInfo] = useState(cached), [error, setError] = useState('');
  const [open, setOpen] = useState(false), [copied, setCopied] = useState(''), [copyError, setCopyError] = useState(false);
  const [refresh, setRefresh] = useState(0), [loading, setLoading] = useState(!cached);
  useEffect(() => {
    let live = true;
    const update = force => {
      if (live) setLoading(true);
      load(force).then(value => { if (live) { setInfo(value); setError(''); } })
        .catch(() => { if (live) setError('暂时无法读取 Whistle 的 IP，请检查连接或登录状态后重试。'); })
        .finally(() => { if (live) setLoading(false); });
    };
    update(refresh > 0);
    const timer = setInterval(() => { if (!document.hidden) update(true); }, 60000);
    return () => { live = false; clearInterval(timer); };
  }, [refresh]);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('resize', close); return () => window.removeEventListener('resize', close);
  }, []);
  const copy = async address => {
    try { await navigator.clipboard.writeText(address); setCopied(address); setCopyError(false); }
    catch (e) { setCopyError(true); }
  };
  const primary = info?.addresses[0];
  const content = <div className="mm-ip-panel"><div className="mm-ip-panel-heading"><strong>Whistle 服务 IP</strong><Button size="small" type="text" aria-label="刷新本机 IP" icon={<ReloadOutlined />} loading={loading} onClick={() => setRefresh(value => value + 1)} /></div>
    <Typography.Paragraph type="secondary" className="mm-ip-hint">服务所在机器的网卡地址，多网卡可分别复制 IP。</Typography.Paragraph>
    {error && <Alert type="warning" message={error} />}
    {info && !info.addresses.length && <Typography.Text type="secondary">未发现可用的非回环 IP</Typography.Text>}
    {info?.addresses.map(address => <div className="mm-ip-row" key={address}><Typography.Text code>{address}</Typography.Text><Button type="text" size="small" aria-label={`复制地址 ${address}`} icon={<CopyOutlined />} onClick={() => copy(address)}>{copied === address ? '已复制' : '复制'}</Button></div>)}
    {copyError && <Typography.Text type="warning">复制失败，请手动选择地址复制。</Typography.Text>}
  </div>;
  return <Popover open={open} onOpenChange={value => { setOpen(value); if (value) { setCopied(''); setCopyError(false); } }} trigger="click" placement="bottomRight" content={content}>
    <Button size="small" type="text" className="mm-local-address" aria-label="本机 IP 地址" title={primary ? `${primary} · 点击查看和复制` : error || 'Whistle 服务所在机器的 IP'} icon={<GlobalOutlined />}>
      <span className="mm-ip-label">{primary || (loading ? '获取 IP…' : info ? '无可用 IP' : 'IP 未获取')}</span>
    </Button>
  </Popover>;
}
