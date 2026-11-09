import React from 'react';
import MainNav from './MainNav';
import '../styles/page-container.css';

const PageContainer = ({ children }) => {
  return (
    <div className="page-container">
      <MainNav />
      <div className="page-content">
        {children}
      </div>
    </div>
  );
};

export default PageContainer; 