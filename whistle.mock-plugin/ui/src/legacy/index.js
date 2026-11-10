import React from 'react';
import { HashRouter as Router, Switch, Route, Redirect } from 'react-router-dom';

// 导入样式
import 'antd/dist/reset.css';
import './styles/global.css';
import './App.css';

// 赛博朋克主题 CSS（规则均带 body.cyber-theme 前缀，默认不生效）
require('./styles/cyber-theme.css');

// 大地色系主题 CSS（规则均带 body.earth-theme 前缀，默认不生效）
require('./styles/earth-theme.css');

// 导入页面组件
import MockData from './pages/MockDataV2';
import InterfaceManagement from './pages/InterfaceManagementV2';
import Settings from './pages/Settings';
import Stats from './pages/Stats';
import Sniffer from './pages/Sniffer';
import Network from './pages/Network';
import AppLayout from './components/AppLayout';
import ReplayWorkspace from '../components/ReplayWorkspace';

const App = () => {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route exact path="/" component={MockData} />
          <Route exact path="/interface" component={InterfaceManagement} />
          <Route path="/interface/:featureId" component={InterfaceManagement} />
          <Route path="/stats" component={Stats} />
          <Route path="/network" component={Network} />
          <Route path="/sniffer" component={Sniffer} />
          <Route path="/settings" component={Settings} />
          <Route exact path="/replay" render={() => null} />
          <Redirect to="/" />
        </Switch>
        <Route exact path="/replay" children={({ match }) => <ReplayWorkspace open={!!match} layout={AppLayout} />} />
      </div>
    </Router>
  );
};

export default App;
