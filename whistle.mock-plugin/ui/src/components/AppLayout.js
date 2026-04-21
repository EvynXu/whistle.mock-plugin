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
  ThunderboltOutlined
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import VersionModal from './VersionModal';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import '../styles/app-layout.css';

const { Header, Content, Sider } = Layout;

const AppLayout = ({ children }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [collapsed, setCollapsed] = useState(false);
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
  
  // 赛博朋克主题开关
  const [enableCyber, setEnableCyber] = useState(() => {
    return localStorage.getItem('cyberTheme') !== 'false';
  });

  useEffect(() => {
    document.body.classList.toggle('cyber-theme', enableCyber);
  }, [enableCyber]);

  useEffect(() => {
    const handleStorage = () => {
      setEnableCyber(localStorage.getItem('cyberTheme') !== 'false');
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

  const lightTheme = useMemo(() => ({
    token: {
      borderRadius: 6,
      borderRadiusSM: 4,
      borderRadiusLG: 8,
    },
    algorithm: theme.defaultAlgorithm,
  }), []);
  
  // 版本弹窗控制方法
  const showVersionModal = () => setVersionModalVisible(true);
  const hideVersionModal = () => setVersionModalVisible(false);
  
  // 根据当前路径获取选中的菜单项和面包屑
  const getSelectedKeys = () => {
    if (currentPath === '/' || currentPath === '#/') return ['1'];
    if (currentPath.startsWith('/interface') || currentPath.includes('/interface')) return ['2'];
    if (currentPath === '/stats' || currentPath.includes('/stats')) return ['4'];
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
    <ConfigProvider theme={enableCyber ? cyberTheme : lightTheme}>
      <Layout className="app-layout">
        {/* 顶部导航栏 */}
        <Header className="app-header" style={{ background: enableCyber ? '#0f0f1a' : '#ffffff', borderBottom: enableCyber ? '1px solid #1a1a2e' : '1px solid #f0f0f0' }}>
          <div className="header-left">
            <div className="logo-container">
              <div className="logo-icon-group">
                <ExperimentOutlined className="logo-icon logo-icon-secondary" style={{ color: enableCyber ? '#00ff41' : '#52c41a' }} />
              </div>
              <div 
                className="logo-text" 
                style={enableCyber ? {
                  background: 'linear-gradient(135deg, #00f0ff, #00ff41)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                } : {
                  background: 'linear-gradient(135deg, #1890ff, #52c41a)',
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
            />
          </div>
          <div className="header-right">
            <Space>
              <Button 
                type="text" 
                size="small"
                className="version-button"
                onClick={showVersionModal}
              >
                <span style={{ color: enableCyber ? '#6b7280' : '#000000d9', fontFamily: "'Share Tech Mono', monospace" }}>
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
            style={{ background: enableCyber ? '#0f0f1a' : '#ffffff' }}
          >
            <Menu
              mode="inline"
              selectedKeys={getSelectedKeys()}
              items={menuItems}
              style={{ 
                height: '100%', 
                borderRight: 0, 
                padding: '8px',
                background: enableCyber ? '#0f0f1a' : '#ffffff',
              }}
            />
          </Sider>

          {/* 主内容区 */}
          <Layout className="app-content-wrapper" style={{ padding: 0, background: enableCyber ? '#0a0a12' : '#f5f5f5' }}>
            {/* 面包屑和标题 */}
            <div style={{ padding: '16px 24px 0' }}>
              <Breadcrumb className="app-breadcrumb" style={{ marginBottom: 16 }}>
                {breadcrumbs.map((crumb, index) => (
                  <Breadcrumb.Item key={index}>
                    {index < breadcrumbs.length - 1 ? (
                      <Link to={crumb.path} style={{ color: enableCyber ? '#a0a0a0' : '#000000d9' }}>{crumb.title}</Link>
                    ) : (
                      <span style={{ color: enableCyber ? '#e0e0e0' : '#000000d9', fontWeight: 500 }}>{crumb.title}</span>
                    )}
                  </Breadcrumb.Item>
                ))}
              </Breadcrumb>
              <h1 style={{ 
                margin: 0, 
                fontSize: 22, 
                fontWeight: 700, 
                color: enableCyber ? '#e0e0e0' : '#000000d9',
                fontFamily: enableCyber ? "'Orbitron', sans-serif" : undefined,
                letterSpacing: enableCyber ? '0.5px' : undefined,
              }}>
                {getPageTitle()}
              </h1>
            </div>
            
            {/* 内容区 */}
            <Content
              className="app-content"
              style={{
                background: enableCyber ? '#0f0f1a' : '#ffffff',
                padding: 24,
                borderRadius: 6,
                minHeight: 280,
                margin: '16px 24px 24px',
                border: enableCyber ? '1px solid #1a1a2e' : '1px solid #f0f0f0',
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
