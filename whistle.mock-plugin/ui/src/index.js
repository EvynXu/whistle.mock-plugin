import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter as Router, Switch, Route, Redirect } from 'react-router-dom';

// 导入页面组件
import Welcome from './pages/Welcome';
import MockData from './pages/MockData';
import InterfaceManagement from './pages/InterfaceManagement';
import FileProxy from './pages/FileProxy';
import UrlRedirect from './pages/UrlRedirect';
import Settings from './pages/Settings';

// 导入全局样式
import './styles/global.css';

const App = () => {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={Welcome} />
        <Route path="/mock-data" component={MockData} />
        <Route path="/interface/:featureId" component={InterfaceManagement} />
        <Route path="/file-proxy" component={FileProxy} />
        <Route path="/url-redirect" component={UrlRedirect} />
        <Route path="/settings" component={Settings} />
        <Redirect to="/" />
      </Switch>
    </Router>
  );
};

ReactDOM.render(<App />, document.getElementById('root')); 