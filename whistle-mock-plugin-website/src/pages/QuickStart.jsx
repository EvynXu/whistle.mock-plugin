import React from 'react';
import CodeBlock from '../components/CodeBlock';

const QuickStart = () => {
  return (
    <div className="py-12">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">快速开始</h1>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto">
            五分钟内创建你的第一个 Mock 接口
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Step 1 */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mr-4">
                1
              </div>
              <h2 className="text-3xl font-bold text-gray-900">安装 Whistle</h2>
            </div>
            <div className="card ml-16">
              <p className="text-gray-600 mb-4">
                如果你还没有安装 Whistle，首先需要安装它：
              </p>
              <CodeBlock
                code={`# 全局安装 Whistle
npm install -g whistle

# 或使用 yarn
yarn global add whistle`}
                language="bash"
                title="安装 Whistle"
              />
            </div>
          </div>

          {/* Step 2 */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mr-4">
                2
              </div>
              <h2 className="text-3xl font-bold text-gray-900">安装插件</h2>
            </div>
            <div className="card ml-16">
              <p className="text-gray-600 mb-4">
                安装 Whistle Mock Plugin：
              </p>
              <CodeBlock
                code={`# 通过 npm 安装
npm install -g whistle.mock-plugin

# 或通过 yarn 安装
yarn global add whistle.mock-plugin`}
                language="bash"
                title="安装插件"
              />
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <p className="text-yellow-800">
                  <strong>⚠️ 注意：</strong>插件名称必须以 <code className="bg-yellow-200 px-2 py-1 rounded">whistle.</code> 开头才能被 Whistle 识别
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mr-4">
                3
              </div>
              <h2 className="text-3xl font-bold text-gray-900">启动 Whistle</h2>
            </div>
            <div className="card ml-16">
              <p className="text-gray-600 mb-4">
                启动 Whistle 服务：
              </p>
              <CodeBlock
                code={`# 启动 Whistle
w2 start

# 查看 Whistle 状态
w2 status`}
                language="bash"
                title="启动服务"
              />
              <p className="text-gray-600 mt-4">
                Whistle 默认会在 <code className="bg-gray-200 px-2 py-1 rounded">http://localhost:8899</code> 启动
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mr-4">
                4
              </div>
              <h2 className="text-3xl font-bold text-gray-900">配置浏览器代理</h2>
            </div>
            <div className="card ml-16">
              <p className="text-gray-600 mb-4">
                配置浏览器使用 Whistle 代理（可选，推荐使用 SwitchyOmega 等代理插件）：
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="text-primary-600 mr-2 mt-1">•</span>
                  <span>代理服务器地址：<code className="bg-gray-200 px-2 py-1 rounded">127.0.0.1</code></span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-600 mr-2 mt-1">•</span>
                  <span>端口：<code className="bg-gray-200 px-2 py-1 rounded">8899</code></span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-600 mr-2 mt-1">•</span>
                  <span>协议：HTTP 和 HTTPS</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Step 5 */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mr-4">
                5
              </div>
              <h2 className="text-3xl font-bold text-gray-900">打开插件管理界面</h2>
            </div>
            <div className="card ml-16">
              <p className="text-gray-600 mb-4">
                在浏览器中访问插件管理页面：
              </p>
              <CodeBlock
                code="http://local.whistlejs.com/plugin.mock-plugin/"
                language="text"
              />
              <p className="text-gray-600 mt-4">
                或者在 Whistle 管理界面（<code className="bg-gray-200 px-2 py-1 rounded">http://localhost:8899</code>）的 Plugins 页面中找到 mock-plugin 并点击打开
              </p>
            </div>
          </div>

          {/* Step 6 */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mr-4">
                6
              </div>
              <h2 className="text-3xl font-bold text-gray-900">创建第一个 Mock 接口</h2>
            </div>
            <div className="card ml-16">
              <h3 className="text-xl font-bold mb-4">1. 创建功能模块</h3>
              <p className="text-gray-600 mb-4">
                在插件管理界面中，点击"添加功能模块"按钮，输入模块名称和描述：
              </p>
              <ul className="space-y-2 text-gray-600 mb-6">
                <li className="flex items-start">
                  <span className="text-primary-600 mr-2 mt-1">•</span>
                  <span>模块名称：用户管理</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-600 mr-2 mt-1">•</span>
                  <span>描述：用户相关接口</span>
                </li>
              </ul>

              <h3 className="text-xl font-bold mb-4">2. 添加接口配置</h3>
              <p className="text-gray-600 mb-4">
                在功能模块中点击"添加接口"，配置接口信息：
              </p>
              <CodeBlock
                code={`{
  "name": "用户信息接口",
  "urlPattern": "/api/user/info",
  "method": "GET",
  "responses": [
    {
      "name": "成功响应",
      "description": "返回用户信息",
      "content": {
        "code": 200,
        "data": {
          "id": "@integer(10000, 99999)",
          "name": "@cname",
          "email": "@email",
          "avatar": "@image('200x200')",
          "createTime": "@datetime"
        }
      }
    }
  ]
}`}
                language="json"
              />

              <h3 className="text-xl font-bold mb-4 mt-6">3. 启用接口</h3>
              <p className="text-gray-600 mb-4">
                保存接口配置后，点击启用开关，激活该 Mock 接口
              </p>
            </div>
          </div>

          {/* Step 7 */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mr-4">
                7
              </div>
              <h2 className="text-3xl font-bold text-gray-900">测试接口</h2>
            </div>
            <div className="card ml-16">
              <p className="text-gray-600 mb-4">
                使用 curl 或浏览器测试接口：
              </p>
              <CodeBlock
                code={`# 使用 curl 测试
curl http://localhost:8899/api/user/info

# 响应结果（示例）
{
  "code": 200,
  "data": {
    "id": 45678,
    "name": "李娜",
    "email": "n.lee@example.com",
    "avatar": "http://dummyimage.com/200x200",
    "createTime": "2024-01-15 14:30:25"
  }
}`}
                language="bash"
              />
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="text-green-800">
                  <strong>✅ 成功！</strong>你已经创建了第一个 Mock 接口，每次请求都会返回随机生成的数据
                </p>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🎉 恭喜完成！</h2>
            <p className="text-gray-700 mb-4">
              你已经成功创建了第一个 Mock 接口。接下来可以：
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-primary-600 mr-2 mt-1">→</span>
                <span>探索更多<a href="/features" className="text-primary-600 hover:underline font-medium">功能特性</a></span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2 mt-1">→</span>
                <span>查看<a href="/examples" className="text-primary-600 hover:underline font-medium">更多示例</a></span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2 mt-1">→</span>
                <span>阅读<a href="/documentation" className="text-primary-600 hover:underline font-medium">完整文档</a></span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default QuickStart;
