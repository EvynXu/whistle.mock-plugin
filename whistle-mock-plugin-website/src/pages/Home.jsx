import React from 'react';
import { Link } from 'react-router-dom';
import FeatureCard from '../components/FeatureCard';
import CodeBlock from '../components/CodeBlock';

const Home = () => {
  const features = [
    {
      icon: '📦',
      title: '功能模块管理',
      description: '将相关接口按功能模块分组管理，支持一键启用/禁用整个功能模块',
      color: 'primary',
    },
    {
      icon: '🎯',
      title: '多响应管理',
      description: '每个接口可配置多个不同的响应内容，轻松切换不同的响应场景',
      color: 'green',
    },
    {
      icon: '🔍',
      title: '智能接口匹配',
      description: '支持精确匹配、通配符、正则表达式等多种匹配模式',
      color: 'purple',
    },
    {
      icon: '🔄',
      title: '代理模式支持',
      description: '支持响应模式、文件代理、URL重定向等多种代理方式',
      color: 'orange',
    },
    {
      icon: '✨',
      title: 'Mock.js 集成',
      description: '集成 Mock.js 库，支持动态数据生成和模板语法',
      color: 'blue',
    },
    {
      icon: '⚙️',
      title: '高级配置',
      description: '支持响应延迟、自定义状态码、响应头设置等高级配置选项',
      color: 'pink',
    },
  ];

  const useCases = [
    {
      title: '开发阶段',
      items: ['前后端分离开发', '接口设计验证', '并行开发提高效率'],
    },
    {
      title: '测试阶段',
      items: ['边界测试', '压力测试', '错误场景测试'],
    },
    {
      title: '演示阶段',
      items: ['客户演示', '功能展示', '原型验证'],
    },
  ];

  return (
    <div className="bg-cyber-black">
      {/* Hero Section */}
      <section className="hero-cyber py-24 relative">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="cyber-tag mb-6">API MOCK TOOL v1.2</div>
          <h1 className="text-5xl md:text-7xl font-display font-black mb-6 text-white tracking-wider">
            Whistle <span className="text-cyber-cyan text-glow-cyan">Mock</span> Plugin
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-cyber-muted max-w-3xl mx-auto">
            强大的 API 接口模拟工具，提供完整的接口 Mock 解决方案
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/quickstart" className="btn-cyber-filled text-center">
              快速开始
            </Link>
            <Link to="/features" className="btn-cyber text-center">
              了解更多
            </Link>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-cyan/50 to-transparent" />
      </section>

      {/* Quick Install */}
      <section className="py-20 bg-cyber-dark relative">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="cyber-tag mb-4">INSTALLATION</div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4 tracking-wide">
                一分钟快速安装
              </h2>
              <p className="text-cyber-muted">
                通过 npm 或 yarn 快速安装插件，立即开始使用
              </p>
            </div>
            <CodeBlock
              code={`# 通过 npm 安装
npm install whistle.mock-plugin -g

# 或通过 yarn 安装
yarn global add whistle.mock-plugin

# 启动 Whistle
w2 start`}
              language="bash"
              title="安装命令"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-cyber-black relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="cyber-tag mb-4">FEATURES</div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4 tracking-wide">
              核心功能特性
            </h2>
            <p className="text-cyber-muted max-w-2xl mx-auto">
              为开发者提供全方位的 API Mock 解决方案
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-cyber-dark relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="cyber-tag mb-4">USE CASES</div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4 tracking-wide">
              使用场景
            </h2>
            <p className="text-cyber-muted">
              适用于开发、测试、演示等多个阶段
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="card-cyber">
                <h3 className="text-2xl font-display font-bold text-white mb-4 tracking-wide">
                  {useCase.title}
                </h3>
                <ul className="space-y-3">
                  {useCase.items.map((item, i) => (
                    <li key={i} className="flex items-start font-mono text-sm">
                      <span className="text-cyber-cyan mr-3 mt-0.5">{'>'}</span>
                      <span className="text-cyber-muted">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Example */}
      <section className="py-20 bg-cyber-black relative">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <div className="cyber-tag mb-4">EXAMPLE</div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4 tracking-wide">
                快速示例
              </h2>
              <p className="text-cyber-muted">
                几分钟内创建你的第一个 Mock 接口
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="card-cyber">
                <h3 className="text-xl font-display font-bold text-white mb-4 tracking-wide">
                  1. 创建接口配置
                </h3>
                <CodeBlock
                  code={`{
  "name": "用户信息接口",
  "urlPattern": "/api/user/info",
  "method": "GET",
  "responses": [{
    "name": "成功响应",
    "content": {
      "code": 200,
      "data": {
        "id": "@integer(10000, 99999)",
        "name": "@cname",
        "email": "@email"
      }
    }
  }]
}`}
                  language="json"
                />
              </div>
              <div className="card-cyber">
                <h3 className="text-xl font-display font-bold text-white mb-4 tracking-wide">
                  2. 启用并测试
                </h3>
                <p className="text-cyber-muted mb-4">
                  在插件管理界面中启用接口，然后发送请求：
                </p>
                <CodeBlock
                  code={`curl http://localhost:8899/api/user/info

# 响应结果
{
  "code": 200,
  "data": {
    "id": 12345,
    "name": "王芳",
    "email": "x.pxdqxhh@qq.com"
  }
}`}
                  language="bash"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-cyber-dark relative border-t border-cyber-border">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-magenta/50 to-transparent" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 tracking-wide">
            准备好开始了吗？
          </h2>
          <p className="text-xl text-cyber-muted mb-10 max-w-2xl mx-auto">
            立即安装并体验强大的 API Mock 功能
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/quickstart" className="btn-cyber-filled text-center">
              查看快速开始指南
            </Link>
            <a
              href="https://github.com/EvynXu/whistle.mock-plugin"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cyber text-center"
            >
              访问 GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
