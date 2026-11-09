import React from 'react';
import AppLayout from './components/AppLayout';
import ThemeProvider from './theme/ThemeProvider';
import { HashRouter as Router, Switch, Route, Redirect } from 'react-router-dom';

// 导入样式
import 'antd/dist/reset.css';
import './styles/global.css';
import './App.css';

// 导入页面组件
import MockData from './pages/MockDataV2';
import InterfaceManagement from './pages/InterfaceWorkbench';
import Settings from './pages/Settings';
import Stats from './pages/Stats';
import Sniffer from './pages/Sniffer';
import Network from './pages/Network';

import './styles/ui3.css';

const App = () => {
  return (
    <Router>
      <div className="App">
        <ThemeProvider><AppLayout><Switch>
          <Route exact path="/" component={MockData} />
          <Route exact path="/interface" component={InterfaceManagement} />
          <Route path="/interface/:featureId" component={InterfaceManagement} />
          <Route path="/stats" component={Stats} />
          <Route path="/network" component={Network} />
          <Route path="/sniffer" component={Sniffer} />
          <Route path="/settings" component={Settings} />
          <Redirect to="/" />
        </Switch></AppLayout></ThemeProvider>
      </div>
    </Router>
  );
};

export default App;
