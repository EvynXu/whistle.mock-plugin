import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', label: '首页' },
    { path: '/features', label: '功能特性' },
    { path: '/quickstart', label: '快速开始' },
    { path: '/documentation', label: '文档' },
    { path: '/examples', label: '示例' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-cyber-dark/90 backdrop-blur-md border-b border-cyber-border sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-cyber-black border-2 border-cyber-cyan flex items-center justify-center relative group-hover:shadow-cyber-glow transition-shadow duration-300">
              <span className="text-cyber-cyan font-display font-bold text-xl">W</span>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyber-cyan animate-cyber-pulse" />
            </div>
            <div>
              <span className="text-xl font-display font-bold text-white tracking-wide">Whistle Mock</span>
              <span className="hidden sm:inline text-cyber-cyan font-mono text-sm ml-2">&lt;Plugin /&gt;</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link-cyber ${isActive(item.path) ? 'nav-link-cyber-active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://github.com/EvynXu/whistle.mock-plugin"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cyber text-sm"
            >
              GitHub
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-cyber-cyan border border-cyber-border hover:border-cyber-cyan transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-cyber-border pt-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block py-2 px-4 font-mono text-sm ${
                  isActive(item.path)
                    ? 'text-cyber-cyan bg-cyber-cyan/10 border-l-2 border-cyber-cyan'
                    : 'text-cyber-muted hover:text-cyber-cyan hover:bg-cyber-cyan/5'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {isActive(item.path) && '> '}{item.label}
              </Link>
            ))}
            <a
              href="https://github.com/EvynXu/whistle.mock-plugin"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 btn-cyber text-center text-sm"
            >
              GitHub
            </a>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
