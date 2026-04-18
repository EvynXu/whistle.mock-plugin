import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-cyber-dark border-t border-cyber-border mt-20 relative overflow-hidden">
      {/* Top glow line */}
      <div className="cyber-divider absolute top-0 left-0 right-0" />
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-cyber-cyan font-display font-bold text-lg mb-4 tracking-wide">
              {'<'}关于项目{' />'}
            </h3>
            <p className="text-cyber-muted text-sm leading-relaxed">
              Whistle Mock Plugin 是一个强大的 API 接口模拟工具，
              为开发者提供完整的接口 Mock 解决方案。
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-cyber-cyan font-display font-bold text-lg mb-4 tracking-wide">
              {'<'}快速链接{' />'}
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { to: '/features', label: '功能特性' },
                { to: '/quickstart', label: '快速开始' },
                { to: '/documentation', label: '文档' },
                { to: '/examples', label: '示例' },
              ].map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-cyber-muted hover:text-cyber-cyan transition-colors font-mono">
                    {'>'} {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-cyber-cyan font-display font-bold text-lg mb-4 tracking-wide">
              {'<'}资源{' />'}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/EvynXu/whistle.mock-plugin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyber-muted hover:text-cyber-cyan transition-colors font-mono"
                >
                  {'>'} GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://wproxy.org/whistle/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyber-muted hover:text-cyber-cyan transition-colors font-mono"
                >
                  {'>'} Whistle 官方文档
                </a>
              </li>
              <li>
                <a
                  href="http://mockjs.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyber-muted hover:text-cyber-cyan transition-colors font-mono"
                >
                  {'>'} Mock.js 文档
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-cyber-cyan font-display font-bold text-lg mb-4 tracking-wide">
              {'<'}联系我们{' />'}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/EvynXu/whistle.mock-plugin/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyber-muted hover:text-cyber-cyan transition-colors font-mono"
                >
                  {'>'} 提交问题
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/EvynXu/whistle.mock-plugin/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyber-muted hover:text-cyber-cyan transition-colors font-mono"
                >
                  {'>'} 讨论区
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-cyber-border mt-8 pt-8 text-center text-sm">
          <p className="text-cyber-muted font-mono">
            <span className="text-cyber-cyan">©</span> {currentYear} Whistle Mock Plugin. 
            <span className="text-cyber-magenta"> MIT</span> License.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
