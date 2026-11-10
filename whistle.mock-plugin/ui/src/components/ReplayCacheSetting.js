import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Space, Typography } from 'antd';

const endpoint = '/cgi-bin/replay-session/cache';

export function useReplayCacheSetting(open, ip) {
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setBusy(true);
    setFailure(null);
    axios.post(endpoint, { action: 'status' }, { signal: controller.signal, timeout: 5000 })
      .then(({ data }) => { if (!controller.signal.aborted) setActive(data.active); })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [open]);

  const update = useCallback(async (action, targetIp) => {
    setBusy(true);
    setFailure(null);
    try {
      const { data } = await axios.post(endpoint, { action, ip: targetIp }, { timeout: 7000 });
      if (action === 'enable' ? data?.active?.ip !== targetIp : data?.active !== null) throw new Error();
      setActive(data.active);
    } catch (error) {
      const message = error.response?.status === 403 ? '请通过 localhost 或 127.0.0.1 打开插件后设置。' :
        error.response?.data?.message || '无法更新设备缓存设置，请重试。';
      setFailure({ ip: targetIp, message });
    } finally {
      setBusy(false);
    }
  }, []);

  const needsSync = !!(active && ip && active.ip !== ip);
  const error = failure?.ip === ip ? failure.message : '';
  useEffect(() => {
    if (open && needsSync && !busy && !error) update('enable', ip);
  }, [open, needsSync, busy, error, ip, update]);

  return { active, busy, needsSync, error, update };
}

export default function ReplayCacheSetting({ ip, setting }) {
  const { active, busy, needsSync, error, update } = setting;
  const toggle = () => update(active && !needsSync ? 'disable' : 'enable', ip);

  return <section className="mm-replay-cache-setting" aria-label="抓取快捷设置">
    <Space wrap>
      <Button size="small" loading={busy || (needsSync && !error)} disabled={!active && !ip} onClick={toggle}>
        {needsSync ? (error ? '重试同步设备缓存' : '正在同步设备缓存') : active ? '恢复设备缓存' : '禁用设备缓存'}
      </Button>
      <Typography.Text type="secondary">
        {needsSync ? (error ? `尚未确认缓存规则已应用到 ${ip}，请重试。` : `正在将缓存规则切换到 ${ip}。`)
          : active ? `${active.ip} 经 Whistle 的请求已禁用缓存，请让客户重新打开页面。`
          : ip ? `可禁用 ${ip} 经 Whistle 的请求缓存。` : '选择设备 IP 后可用。'}
      </Typography.Text>
    </Space>
    {active && !needsSync && <Typography.Text type="secondary">设备直接使用的本地缓存不会经过 Whistle。缺少资源时，请在客户实际使用的 App 或浏览器中清除网页缓存后重抓。</Typography.Text>}
    {error && <Alert type="warning" showIcon message={error} />}
  </section>;
}
