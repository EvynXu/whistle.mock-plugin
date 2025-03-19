import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter as Router, Switch, Route, Redirect } from 'react-router-dom';

// 导入样式
import 'antd/dist/reset.css'; // 导入antd样式，使用适合的版本
import './styles/global.css';
import './App.css';

// 导入页面组件
import MockData from './pages/MockData';
import InterfaceManagement from './pages/InterfaceManagement';
import LogsPage from './pages/LogsPage';
import Settings from './pages/Settings';

// 导入布局组件
import AppLayout from './components/AppLayout';

const App = () => {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route exact path="/" component={MockData} />
          <Route exact path="/interface" component={InterfaceManagement} />
          <Route path="/interface/:featureId" component={InterfaceManagement} />
          <Route path="/logs" component={LogsPage} />
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