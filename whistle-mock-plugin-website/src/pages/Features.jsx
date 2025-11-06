import React from 'react';
import FeatureCard from '../components/FeatureCard';
import CodeBlock from '../components/CodeBlock';

const Features = () => {
  const mainFeatures = [
    {
      icon: '📦',
      title: '功能模块管理',
      description: '模块化组织接口，支持批量控制、描述信息和状态统计',
      color: 'primary',
    },
    {
      icon: '🎯',
      title: '多响应管理',
      description: '每个接口可配置多个不同的响应内容，支持响应切换和内容预览',
      color: 'green',
    },
    {
      icon: '🔍',
      title: '智能接口匹配',
      description: '支持精确匹配、通配符匹配和正则表达式匹配',
      color: 'purple',
    },
    {
      icon: '🔄',
      title: '代理模式支持',
      description: '支持响应模式、文件代理和URL重定向',
      color: 'orange',
    },
    {
      icon: '✨',
      title: 'Mock.js 集成',
      description: '集成Mock.js库，支持动态数据生成和所有模板语法',
      color: 'blue',
    },
    {
      icon: '⚙️',
      title: '高级配置选项',
      description: '支持响应延迟、自定义状态码和响应头设置',
      color: 'pink',
    },
  ];

  return (
    <div className="py-12">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">功能特性</h1>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto">
            全面了解 Whistle Mock Plugin 提供的强大功能
          </p>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="section-title">核心功能</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mainFeatures.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Feature Details */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Multi-Response Management */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              多响应管理 ⭐ 核心特性
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              每个接口可配置多个不同的响应内容，灵活切换不同场景的响应数据
            </p>
            <div className="card">
              <h3 className="text-xl font-bold mb-4">配置示例</h3>
              <CodeBlock
                code={`{
  "name": "用户信息接口",
  "urlPattern": "/api/user/info",
  "method": "GET",
  "responses": [
    {
      "id": "success",
      "name": "成功响应",
      "description": "正常返回用户信息",
      "content": {
        "code": 200,
        "data": {
          "id": "@integer(10000, 99999)",
          "name": "@cname",
          "email": "@email",
          "avatar": "@image('200x200')"
        }
      }
    },
    {
      "id": "not_found",
      "name": "用户不存在",
      "description": "用户ID不存在的情况",
      "content": {
        "code": 404,
        "message": "用户不存在"
      }
    },
    {
      "id": "no_permission",
      "name": "无权限",
      "description": "用户无权限访问",
      "content": {
        "code": 403,
        "message": "您没有权限访问该用户信息"
      }
    }
  ]
}`}
                language="json"
              />
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800">
                  <strong>💡 提示：</strong>可以在管理界面中快速切换不同的响应内容，方便测试各种场景
                </p>
              </div>
            </div>
          </div>

          {/* Smart Matching */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              智能接口匹配
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              支持多种匹配模式，满足不同场景的需求
            </p>
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-xl font-bold mb-2">精确匹配</h3>
                <p className="text-gray-600 mb-4">完全匹配 URL 路径</p>
                <CodeBlock
                  code={`{
  "urlPattern": "/api/user/info",
  "matchType": "exact"
}`}
                  language="json"
                />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-2">通配符匹配</h3>
                <p className="text-gray-600 mb-4">使用 * 通配符匹配多个路径</p>
                <CodeBlock
                  code={`{
  "urlPattern": "/api/user/*",
  "matchType": "wildcard"
}

// 可以匹配：
// /api/user/info
// /api/user/profile
// /api/user/123/detail`}
                  language="json"
                />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-2">正则表达式匹配</h3>
                <p className="text-gray-600 mb-4">使用正则表达式进行复杂匹配</p>
                <CodeBlock
                  code={`{
  "urlPattern": "^/api/user/\\d+$",
  "matchType": "regex"
}

// 可以匹配：
// /api/user/123
// /api/user/456
// 不匹配：/api/user/abc`}
                  language="json"
                />
              </div>
            </div>
          </div>

          {/* Proxy Modes */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              代理模式支持
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              支持多种代理方式，灵活应对不同需求
            </p>
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-xl font-bold mb-2">响应模式</h3>
                <p className="text-gray-600 mb-4">直接返回配置的 JSON/HTML 响应内容</p>
                <CodeBlock
                  code={`{
  "proxyType": "response",
  "responses": [{
    "content": {
      "code": 200,
      "data": { ... }
    }
  }]
}`}
                  language="json"
                />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-2">文件代理</h3>
                <p className="text-gray-600 mb-4">返回本地文件内容作为响应</p>
                <CodeBlock
                  code={`{
  "proxyType": "file",
  "localFilePath": "/path/to/response.json"
}`}
                  language="json"
                />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-2">URL 重定向</h3>
                <p className="text-gray-600 mb-4">将请求转发到指定的目标 URL</p>
                <CodeBlock
                  code={`{
  "proxyType": "redirect",
  "targetUrl": "https://api.example.com",
  "preserveParams": true  // 保留原始请求参数
}`}
                  language="json"
                />
              </div>
            </div>
          </div>

          {/* Mock.js Integration */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Mock.js 集成
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              强大的数据模拟能力，自动生成随机数据
            </p>
            <div className="card">
              <h3 className="text-xl font-bold mb-4">常用模板示例</h3>
              <CodeBlock
                code={`{
  "content": {
    // 随机字符串
    "name": "@cname",           // 中文姓名
    "email": "@email",          // 邮箱地址
    "url": "@url",              // URL地址
    
    // 随机数字
    "age": "@integer(18, 60)",  // 18-60之间的整数
    "price": "@float(0, 100, 2, 2)",  // 保留2位小数
    
    // 随机日期
    "date": "@date('yyyy-MM-dd')",
    "time": "@time('HH:mm:ss')",
    "datetime": "@datetime",
    
    // 随机图片
    "avatar": "@image('200x200', '#50B347', '#FFF', 'Avatar')",
    
    // 随机颜色
    "color": "@color",
    
    // 随机布尔值
    "active": "@boolean",
    
    // 数组生成
    "list|5-10": [{  // 生成5-10个元素
      "id": "@increment",
      "title": "@ctitle(5, 10)"
    }]
  }
}`}
                language="json"
              />
            </div>
          </div>

          {/* Advanced Configuration */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              高级配置选项
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              更多配置选项，精确控制响应行为
            </p>
            <div className="card">
              <CodeBlock
                code={`{
  "name": "用户列表接口",
  "urlPattern": "/api/users",
  "method": "GET",
  
  // 响应延迟（毫秒）
  "delay": 1000,
  
  // HTTP 状态码
  "statusCode": 200,
  
  // 响应头
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache"
  },
  
  // 是否启用
  "enabled": true,
  
  // 是否记录日志
  "logging": true,
  
  "responses": [{
    "content": {
      "code": 200,
      "data": {
        "list|10": [{
          "id": "@increment",
          "name": "@cname",
          "email": "@email"
        }]
      }
    }
  }]
}`}
                language="json"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Features;
