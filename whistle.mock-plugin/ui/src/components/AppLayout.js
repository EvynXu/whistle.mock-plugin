import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { AppstoreOutlined, ApiOutlined, SettingOutlined, ExperimentOutlined, BarChartOutlined, GlobalOutlined, ThunderboltOutlined, BulbOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { NavLink, useLocation } from 'react-router-dom';
import VersionModal from './VersionModal';
import LocalAddress from './LocalAddress';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useTheme } from '../theme/ThemeProvider';
import '../styles/app-layout.css';
const links = [['/', '功能模块', AppstoreOutlined], ['/interface', '接口工作台', ApiOutlined], ['/network', '抓包列表', GlobalOutlined], ['/sniffer', '接口嗅探', ThunderboltOutlined], ['/stats', '请求统计', BarChartOutlined], ['/settings', '系统设置', SettingOutlined]];
export default function AppLayout({
  children
}) {
  const [versionOpen, setVersionOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const {
    currentTheme,
    setTheme
  } = useTheme();
  const location = useLocation();
  useKeyboardShortcuts();
  useEffect(() => {
    const open = () => setHelpOpen(true);
    window.addEventListener('keyboard-shortcuts-help', open);
    return () => window.removeEventListener('keyboard-shortcuts-help', open);
  }, []);
  return <div className={`mm-app ${location.pathname.startsWith('/interface') ? 'mm-app-workbench' : location.pathname === '/network' ? 'mm-app-network' : ''}`}>
    <header className="mm-app-header">
      <NavLink exact to="/" className="mm-brand"><span className="mm-brand-mark"><ExperimentOutlined /></span><span>MockMaster<small>API WORKSPACE</small></span></NavLink>
      <nav className="mm-navigation" aria-label="主导航">{links.map(([to, label, Icon]) => <NavLink key={to} exact={to === '/'} to={to} activeClassName="is-active"><Icon /><span>{label}</span></NavLink>)}</nav>
      <div className="mm-header-actions"><LocalAddress /><Button type="text" aria-label="切换浅色 / 深色" icon={<BulbOutlined />} onClick={() => setTheme(currentTheme === 'light' ? 'dark' : 'light')} /><Button type="text" aria-label="快捷键帮助" icon={<QuestionCircleOutlined />} onClick={() => setHelpOpen(true)} /><Button type="text" size="small" onClick={() => setVersionOpen(true)}>v{__APP_VERSION__}</Button></div>
    </header>
    <main className={`mm-app-main ${location.pathname.startsWith('/interface') ? 'mm-app-main-workbench' : location.pathname === '/network' ? 'mm-app-main-network' : ''}`}>{children}</main>
    <VersionModal visible={versionOpen} onCancel={() => setVersionOpen(false)} />
    <KeyboardShortcutsHelp visible={helpOpen} onCancel={() => setHelpOpen(false)} onClose={() => setHelpOpen(false)} />
  </div>;
}
