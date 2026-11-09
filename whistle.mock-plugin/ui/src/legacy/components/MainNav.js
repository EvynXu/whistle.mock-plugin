import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/main-nav.css';

const MainNav = () => {
  const location = useLocation();
  const pathname = location.pathname;
  
  // 检查当前路径是否匹配导航项
  const isActive = (path) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="main-nav">
      <div className="main-header">
        <h1>Whistle Mock 数据工厂</h1>
      </div>
      <nav className="nav-tabs">
        <Link to="/" className={`nav-tab ${isActive('/') ? 'active' : ''}`}>
          首页
        </Link>
        <Link to="/mock" className={`nav-tab ${isActive('/mock') ? 'active' : ''}`}>
          Mock数据
        </Link>
        <Link to="/file-proxy" className={`nav-tab ${isActive('/file-proxy') ? 'active' : ''}`}>
          接口配置
        </Link>
        <Link to="/url-redirect" className={`nav-tab ${isActive('/url-redirect') ? 'active' : ''}`}>
          规则管理
        </Link>
        <Link to="/settings" className={`nav-tab ${isActive('/settings') ? 'active' : ''}`}>
          设置
        </Link>
      </nav>
    </div>
  );
};

export default MainNav; 