import React, { useState } from 'react';
import '../styles/layout.css';

const Layout = ({ children }) => {
  const [activeFeature, setActiveFeature] = useState(null);
  const [features, setFeatures] = useState([
    { id: 1, name: '用户数据', active: true, count: 3 },
    { id: 2, name: '订单信息', active: false, count: 2 },
    { id: 3, name: '商品列表', active: false, count: 5 }
  ]);

  const handleFeatureClick = (id) => {
    setActiveFeature(id);
    // 更新功能状态
    setFeatures(features.map(feature => ({
      ...feature,
      active: feature.id === id ? !feature.active : feature.active
    })));
  };

  const handleCreateFeature = () => {
    // 模拟创建新功能
    const newId = features.length > 0 ? Math.max(...features.map(f => f.id)) + 1 : 1;
    const newFeature = {
      id: newId,
      name: `新功能 ${newId}`,
      active: false,
      count: 0
    };
    setFeatures([...features, newFeature]);
  };

  return (
    <div className="layout">
      {/* 顶部导航栏 */}
      <div className="header">
        <div className="logo">
          <div className="logo-icon">W</div>
          Whistle 接口代理插件
        </div>
        <div className="search">
          <input type="text" placeholder="搜索..." />
        </div>
        <div className="header-actions">
          <button>
            <i>🔄</i> 刷新
          </button>
          <button>
            <i>⚙️</i> 设置
          </button>
        </div>
      </div>
      
      {/* 主内容区域 */}
      <div className="main-container">
        {/* 左侧导航 */}
        <div className="sidebar">
          <div className="create-feature">
            <button onClick={handleCreateFeature}>+ 创建新功能</button>
          </div>
          
          <div className="feature-list">
            {features.map(feature => (
              <div 
                key={feature.id}
                className={`feature-item ${activeFeature === feature.id ? 'active' : ''}`}
                onClick={() => handleFeatureClick(feature.id)}
              >
                <div className="feature-item-name">
                  <div className={`status-icon ${feature.active ? 'active' : ''}`}>
                    {feature.active ? '✓' : ''}
                  </div>
                  {feature.name}
                </div>
                <div className="feature-item-count">{feature.count}</div>
              </div>
            ))}
          </div>
          
          <div className="sidebar-footer">
            Whistle Mock Plugin v0.2.0
          </div>
        </div>
        
        {/* 内容区 */}
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout; 