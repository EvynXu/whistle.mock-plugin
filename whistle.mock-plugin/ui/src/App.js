import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import { HomeOutlined, ApiOutlined, FileOutlined, SettingOutlined } from '@ant-design/icons';
import HomePage from './pages/HomePage';
import InterfacePage from './pages/InterfacePage';
import FilesPage from './pages/FilesPage';
import SettingsPage from './pages/SettingsPage';

const { Header, Sider, Content } = Layout;

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('1');
  
  const { token } = theme.useToken();
  
  const renderContent = () => {
    switch (selectedKey) {
      case '1':
        return <HomePage />;
      case '2':
        return <InterfacePage />;
      case '3':
        return <FilesPage />;
      case '4':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };
  
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`
        }}
      >
        <div className="logo" style={{ background: token.colorPrimary }}>
          {collapsed ? 'W' : 'Whistle Mock'}
        </div>
        <Menu
          theme="light"
          mode="inline"
          defaultSelectedKeys={['1']}
          selectedKeys={[selectedKey]}
          onSelect={({ key }) => setSelectedKey(key)}
          items={[
            {
              key: '1',
              icon: <HomeOutlined />,
              label: '功能管理',
            },
            {
              key: '2',
              icon: <ApiOutlined />,
              label: '接口详情',
            },
            {
              key: '3',
              icon: <FileOutlined />,
              label: '文件管理',
            },
            {
              key: '4',
              icon: <SettingOutlined />,
              label: '设置',
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: token.colorBgContainer }}>
          <div style={{ paddingLeft: 24 }}>
            <h1>Whistle Mock 插件</h1>
          </div>
        </Header>
        <Content style={{ margin: '16px' }}>
          <div className="site-layout-background" style={{ padding: 24, minHeight: 360, background: token.colorBgContainer }}>
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App; 