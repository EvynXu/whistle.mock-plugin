import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { Card, Typography, Switch, Space, Divider } from 'antd';
import '../styles/settings.css';

const { Title, Text, Paragraph } = Typography;

const Settings = () => {
  const [displayMode, setDisplayMode] = useState('modal');
  const [interfaceFormDisplayMode, setInterfaceFormDisplayMode] = useState('modal');

  useEffect(() => {
    // 从 localStorage 读取配置
    const savedMode = localStorage.getItem('dataManagementDisplayMode');
    if (savedMode) {
      setDisplayMode(savedMode);
    }

    const savedInterfaceFormMode = localStorage.getItem('interfaceFormDisplayMode');
    if (savedInterfaceFormMode) {
      setInterfaceFormDisplayMode(savedInterfaceFormMode);
    }
  }, []);

  const handleDisplayModeChange = (checked) => {
    const newMode = checked ? 'drawer' : 'modal';
    setDisplayMode(newMode);
    localStorage.setItem('dataManagementDisplayMode', newMode);
    
    // 触发 storage 事件，通知其他页面
    window.dispatchEvent(new Event('storage'));
  };

  const handleInterfaceFormDisplayModeChange = (checked) => {
    const newMode = checked ? 'drawer' : 'modal';
    setInterfaceFormDisplayMode(newMode);
    localStorage.setItem('interfaceFormDisplayMode', newMode);
    
    // 触发 storage 事件，通知其他页面
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <AppLayout>
      <div className="page-container">
        <div className="page-title-bar">
          <div>
            <h1 className="page-title">系统设置</h1>
            <div className="page-description">
              配置插件的全局设置项和界面选项
            </div>
          </div>
        </div>

        <Card title="界面设置" className="settings-card">
          <div className="settings-item">
            <div className="settings-item-header">
              <div>
                <div className="settings-item-title">数据管理交互</div>
                <div className="settings-item-description">
                  选择数据管理的显示方式
                </div>
              </div>
              <Space>
                <Text type="secondary">
                  {displayMode === 'drawer' ? '抽屉模式' : '弹窗模式'}
                </Text>
                <Switch 
                  checked={displayMode === 'drawer'}
                  onChange={handleDisplayModeChange}
                />
              </Space>
            </div>
          </div>

          <div className="settings-item">
            <div className="settings-item-header">
              <div>
                <div className="settings-item-title">接口表单交互</div>
                <div className="settings-item-description">
                  选择添加/编辑接口的显示方式
                </div>
              </div>
              <Space>
                <Text type="secondary">
                  {interfaceFormDisplayMode === 'drawer' ? '抽屉模式' : '弹窗模式'}
                </Text>
                <Switch 
                  checked={interfaceFormDisplayMode === 'drawer'}
                  onChange={handleInterfaceFormDisplayModeChange}
                />
              </Space>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings; 