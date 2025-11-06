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
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Whistle Mock Plugin
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-primary-100">
            强大的 API 接口模拟工具，提供完整的接口 Mock 解决方案
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/quickstart" className="px-6 py-3 bg-white text-primary-600 rounded-lg font-medium hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl">
              快速开始
            </Link>
            <Link to="/features" className="px-6 py-3 bg-transparent text-white border-2 border-white rounded-lg font-medium hover:bg-white hover:text-primary-600 transition-all duration-200">
              了解更多
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Install */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              一分钟快速安装
            </h2>
            <p className="text-gray-600 mb-8">
              通过 npm 或 yarn 快速安装插件，立即开始使用
            </p>
            <CodeBlock
              code="# 通过 npm 安装\nnpm install whistle.mock-plugin -g\n\n# 或通过 yarn 安装\nyarn global add whistle.mock-plugin\n\n# 启动 Whistle\nw2 start"
              language="bash"
              title="安装命令"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="section-title">核心功能特性</h2>
            <p className="section-subtitle">
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
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="section-title">使用场景</h2>
            <p className="section-subtitle">
              适用于开发、测试、演示等多个阶段
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="card">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {useCase.title}
                </h3>
                <ul className="space-y-2">
                  {useCase.items.map((item, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-primary-600 mr-2">✓</span>
                      <span className="text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Example */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="section-title">快速示例</h2>
              <p className="section-subtitle">
                几分钟内创建你的第一个 Mock 接口
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="card">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
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
              <div className="card">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  2. 启用并测试
                </h3>
                <p className="text-gray-600 mb-4">
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
      <section className="py-16 bg-primary-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">
            准备好开始了吗？
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            立即安装并体验强大的 API Mock 功能
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/quickstart" className="btn-primary bg-white text-primary-600 hover:bg-gray-100">
              查看快速开始指南
            </Link>
            <a
              href="https://github.com/EvynXu/whistle.mock-plugin"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary border-white text-white hover:bg-white/10"
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
