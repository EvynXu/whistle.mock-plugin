import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { Card, Switch, message, Typography, Divider } from 'antd';
import '../styles/settings.css';

const { Title, Text, Paragraph } = Typography;

// localStorage工具函数
const getUIVersion = () => {
  try {
    return localStorage.getItem('ui-version') || 'v1';
  } catch (error) {
    console.error('获取UI版本设置失败:', error);
    return 'v1';
  }
};

const setUIVersion = (version) => {
  try {
    localStorage.setItem('ui-version', version);
    return true;
  } catch (error) {
    console.error('保存UI版本设置失败:', error);
    return false;
  }
};

const Settings = () => {
  const [uiVersion, setUiVersionState] = useState(getUIVersion());

  // 页面加载时同步localStorage状态
  useEffect(() => {
    const currentVersion = getUIVersion();
    setUiVersionState(currentVersion);
  }, []);

  // 处理UI版本切换
  const handleUIVersionChange = (checked) => {
    const newVersion = checked ? 'v2' : 'v1';
    
    if (setUIVersion(newVersion)) {
      setUiVersionState(newVersion);
      
      // 提示用户刷新页面以应用更改
      message.success({
        content: `已切换到${checked ? '重构后' : '重构前'}版本，页面将自动刷新`,
        duration: 2,
        onClose: () => {
          window.location.reload();
        }
      });
      
      // 1秒后自动刷新
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      message.error('设置保存失败，请重试');
    }
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
          <div className="setting-item">
            <div className="setting-label">
              <Text strong>UI版本切换</Text>
              <Paragraph type="secondary" style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                切换使用重构前后的界面版本
              </Paragraph>
            </div>
            <div className="setting-control">
              <Switch
                checked={uiVersion === 'v2'}
                onChange={handleUIVersionChange}
                checkedChildren="重构后"
                unCheckedChildren="重构前"
              />
            </div>
          </div>
          
          <Divider />
          
          <div style={{ padding: '16px 0' }}>
            <Title level={5}>版本说明</Title>
            <div style={{ marginLeft: '16px' }}>
              <Paragraph>
                <Text strong>重构前版本：</Text> 当前稳定版本的功能模块管理和接口管理界面
              </Paragraph>
              <Paragraph>
                <Text strong>重构后版本：</Text> 新设计的界面版本，提供更好的用户体验和功能优化
              </Paragraph>
              <Paragraph type="warning">
                <Text>注意：切换版本后页面将自动刷新以应用更改</Text>
              </Paragraph>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings; 