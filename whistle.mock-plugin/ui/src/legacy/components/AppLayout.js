import React, { useState, useMemo, useEffect } from 'react';
import { Layout, Menu, Button, Breadcrumb, Space, ConfigProvider, theme } from 'antd';
import { 
  AppstoreOutlined, 
  ApiOutlined, 
  SettingOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import VersionModal from './VersionModal';
import LocalAddress from '../../components/LocalAddress';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import '../styles/app-layout.css';

const { Header, Content, Sider } = Layout;

const THEMES = ['light', 'cyber', 'earth'];

const AppLayout = ({ children }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const isNetwork = currentPath === '/network';
  const [collapsed, setCollapsed] = useState(() => isNetwork && window.innerWidth <= 768);
  useEffect(() => {
    if (!isNetwork) return;
    const media = window.matchMedia('(max-width: 768px)');
    const collapseOnSmallScreen = event => { if (event.matches) setCollapsed(true); };
    collapseOnSmallScreen(media);
    media.addEventListener('change', collapseOnSmallScreen);
    return () => media.removeEventListener('change', collapseOnSmallScreen);
  }, [isNetwork]);
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [shortcutsHelpVisible, setShortcutsHelpVisible] = useState(false);
  
  // 注册全局键盘快捷键
  useKeyboardShortcuts();
  
  // 监听快捷键帮助事件
  useEffect(() => {
    const handleHelp = () => setShortcutsHelpVisible(true);
    window.addEventListener('keyboard-shortcuts-help', handleHelp);
    return () => window.removeEventListener('keyboard-shortcuts-help', handleHelp);
  }, []);
  
  // 主题切换（兼容旧版 cyberTheme 存储）
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved && THEMES.includes(saved)) return saved;
    // 兼容旧版 boolean 存储
    const oldCyber = localStorage.getItem('cyberTheme');
    return oldCyber === 'false' ? 'light' : oldCyber === 'true' ? 'cyber' : 'light';
  });

  useEffect(() => {
    document.body.classList.remove('cyber-theme', 'earth-theme');
    if (currentTheme !== 'light') {
      document.body.classList.add(`${currentTheme}-theme`);
    }
  }, [currentTheme]);

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('theme');
      if (saved && THEMES.includes(saved)) {
        setCurrentTheme(saved);
      } else {
        const oldCyber = localStorage.getItem('cyberTheme');
        setCurrentTheme(oldCyber === 'false' ? 'light' : 'cyber');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  
  const cyberTheme = useMemo(() => ({
    token: {
      colorPrimary: '#00f0ff',
      colorPrimaryHover: '#33f3ff',
      colorPrimaryActive: '#00c2cc',
      colorSuccess: '#00ff41',
      colorWarning: '#f0e800',
      colorError: '#ff4d4f',
      colorInfo: '#00f0ff',
      colorText: '#e0e0e0',
      colorTextSecondary: '#a0a0a0',
      colorTextTertiary: '#6b7280',
      colorBorder: '#1a1a2e',
      colorBorderSecondary: '#1a1a2e',
      colorBgBase: '#050508',
      colorBgContainer: '#0f0f1a',
      colorBgElevated: '#141420',
      colorBgLayout: '#0a0a12',
      colorBgSpotlight: '#141420',
      borderRadius: 6,
      borderRadiusSM: 4,
      borderRadiusLG: 8,
      wireframe: false,
      fontFamily: "'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontFamilyCode: "'Share Tech Mono', 'SFMono-Regular', Consolas, monospace",
    },
    algorithm: theme.darkAlgorithm,
  }), []);

  const earthTheme = useMemo(() => ({
    token: {
      colorPrimary: '#b87333',
      colorPrimaryHover: '#c9894d',
      colorPrimaryActive: '#9a5f2a',
      colorSuccess: '#6b8e23',
      colorWarning: '#d4a017',
      colorError: '#c0392b',
      colorInfo: '#8d6e63',
      colorText: '#3d3630',
      colorTextSecondary: '#6d6459',
      colorTextTertiary: '#9e9488',
      colorBorder: '#e0d8cf',
      colorBorderSecondary: '#d5cdc2',
      colorBgBase: '#faf6f0',
      colorBgContainer: '#fdfcfa',
      colorBgElevated: '#f5f0e8',
      colorBgLayout: '#f0ebe3',
      colorBgSpotlight: '#f5f0e8',
      borderRadius: 6,
      borderRadiusSM: 4,
      borderRadiusLG: 8,
      wireframe: false,
      fontFamily: "'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontFamilyCode: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace",
    },
    algorithm: theme.defaultAlgorithm,
  }), []);

  const lightTheme = useMemo(() => ({
    token: {
      borderRadius: 6,
      borderRadiusSM: 4,
      borderRadiusLG: 8,
    },
    algorithm: theme.defaultAlgorithm,
  }), []);

  const activeTheme = useMemo(() => {
    if (currentTheme === 'cyber') return cyberTheme;
    if (currentTheme === 'earth') return earthTheme;
    return lightTheme;
  }, [currentTheme, cyberTheme, earthTheme, lightTheme]);

  // 主题颜色映射（用于 inline style）
  const t = useMemo(() => {
    switch (currentTheme) {
      case 'cyber':
        return {
          headerBg: '#0f0f1a',
          headerBorder: '#1a1a2e',
          logoIcon: '#00ff41',
          logoGradient: 'linear-gradient(135deg, #00f0ff, #00ff41)',
          versionColor: '#6b7280',
          siderBg: '#0f0f1a',
          wrapperBg: '#0a0a12',
          breadcrumbLink: '#a0a0a0',
          breadcrumbCurrent: '#e0e0e0',
          titleColor: '#e0e0e0',
          titleFont: "'Orbitron', sans-serif",
          titleLetterSpacing: '0.5px',
          contentBg: '#0f0f1a',
          contentBorder: '#1a1a2e',
        };
      case 'earth':
        return {
          headerBg: '#fdfcfa',
          headerBorder: '#e0d8cf',
          logoIcon: '#b87333',
          logoGradient: 'linear-gradient(135deg, #b87333, #d4a017)',
          versionColor: '#6d6459',
          siderBg: '#f5f0e8',
          wrapperBg: '#f0ebe3',
          breadcrumbLink: '#6d6459',
          breadcrumbCurrent: '#3d3630',
          titleColor: '#3d3630',
          titleFont: undefined,
          titleLetterSpacing: undefined,
          contentBg: '#fdfcfa',
          contentBorder: '#e0d8cf',
        };
      default: // light
        return {
          headerBg: '#ffffff',
          headerBorder: '#f0f0f0',
          logoIcon: '#52c41a',
          logoGradient: 'linear-gradient(135deg, #1890ff, #52c41a)',
          versionColor: '#000000d9',
          siderBg: '#ffffff',
          wrapperBg: '#f5f5f5',
          breadcrumbLink: '#000000d9',
          breadcrumbCurrent: '#000000d9',
          titleColor: '#000000d9',
          titleFont: undefined,
          titleLetterSpacing: undefined,
          contentBg: '#ffffff',
          contentBorder: '#f0f0f0',
        };
    }
  }, [currentTheme]);
  
  // 版本弹窗控制方法
  const showVersionModal = () => setVersionModalVisible(true);
  const hideVersionModal = () => setVersionModalVisible(false);
  
  // 根据当前路径获取选中的菜单项和面包屑
  const getSelectedKeys = () => {
    if (currentPath === '/' || currentPath === '#/') return ['1'];
    if (currentPath.startsWith('/interface') || currentPath.includes('/interface')) return ['2'];
    if (currentPath === '/stats' || currentPath.includes('/stats')) return ['4'];
    if (currentPath === '/network') return ['6'];
    if (currentPath === '/sniffer' || currentPath.includes('/sniffer')) return ['5'];
    if (currentPath === '/settings' || currentPath.includes('/settings')) return ['3'];
    return [];
  };

  // 根据当前路径获取面包屑
  const getBreadcrumbs = () => {
    const breadcrumbs = [
      { path: '/', title: '首页' }
    ];
    
    if (currentPath.startsWith('/interface')) {
      breadcrumbs.push({ path: '/interface', title: '接口管理' });
      
      // 如果有featureId参数，添加特定功能模块名称
      if (currentPath.includes('/interface/') && currentPath !== '/interface/') {
        breadcrumbs.push({ path: currentPath, title: '功能接口详情' });
      }
    } else if (currentPath === '/stats') {
      breadcrumbs.push({ path: '/stats', title: '请求统计' });
    } else if (currentPath === '/network') {
      breadcrumbs.push({ path: '/network', title: '抓包列表' });
    } else if (currentPath === '/sniffer') {
      breadcrumbs.push({ path: '/sniffer', title: '接口嗅探' });
    } else if (currentPath === '/settings') {
      breadcrumbs.push({ path: '/settings', title: '系统设置' });
    }
    
    return breadcrumbs;
  };

  // 获取当前页面标题
  const getPageTitle = () => {
    if (currentPath === '/' || currentPath === '#/') return '功能模块管理';
    if (currentPath.startsWith('/interface')) return '接口配置管理';
    if (currentPath === '/stats') return '请求统计';
    if (currentPath === '/network') return '抓包列表';
    if (currentPath === '/sniffer') return '接口嗅探';
    if (currentPath === '/settings') return '系统设置';
    return 'Whistle Mock Plugin';
  };

  // 菜单配置
  const menuItems = [
    {
      key: '1',
      icon: <AppstoreOutlined />,
      label: <Link to="/">功能模块</Link>,
    },
    {
      key: '2',
      icon: <ApiOutlined />,
      label: <Link to="/interface">接口管理</Link>,
    },
    {
      key: '4',
      icon: <BarChartOutlined />,
      label: <Link to="/stats">请求统计</Link>,
    },
    {
      key: '6',
      icon: <GlobalOutlined />,
      label: <Link to="/network">抓包列表</Link>,
    },
    {
      key: '5',
      icon: <ThunderboltOutlined />,
      label: <Link to="/sniffer">接口嗅探</Link>,
    },
    {
      key: '3',
      icon: <SettingOutlined />,
      label: <Link to="/settings">系统设置</Link>,
    }
  ];

  const breadcrumbs = getBreadcrumbs();

  return (
    <ConfigProvider theme={activeTheme}>
      <Layout className={`app-layout ${isNetwork ? 'legacy-network-layout' : ''}`}>
        {/* 顶部导航栏 */}
        <Header className="app-header" style={{ background: t.headerBg, borderBottom: `1px solid ${t.headerBorder}` }}>
          <div className="header-left">
            <div className="logo-container">
              <div className="logo-icon-group">
                <ExperimentOutlined className="logo-icon logo-icon-secondary" style={{ color: t.logoIcon }} />
              </div>
              <div 
                className="logo-text" 
                style={{
                  background: t.logoGradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                MockMaster
              </div>
            </div>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="collapse-button"
              aria-label="切换侧边导航"
            />
          </div>
          <div className="header-right">
            <Space>
              <LocalAddress />
              <Button 
                type="text" 
                size="small"
                className="version-button"
                onClick={showVersionModal}
              >
                <span style={{ color: t.versionColor, fontFamily: "'Share Tech Mono', monospace" }}>
                  v{__APP_VERSION__}
                </span>
              </Button>
            </Space>
          </div>
        </Header>

        <Layout>
          {/* 侧边导航 */}
          <Sider 
            width={220} 
            className="app-sider" 
            collapsed={collapsed} 
            collapsible 
            trigger={null}
            style={{ background: t.siderBg }}
          >
            <Menu
              mode="inline"
              selectedKeys={getSelectedKeys()}
              items={menuItems}
              style={{ 
                height: '100%', 
                borderRight: 0, 
                padding: '8px',
                background: t.siderBg,
              }}
            />
          </Sider>

          {/* 主内容区 */}
          <Layout className="app-content-wrapper" style={{ padding: 0, background: t.wrapperBg }}>
            {/* 面包屑和标题 */}
            {!isNetwork && <div style={{ padding: '16px 24px 0' }}>
              <Breadcrumb className="app-breadcrumb" style={{ marginBottom: 16 }}>
                {breadcrumbs.map((crumb, index) => (
                  <Breadcrumb.Item key={index}>
                    {index < breadcrumbs.length - 1 ? (
                      <Link to={crumb.path} style={{ color: t.breadcrumbLink }}>{crumb.title}</Link>
                    ) : (
                      <span style={{ color: t.breadcrumbCurrent, fontWeight: 500 }}>{crumb.title}</span>
                    )}
                  </Breadcrumb.Item>
                ))}
              </Breadcrumb>
              <h1 style={{ 
                margin: 0, 
                fontSize: 22, 
                fontWeight: 700, 
                color: t.titleColor,
                fontFamily: t.titleFont,
                letterSpacing: t.titleLetterSpacing,
              }}>
                {getPageTitle()}
              </h1>
            </div>}
            
            {/* 内容区 */}
            <Content
              className="app-content"
              style={isNetwork ? { background: t.contentBg, padding: 16, margin: 0, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } : {
                background: t.contentBg,
                padding: 24,
                borderRadius: 6,
                minHeight: 280,
                margin: '16px 24px 24px',
                border: `1px solid ${t.contentBorder}`,
              }}
            >
              {children}
            </Content>
          </Layout>
        </Layout>
        
        {/* 版本信息弹窗 */}
        <VersionModal 
          visible={versionModalVisible}
          onCancel={hideVersionModal}
        />
        
        {/* 快捷键帮助弹窗 */}
        <KeyboardShortcutsHelp
          visible={shortcutsHelpVisible}
          onClose={() => setShortcutsHelpVisible(false)}
        />
      </Layout>
    </ConfigProvider>
  );
};

export default AppLayout;
