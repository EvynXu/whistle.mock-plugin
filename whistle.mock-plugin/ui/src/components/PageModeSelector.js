import React, { useState } from 'react';
import { Alert, Button, Card, Typography, theme } from 'antd';
import { CheckOutlined, DesktopOutlined, AppstoreOutlined } from '@ant-design/icons';
import '../styles/page-mode.css';

function ModePreview({ embedded }) {
  return <div className="mm-mode-preview" aria-hidden="true">
    <div className="mm-mode-browser"><i /><i /><i /><span>{embedded ? 'Whistle / Plugins' : 'MockMaster'}</span></div>
    <div className="mm-mode-window">
      {embedded && <div className="mm-mode-whistle-nav"><span>Network</span><span>Rules</span><span>Values</span><b>Plugins</b></div>}
      <div className="mm-mode-app"><div className="mm-mode-app-nav"><strong>MockMaster</strong><span>功能模块</span><span>接口工作台</span></div>
        <div className="mm-mode-app-content"><div className="mm-mode-app-list"><i /><i /><i /></div><div className="mm-mode-app-editor"><b>响应内容</b><i /><i /><i /></div></div>
      </div>
    </div>
  </div>;
}

export default function PageModeSelector() {
  const { token } = theme.useToken();
  const embedded = window.self !== window.top;
  const [error, setError] = useState('');
  const switchMode = mode => {
    setError('');
    try {
      if (mode === 'standalone') {
        window.top.location.assign(new URL(`/whistle.mock-plugins/${window.location.hash || '#/'}`, window.location.origin).href);
        return;
      }
      // Whistle scopes its tab preferences by the full Web UI URL.
      // Preserve existing tabs and activate this plugin when opening Plugins.
      const home = new URL('/', window.location.origin).href;
      let tabs;
      try { tabs = JSON.parse(localStorage.getItem(`${home}?activePluginTabList`)); } catch (e) {}
      tabs = Array.isArray(tabs) ? tabs.filter(name => typeof name === 'string') : [];
      if (!tabs.includes('mock-plugins')) tabs.push('mock-plugins');
      localStorage.setItem(`${home}?activePluginTabList`, JSON.stringify(tabs));
      localStorage.setItem(`${home}?activePluginTabName`, 'mock-plugins');
      // A plugin Referer makes Whistle route even '/' back to the plugin.
      // Enter the canonical core URL without that Referer so its relative
      // plugin iframe URLs resolve correctly.
      const link = document.createElement('a');
      link.href = `${home}#plugins`;
      link.target = '_top';
      link.rel = 'noreferrer';
      link.referrerPolicy = 'no-referrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setError('切换失败，请允许本站使用浏览器存储，并从 Whistle 插件入口重试。');
    }
  };
  return <Card id="page-mode" title="打开方式" className="mm-settings-section settings-card" style={{ marginBottom: 20,
    '--mode-border': token.colorBorderSecondary, '--mode-bg': token.colorBgContainer,
    '--mode-fill': token.colorFillQuaternary, '--mode-primary': token.colorPrimary,
    '--mode-text': token.colorText, '--mode-muted': token.colorTextSecondary
  }}>
    <Typography.Paragraph type="secondary" className="mm-page-mode-intro">选择适合当前工作的页面。两种方式连接同一个插件，共用所有模块、接口和响应数据。</Typography.Paragraph>
    <div className="mm-page-mode-grid">
      {[{ mode: 'standalone', title: '独立页面', description: '只显示 MockMaster，留出更大的编辑空间，适合专注配置接口和响应。', icon: <DesktopOutlined /> },
        { mode: 'whistle', title: 'Whistle 插件页面', description: '在 Whistle 的 Plugins 中打开，保留代理工具导航，方便同时查看抓包和规则。', icon: <AppstoreOutlined /> }].map(option => {
        const current = (option.mode === 'whistle') === embedded;
        return <article key={option.mode} className={`mm-page-mode-option${current ? ' is-current' : ''}`} aria-label={option.title}>
          <ModePreview embedded={option.mode === 'whistle'} />
          <h3>{option.title}</h3><p>{option.description}</p>
          <Button type={current ? 'default' : 'primary'} disabled={current} icon={current ? <CheckOutlined /> : option.icon} onClick={() => switchMode(option.mode)}>
            {current ? '当前使用中' : `切换到${option.title}`}
          </Button>
        </article>;
      })}
    </div>
    <Typography.Paragraph type="secondary" className="mm-page-mode-note">示意图仅说明页面结构。点击按钮后在当前标签页切换，无需重新配置数据。</Typography.Paragraph>
    {error && <Alert className="mm-page-mode-error" type="error" message={error} />}
  </Card>;
}
