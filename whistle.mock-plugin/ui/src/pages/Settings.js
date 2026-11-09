import React, { useEffect, useState } from 'react';
import { Alert, App, Button, Card, Radio, Space, Spin, Switch, Typography } from 'antd';
import axios from 'axios';
import UIVersionSelector from '../components/UIVersionSelector';
import PageModeSelector from '../components/PageModeSelector';
import PageHeader from '../components/PageHeader';
import { useTheme } from '../theme/ThemeProvider';
export default function Settings() {
  const {
      currentTheme,
      setTheme
    } = useTheme(),
    {
      message
    } = App.useApp();
  const [settings, setSettings] = useState({
    interfaceParamMatcherEnabled: true,
    responseParamMatcherEnabled: true,
    webDavSyncEnabled: false
  });
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(''),
    [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const {
        data
      } = await axios.get('/cgi-bin/settings');
      setSettings(data);
    } catch (e) {
      setError('读取设置失败，请重试。');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const save = async (key, value) => {
    setSaving(key);
    try {
      const {
        data
      } = await axios.put('/cgi-bin/settings', {
        [key]: value
      });
      setSettings(data);
      localStorage.setItem(key, String(value));
      window.dispatchEvent(new Event('storage'));
      message.success('设置已保存并生效');
    } catch (e) {
      message.error('保存失败，设置未改变');
    } finally {
      setSaving('');
    }
  };
  const row = (key, title, description) => <div className="mm-setting-row"><div><h3>{title}</h3><p>{description}</p></div><Space><Typography.Text type="secondary">{settings[key] ? '已开启' : '已关闭'}</Typography.Text><Switch aria-label={title} checked={settings[key] === true} disabled={!!saving || !!error} loading={saving === key} onChange={value => save(key, value)} /></Space></div>;
  return <div className="page-container"><PageHeader kicker="PREFERENCES" title="系统设置" description="外观偏好保存在当前浏览器，匹配和同步设置保存到插件。" />{error && <Alert type="error" message={error} action={<Button onClick={load}>重试</Button>} />}
    <Spin spinning={loading}><div className="mm-settings-layout"><nav aria-label="设置分类" className="mm-settings-nav"><a href="#page-mode" onClick={e => { e.preventDefault(); document.getElementById('page-mode')?.scrollIntoView({ behavior: 'smooth' }); }}>打开方式</a><a href="#appearance" onClick={e => {
            e.preventDefault();
            document.getElementById('appearance')?.scrollIntoView({
              behavior: 'smooth'
            });
          }}>外观</a><a href="#matching" onClick={e => {
            e.preventDefault();
            document.getElementById('matching')?.scrollIntoView({
              behavior: 'smooth'
            });
          }}>匹配规则</a><a href="#sync" onClick={e => {
            e.preventDefault();
            document.getElementById('sync')?.scrollIntoView({
              behavior: 'smooth'
            });
          }}>数据同步</a><a href="#editing" onClick={e => {
            e.preventDefault();
            document.getElementById('editing')?.scrollIntoView({
              behavior: 'smooth'
            });
          }}>编辑与布局</a></nav><div>
      <PageModeSelector />
      <Card id="appearance" title="外观" className="mm-settings-section"><UIVersionSelector /><p className="mm-settings-description">选择主题后立即生效。赛博朋克和大地色系沿用统一工作台布局。</p><Radio.Group value={currentTheme} onChange={e => setTheme(e.target.value)} className="mm-theme-options">{[['light', '经典浅色', '清爽背景，适合日间工作'], ['dark', '深色工作台', '低亮度背景，代码更聚焦'], ['cyber', '赛博朋克', '深色底与青色强调'], ['earth', '大地色系', '温暖底色与铜色强调']].map(([value, label, desc]) => <Radio key={value} value={value}><span><strong>{label}</strong><small>{desc}</small></span></Radio>)}</Radio.Group></Card>
      <Card id="matching" title="匹配规则" className="mm-settings-section">{row('interfaceParamMatcherEnabled', '接口入参匹配', '按请求参数选择接口，同时显示接口匹配条件；关闭后跳过接口级参数检查。')}{row('responseParamMatcherEnabled', '响应入参匹配', '按请求参数选择同一接口的响应；关闭后使用默认响应（接口级目标响应仍优先）。')}<Alert type="info" showIcon message="支持精确、包含、正则匹配和嵌套参数路径。响应条件按顺序检查；没有命中时使用默认响应。" /></Card>
      <Card id="sync" title="数据同步" className="mm-settings-section">{row('webDavSyncEnabled', 'WebDAV 同步入口', '开启后可从功能模块页面连接 WebDAV、推送和拉取配置。关闭入口不会清除连接配置。')}<Typography.Text type="secondary">连接状态与覆盖冲突会在同步窗口中单独显示。</Typography.Text></Card>
      <Card id="editing" title="编辑与布局" className="mm-settings-section"><div className="mm-setting-row"><div><h3>接口工作台</h3><p>接口规则和响应使用统一编辑区；浏览器保存面板宽度、模块选择及列表密度。</p></div><Button onClick={() => {
                ['mm-panel-widths', 'mm-tree-collapsed', 'mm-list-density', 'mm-interface-view', 'mm-hidden-columns'].forEach(k => localStorage.removeItem(k));
                message.success('布局偏好已重置，下次进入工作台生效');
              }}>恢复默认布局</Button></div><Typography.Text type="secondary">修改草稿需保存后生效；离开前提示未保存内容。旧版弹窗/抽屉偏好不再影响工作台。</Typography.Text></Card>
    </div></div></Spin></div>;
}
