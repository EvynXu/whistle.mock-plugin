import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/app-layout.css';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const pathname = location.pathname;
  
  const isActive = (path) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="app-container">
      {/* 顶部导航栏 */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">W</div>
          Whistle Mock 数据工厂
        </div>
        <div className="search">
          <input type="text" placeholder="搜索..." />
        </div>
        <div className="header-actions">
          <button>
            <i>📊</i>
            统计
          </button>
          <Link to="/settings">
            <button>
              <i>⚙️</i>
              设置
            </button>
          </Link>
        </div>
      </header>
      
      {/* 主内容区域 */}
      <div className="main-container">
        {/* 左侧导航 */}
        <aside className="sidebar">
          <div className="create-feature">
            <button>+ 创建功能</button>
          </div>
          
          <div className="feature-list">
            <div className={`feature-item ${isActive('/') ? 'active' : ''}`}>
              <Link to="/" className="feature-link">
                <div className="feature-name">首页</div>
              </Link>
            </div>
            
            <div className={`feature-item ${isActive('/mock-data') ? 'active' : ''}`}>
              <Link to="/mock-data" className="feature-link">
                <div className="feature-name">Mock数据</div>
                <div className="feature-count">2</div>
              </Link>
            </div>
            
            <div className={`feature-item ${isActive('/file-proxy') ? 'active' : ''}`}>
              <Link to="/file-proxy" className="feature-link">
                <div className="feature-name">接口配置</div>
                <div className="feature-count">3</div>
              </Link>
            </div>
            
            <div className={`feature-item ${isActive('/url-redirect') ? 'active' : ''}`}>
              <Link to="/url-redirect" className="feature-link">
                <div className="feature-name">规则管理</div>
                <div className="feature-count">1</div>
              </Link>
            </div>
          </div>
        </aside>
        
        {/* 右侧内容区域 */}
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout; 