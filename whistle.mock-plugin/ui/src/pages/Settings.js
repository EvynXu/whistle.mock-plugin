import React from 'react';
import AppLayout from '../components/AppLayout';
import { Card, Typography, Empty } from 'antd';
import '../styles/settings.css';

const { Title, Text, Paragraph } = Typography;

const Settings = () => {
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
          <Empty 
            description="暂无可配置项" 
            style={{ padding: '40px 0' }}
          />
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings; 