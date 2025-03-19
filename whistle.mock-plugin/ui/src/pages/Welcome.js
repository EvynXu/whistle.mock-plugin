import React from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import '../styles/welcome.css';

const Welcome = () => {
  // 模拟统计数据
  const stats = {
    featuresCount: 3,
    interfacesCount: 15,
    activeInterfacesCount: 12,
    requestsHandledCount: 256
  };

  // 模拟最近活动数据
  const recentActivities = [
    { id: 1, type: '创建', target: '功能', name: '商品列表', time: '2023-11-05 14:30' },
    { id: 2, type: '修改', target: '接口', name: '用户登录', time: '2023-11-05 14:15' },
    { id: 3, type: '启用', target: '接口', name: '获取用户信息', time: '2023-11-05 13:45' },
    { id: 4, type: '创建', target: '接口', name: '商品详情', time: '2023-11-05 13:30' },
    { id: 5, type: '禁用', target: '功能', name: '购物车', time: '2023-11-05 11:20' }
  ];

  return (
    <AppLayout>
      <div className="welcome-container">
        <div className="welcome-header">
          <h1>欢迎使用 Whistle Mock 数据工厂</h1>
          <p>快速创建和管理模拟数据，提高前端开发效率</p>
        </div>
        
        <div className="cards-container">
          {/* 功能概览卡片 */}
          <div className="card stats-card">
            <div className="card-header">
              <div className="card-icon">📊</div>
              <h2>功能概览</h2>
            </div>
            <div className="card-content">
              <div className="stat-item">
                <div className="stat-value">{stats.featuresCount}</div>
                <div className="stat-label">功能模块</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.interfacesCount}</div>
                <div className="stat-label">接口配置</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.activeInterfacesCount}</div>
                <div className="stat-label">启用接口</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.requestsHandledCount}</div>
                <div className="stat-label">已处理请求</div>
              </div>
            </div>
          </div>
          
          {/* 快速开始卡片 */}
          <div className="card quickstart-card">
            <div className="card-header">
              <div className="card-icon">🚀</div>
              <h2>快速开始</h2>
            </div>
            <div className="card-content">
              <div className="steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <div className="step-title">创建功能模块</div>
                    <div className="step-desc">创建一个功能模块，用于组织相关接口</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <div className="step-title">添加接口配置</div>
                    <div className="step-desc">配置API接口的URL匹配规则和响应数据</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <div className="step-title">启用接口使用</div>
                    <div className="step-desc">启用功能模块和接口，即可在Whistle中使用</div>
                  </div>
                </div>
              </div>
              <div className="quickstart-actions">
                <Link to="/mock-data">
                  <button className="quickstart-button">开始创建功能</button>
                </Link>
              </div>
            </div>
          </div>
          
          {/* 使用说明卡片 */}
          <div className="card usage-card">
            <div className="card-header">
              <div className="card-icon">📘</div>
              <h2>使用说明</h2>
            </div>
            <div className="card-content">
              <div className="usage-item">
                <div className="usage-title">添加Whistle规则</div>
                <div className="usage-desc">
                  在Whistle中添加如下规则：
                  <pre className="code-block">example.com mock://</pre>
                </div>
              </div>
              <div className="usage-item">
                <div className="usage-title">匹配规则说明</div>
                <div className="usage-desc">
                  支持多种匹配方式：
                  <ul className="usage-list">
                    <li>精确匹配: <code>/api/users</code></li>
                    <li>通配符匹配: <code>/api/users/*</code></li>
                    <li>正则匹配: <code>/\/api\/products\/\d+/</code></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 最近活动 */}
        <div className="recent-activities">
          <div className="section-header">
            <h2>最近活动</h2>
          </div>
          <div className="activities-list">
            {recentActivities.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">
                  {activity.type === '创建' ? '➕' : 
                   activity.type === '修改' ? '✏️' : 
                   activity.type === '启用' ? '✅' : 
                   activity.type === '禁用' ? '❌' : '🔄'}
                </div>
                <div className="activity-content">
                  <div className="activity-title">
                    {activity.type}了{activity.target}「{activity.name}」
                  </div>
                  <div className="activity-time">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Welcome; 