import React, { useState } from 'react';
import { Layout, Menu, Button, Breadcrumb, Typography, Space, theme, Divider, Badge } from 'antd';
import { 
  AppstoreOutlined, 
  ApiOutlined, 
  SettingOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import '../styles/app-layout.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

const AppLayout = ({ children }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();
  
  // 根据当前路径获取选中的菜单项和面包屑
  const getSelectedKeys = () => {
    if (currentPath === '/' || currentPath === '#/') return ['1'];
    if (currentPath.startsWith('/interface') || currentPath.includes('/interface')) return ['2'];
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
    } else if (currentPath === '/settings') {
      breadcrumbs.push({ path: '/settings', title: '系统设置' });
    }
    
    return breadcrumbs;
  };

  // 获取当前页面标题
  const getPageTitle = () => {
    if (currentPath === '/' || currentPath === '#/') return '功能模块管理';
    if (currentPath.startsWith('/interface')) return '接口配置管理';
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
      key: '3',
      icon: <SettingOutlined />,
      label: <Link to="/settings">系统设置</Link>,
    }
  ];

  const breadcrumbs = getBreadcrumbs();
  const colorBgContainer = token.colorBgContainer;
  const colorBgLayout = token.colorBgLayout;
  const borderRadius = token.borderRadius;

  return (
    <Layout className="app-layout">
      {/* 顶部导航栏 */}
      <Header className="app-header" style={{ background: colorBgContainer }}>
        <div className="header-left">
          <div className="logo-container">
            <DashboardOutlined className="logo-icon" />
            <div className="logo-text">Whistle Mock</div>
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
            <Text type="secondary">v0.1.0</Text>
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
          style={{ background: colorBgContainer }}
        >
          <Menu
            mode="inline"
            selectedKeys={getSelectedKeys()}
            items={menuItems}
            style={{ 
              height: '100%', 
              borderRight: 0, 
              padding: '8px',
            }}
          />
        </Sider>

        {/* 主内容区 */}
        <Layout className="app-content-wrapper" style={{ padding: 0, background: colorBgLayout }}>
          {/* 内容区 */}
          <Content
            className="app-content"
            style={{
              background: colorBgContainer,
              padding: 24,
              borderRadius: borderRadius,
              minHeight: 280,
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default AppLayout; 