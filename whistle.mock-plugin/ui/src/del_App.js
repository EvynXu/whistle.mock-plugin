import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import MockData from './pages/MockData';
import InterfaceManagement from './pages/InterfaceManagement';
import Settings from './pages/Settings';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route exact path="/" component={MockData} />
          <Route exact path="/interface" component={InterfaceManagement} />
          <Route path="/interface/:featureId" component={InterfaceManagement} />
          <Route path="/settings" component={Settings} />
          <Redirect to="/" />
        </Switch>
      </div>
    </Router>
  );
}

export default App; 