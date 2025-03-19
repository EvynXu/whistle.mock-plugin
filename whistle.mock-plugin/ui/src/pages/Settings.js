import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import '../styles/settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    mockEnabled: true,
    defaultResponseDelay: 500,
    logRequests: true,
    preserveQueryParams: true,
    enableCors: true,
    notificationEnabled: true
  });

  const [savedSettings, setSavedSettings] = useState({
    mockEnabled: true,
    defaultResponseDelay: 500,
    logRequests: true,
    preserveQueryParams: true,
    enableCors: true,
    notificationEnabled: true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setSettings({
        ...settings,
        [name]: numValue
      });
    }
  };

  const handleSave = () => {
    // 保存设置
    setSavedSettings({ ...settings });
    alert('设置已保存');
  };

  const handleReset = () => {
    // 重置为保存的设置
    setSettings({ ...savedSettings });
  };

  const isFormChanged = () => {
    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  };

  return (
    <AppLayout>
      <div className="settings-container">
        <div className="page-header">
          <h1>系统设置</h1>
        </div>
        
        <div className="settings-card">
          <div className="settings-section">
            <h2>基本设置</h2>
            <div className="setting-item">
              <div className="setting-label">
                <span>启用模拟数据</span>
                <span className="setting-description">开启后，将根据配置返回模拟数据</span>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input 
                    type="checkbox" 
                    name="mockEnabled" 
                    checked={settings.mockEnabled} 
                    onChange={handleChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
            
            <div className="setting-item">
              <div className="setting-label">
                <span>默认响应延迟 (ms)</span>
                <span className="setting-description">设置接口返回数据的默认延迟时间</span>
              </div>
              <div className="setting-control">
                <input 
                  type="number" 
                  name="defaultResponseDelay" 
                  value={settings.defaultResponseDelay} 
                  onChange={handleNumberChange}
                  min="0"
                />
              </div>
            </div>
            
            <div className="setting-item">
              <div className="setting-label">
                <span>记录请求日志</span>
                <span className="setting-description">开启后，将记录所有请求的详细信息</span>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input 
                    type="checkbox" 
                    name="logRequests" 
                    checked={settings.logRequests} 
                    onChange={handleChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="settings-section">
            <h2>高级设置</h2>
            <div className="setting-item">
              <div className="setting-label">
                <span>保留查询参数</span>
                <span className="setting-description">开启后，模拟数据的URL匹配将忽略查询参数</span>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input 
                    type="checkbox" 
                    name="preserveQueryParams" 
                    checked={settings.preserveQueryParams} 
                    onChange={handleChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
            
            <div className="setting-item">
              <div className="setting-label">
                <span>启用CORS支持</span>
                <span className="setting-description">开启后，将自动为响应添加CORS相关的头信息</span>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input 
                    type="checkbox" 
                    name="enableCors" 
                    checked={settings.enableCors} 
                    onChange={handleChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
            
            <div className="setting-item">
              <div className="setting-label">
                <span>启用通知提醒</span>
                <span className="setting-description">开启后，当请求被拦截时会显示通知</span>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input 
                    type="checkbox" 
                    name="notificationEnabled" 
                    checked={settings.notificationEnabled} 
                    onChange={handleChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="settings-actions">
            <button 
              className="reset-button" 
              onClick={handleReset}
              disabled={!isFormChanged()}
            >
              取消
            </button>
            <button 
              className="save-button" 
              onClick={handleSave}
              disabled={!isFormChanged()}
            >
              保存
            </button>
          </div>
        </div>
        
        <div className="settings-card about-section">
          <h2>关于</h2>
          <div className="about-content">
            <div className="plugin-info">
              <p><strong>Whistle Mock数据工厂</strong></p>
              <p>版本: 0.2.0</p>
              <p>作者: Your Name</p>
            </div>
            <div className="plugin-description">
              <p>这是一个用于Whistle的mock数据插件，可以帮助前端开发者快速创建和管理模拟数据，提高开发效率。</p>
              <p>支持功能分组、多种响应类型、文件代理和URL重定向等功能。</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings; 