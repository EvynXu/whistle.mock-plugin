import React from 'react';
import '../styles/feature-card.css';

const FeatureCard = ({ feature }) => {
  const { name, description, active, interfaceCount, createdAt } = feature;
  
  // 生成随机的主题色（根据当前主题选择色系）
  const getRandomColor = () => {
    const isEarth = document.body.classList.contains('earth-theme');
    if (isEarth) {
      const colors = ['#b87333', '#6b8e23', '#d4a017', '#8d6e63', '#c0392b'];
      return colors[Math.floor(Math.random() * colors.length)];
    }
    const colors = ['#00f0ff', '#00ff41', '#f0e800', '#ff00a0', '#bd00ff'];
    return colors[Math.floor(Math.random() * colors.length)];
  };
  
  const themeColor = getRandomColor();
  
  return (
    <div className="feature-card">
      <div className="feature-card-color-bar" style={{ backgroundColor: themeColor }}></div>
      <div className="feature-card-header">
        <h3 className="feature-card-title">{name}</h3>
        <span className={`feature-card-badge ${active ? 'active' : 'inactive'}`}>
          {active ? '已启用' : '未启用'}
        </span>
      </div>
      <div className="feature-card-content">
        <p className="feature-card-description">{description || '没有描述'}</p>
        <div className="feature-card-stats">
          <div className="feature-stat">
            <span className="feature-stat-value">{interfaceCount}</span>
            <span className="feature-stat-label">接口数量</span>
          </div>
          {createdAt && (
            <div className="feature-stat">
              <span className="feature-stat-label">创建于</span>
              <span className="feature-stat-value feature-date">{createdAt}</span>
            </div>
          )}
        </div>
      </div>
      <div className="feature-card-footer">
        <button className="card-btn edit-btn">
          <i className="icon-edit"></i>
          编辑
        </button>
        <button className="card-btn primary-btn" style={{ borderColor: themeColor, color: themeColor }}>
          <i className="icon-manage"></i>
          管理接口
        </button>
      </div>
    </div>
  );
};

export default FeatureCard; 