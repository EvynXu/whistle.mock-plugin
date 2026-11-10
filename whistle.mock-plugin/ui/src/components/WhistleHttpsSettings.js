import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Space, Spin, Typography } from 'antd';
import axios from 'axios';

const root = '/whistle/cgi-bin/';
const options = [
  { key: 'enableCapture', label: '解密 HTTPS 流量', endpoint: 'intercept-https-connects', field: 'interceptHttpsConnects' },
  { key: 'enableHttp2', label: '启用 HTTP/2', endpoint: 'enable-http2', field: 'enableHttp2' }
];

export default function WhistleHttpsSettings({ open }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [readFailed, setReadFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const expected = useRef(null);

  useEffect(() => {
    if (!open || saving) return;
    const controller = new AbortController();
    setSettings(null);
    setReadFailed(false);
    axios.get(root + 'https-status', { timeout: 5000, signal: controller.signal }).then(({ data }) => {
      if (data?.ec !== 0 || options.some(({ key }) => typeof data[key] !== 'boolean')) throw new Error();
      if (controller.signal.aborted) return;
      setSettings(data);
      if (expected.current) {
        const { key, checked } = expected.current;
        setError(data[key] === checked ? '' : 'Whistle 未应用这次修改，已显示当前设置。');
        expected.current = null;
      }
    }).catch(() => {
      if (!controller.signal.aborted) setReadFailed(true);
    });
    return () => controller.abort();
  }, [open, saving, refresh]);

  async function update({ key, endpoint, field }, checked) {
    setSaving(true);
    setError('');
    expected.current = { key, checked };
    try {
      const { data } = await axios.post(root + endpoint, new URLSearchParams({ [field]: checked ? '1' : '0' }), { timeout: 5000 });
      if (data?.ec !== 0) throw new Error();
    } catch {
      setError('修改请求未确认，正在重新读取 Whistle 设置。');
    } finally {
      setSettings(null);
      setSaving(false);
    }
  }

  return <section className="mm-certificate-settings" aria-label="Whistle 抓包设置">
    <Typography.Text strong>Whistle 抓包设置</Typography.Text>
    {readFailed ? <Alert type="warning" message="无法读取 Whistle 设置，请检查连接或登录状态。"
      action={<Button size="small" onClick={() => setRefresh(value => value + 1)}>重试</Button>} /> :
      settings ? <Space direction="vertical" size={4}>
        {options.map(option => <Checkbox key={option.key} checked={settings[option.key]} disabled={saving}
          onChange={event => update(option, event.target.checked)}>{option.label}</Checkbox>)}
      </Space> : <Space size={8}><Spin size="small" /><Typography.Text type="secondary">正在读取设置…</Typography.Text></Space>}
    {error && !readFailed && <Typography.Text type="warning" role="status">{error}</Typography.Text>}
  </section>;
}
