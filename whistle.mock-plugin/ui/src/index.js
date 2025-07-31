import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter as Router, Switch, Route, Redirect } from 'react-router-dom';

// 导入样式
import 'antd/dist/reset.css'; // 导入antd样式，使用适合的版本
import './styles/global.css';
import './App.css';

// 导入页面组件 - V1版本（重构前）
import MockData from './pages/MockData';
import InterfaceManagement from './pages/InterfaceManagement';
import Settings from './pages/Settings';

// 导入页面组件 - V2版本（重构后）
import MockDataV2 from './pages/MockDataV2';
import InterfaceManagementV2 from './pages/InterfaceManagementV2';

// UI版本检测函数
const getUIVersion = () => {
  try {
    return localStorage.getItem('ui-version') || 'v1';
  } catch (error) {
    console.error('获取UI版本设置失败:', error);
    return 'v1';
  }
};

const App = () => {
  const uiVersion = getUIVersion();
  
  // 根据版本选择对应组件
  const MockDataComponent = uiVersion === 'v2' ? MockDataV2 : MockData;
  const InterfaceManagementComponent = uiVersion === 'v2' ? InterfaceManagementV2 : InterfaceManagement;

  return (
    <Router>
      <div className="App">
        <Switch>
          <Route exact path="/" component={MockDataComponent} />
          <Route exact path="/interface" component={InterfaceManagementComponent} />
          <Route path="/interface/:featureId" component={InterfaceManagementComponent} />
          <Route path="/settings" component={Settings} />
          <Redirect to="/" />
        </Switch>
      </div>
    </Router>
  );
};

// 确保使用正确的渲染方法，兼容React 18和旧版本
const root = document.getElementById('root');
if (ReactDOM.createRoot) {
  // React 18+
  const rootElement = ReactDOM.createRoot(root);
  rootElement.render(<App />);
} else {
  // 旧版本React
  ReactDOM.render(<App />, root);
} 