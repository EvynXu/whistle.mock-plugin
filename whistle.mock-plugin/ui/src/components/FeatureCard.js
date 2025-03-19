import React from 'react';
import '../styles/feature-card.css';

const FeatureCard = ({ feature }) => {
  const { name, description, active, interfaceCount } = feature;
  
  return (
    <div className="feature-card">
      <div className="feature-card-header">
        {name}
      </div>
      <div className="feature-card-content">
        <div className="feature-card-info">
          {description || '没有描述'}
          <div className={`feature-card-status ${active ? 'active' : 'inactive'}`}>
            {active ? '已启用' : '未启用'}
          </div>
        </div>
        <div className="feature-card-actions">
          <button>编辑</button>
          <button className="primary">管理接口 ({interfaceCount})</button>
        </div>
      </div>
    </div>
  );
};

export default FeatureCard; 