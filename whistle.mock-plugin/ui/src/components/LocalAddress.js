import React, { useEffect, useState } from 'react';
import { Alert, Button, Popover, QRCode, Select, Space, Typography } from 'antd';
import { CopyOutlined, ExportOutlined, GlobalOutlined, QrcodeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { normalizeServerAddress } from '../utils/server-address';
import WhistleHttpsSettings from './WhistleHttpsSettings';
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
  const [panel, setPanel] = useState(null), [copied, setCopied] = useState(''), [copyError, setCopyError] = useState(false);
  const [refresh, setRefresh] = useState(0), [loading, setLoading] = useState(!cached);
  const [certificateIp, setCertificateIp] = useState('');
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
  useEffect(() => { setPanel(null); }, [location.pathname]);
  useEffect(() => {
    const close = () => setPanel(null);
    window.addEventListener('resize', close); return () => window.removeEventListener('resize', close);
  }, []);
  const copy = async address => {
    try { await navigator.clipboard.writeText(address); setCopied(address); setCopyError(false); }
    catch (e) { setCopyError(true); }
  };
  const togglePanel = (name, open) => {
    setPanel(current => open ? name : current === name ? null : current);
    if (open) { setCopied(''); setCopyError(false); }
  };
  const primary = info?.addresses[0];
  const refreshButton = label => <Button size="small" type="text" aria-label={label} icon={<ReloadOutlined />} loading={loading} onClick={() => setRefresh(value => value + 1)} />;
  const content = <div className="mm-ip-panel"><div className="mm-ip-panel-heading"><strong>Whistle 服务 IP</strong>{refreshButton('刷新本机 IP')}</div>
    <Typography.Paragraph type="secondary" className="mm-ip-hint">服务所在机器的网卡地址，多网卡可分别复制 IP。</Typography.Paragraph>
    {error && <Alert type="warning" message={error} />}
    {info && !info.addresses.length && <Typography.Text type="secondary">未发现可用的非回环 IP</Typography.Text>}
    {info?.addresses.map(address => <div className="mm-ip-row" key={address}><Typography.Text code>{address}</Typography.Text><Button type="text" size="small" aria-label={`复制地址 ${address}`} icon={<CopyOutlined />} onClick={() => copy(address)}>{copied === address ? '已复制' : '复制'}</Button></div>)}
    {copyError && <Typography.Text type="warning">复制失败，请手动选择地址复制。</Typography.Text>}
  </div>;
  const certificateIps = info?.addresses.filter(ip => !ip.includes('%') && !/^fe[89ab][0-9a-f]:/i.test(ip)) || [];
  const ip = certificateIps.includes(certificateIp) ? certificateIp : certificateIps[0];
  const host = ip?.includes(':') ? `[${ip}]` : ip;
  const url = host && info?.port ? `http://${host}:${info.port}/whistle.mock-plugins/whistle-certificate.html` : '';
  const certificateContent = <div className="mm-certificate-panel">
    <div className="mm-ip-panel-heading"><strong>Whistle HTTPS 根证书</strong>{refreshButton('刷新证书下载地址')}</div>
    <Typography.Paragraph type="secondary" className="mm-ip-hint">手机与 Whistle 主机连到同一局域网后，扫码打开下载页。</Typography.Paragraph>
    {error && <Alert type="warning" message={error} />}
    {url ? <>
      {certificateIps.length > 1 && <Select size="small" className="mm-certificate-address" aria-label="选择证书下载 IP"
        value={ip} options={certificateIps.map(address => ({ label: address, value: address }))}
        onChange={setCertificateIp} getPopupContainer={trigger => trigger.parentElement} />}
      <QRCode type="svg" value={url} size={160} color="#111" bgColor="#fff" bordered={false}
        className="mm-certificate-qr" role="img" aria-label="Whistle 根证书下载二维码" />
      <Typography.Text code className="mm-certificate-url">{url}</Typography.Text>
      <Space size={4} wrap>
        <Button type="link" size="small" href={url} target="_blank" rel="noopener noreferrer" icon={<ExportOutlined aria-hidden />}>打开下载页</Button>
        <Button type="text" size="small" icon={<CopyOutlined aria-hidden />} onClick={() => copy(url)}>{copied === url ? '已复制' : '复制链接'}</Button>
      </Space>
      {copyError && <Typography.Text type="warning">复制失败，请手动选择链接复制。</Typography.Text>}
    </> : !error && <Typography.Text type="secondary">{loading ? '正在读取下载地址…' : '未找到可用的 Whistle 局域网地址或端口。'}</Typography.Text>}
    <WhistleHttpsSettings open={panel === 'certificate'} />
  </div>;
  return <>
    <Popover open={panel === 'address'} onOpenChange={open => togglePanel('address', open)} trigger="click" placement="bottomRight" content={content}>
      <Button size="small" type="text" className="mm-local-address" aria-label="本机 IP 地址" title={primary ? `${primary} · 点击查看和复制` : error || 'Whistle 服务所在机器的 IP'} icon={<GlobalOutlined />}>
        <span className="mm-ip-label">{primary || (loading ? '获取 IP…' : info ? '无可用 IP' : 'IP 未获取')}</span>
      </Button>
    </Popover>
    <Popover open={panel === 'certificate'} onOpenChange={open => togglePanel('certificate', open)} trigger="click" placement="bottomRight" content={certificateContent} fresh>
      <Button type="text" aria-label="下载 Whistle HTTPS 证书" title="下载 Whistle HTTPS 证书" icon={<QrcodeOutlined />} />
    </Popover>
  </>;
}
