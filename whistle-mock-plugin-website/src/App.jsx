import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Features from './pages/Features';
import QuickStart from './pages/QuickStart';
import Documentation from './pages/Documentation';
import Examples from './pages/Examples';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/quickstart" element={<QuickStart />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/examples" element={<Examples />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
