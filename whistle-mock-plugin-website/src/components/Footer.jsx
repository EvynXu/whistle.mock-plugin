import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">关于项目</h3>
            <p className="text-sm leading-relaxed">
              Whistle Mock Plugin 是一个强大的 API 接口模拟工具，
              为开发者提供完整的接口 Mock 解决方案。
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">快速链接</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/features" className="hover:text-primary-400 transition-colors">
                  功能特性
                </Link>
              </li>
              <li>
                <Link to="/quickstart" className="hover:text-primary-400 transition-colors">
                  快速开始
                </Link>
              </li>
              <li>
                <Link to="/documentation" className="hover:text-primary-400 transition-colors">
                  文档
                </Link>
              </li>
              <li>
                <Link to="/examples" className="hover:text-primary-400 transition-colors">
                  示例
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">资源</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/yourusername/whistle.mock-plugin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-400 transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://wproxy.org/whistle/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-400 transition-colors"
                >
                  Whistle 官方文档
                </a>
              </li>
              <li>
                <a
                  href="http://mockjs.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-400 transition-colors"
                >
                  Mock.js 文档
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">联系我们</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/yourusername/whistle.mock-plugin/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-400 transition-colors"
                >
                  提交问题
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/yourusername/whistle.mock-plugin/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-400 transition-colors"
                >
                  讨论区
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>© {currentYear} Whistle Mock Plugin. 采用 MIT 许可证发布。</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
