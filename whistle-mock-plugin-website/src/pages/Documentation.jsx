import React from 'react';
import CodeBlock from '../components/CodeBlock';

const Documentation = () => {
  return (
    <div className="py-12">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">文档</h1>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto">
            详细的 API 文档和配置说明
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Table of Contents */}
          <div className="card mb-8 bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">目录</h2>
            <ul className="space-y-2 text-gray-700">
              <li><a href="#config-reference" className="text-primary-600 hover:underline">配置参考</a></li>
              <li><a href="#api-reference" className="text-primary-600 hover:underline">API 参考</a></li>
              <li><a href="#matching-rules" className="text-primary-600 hover:underline">匹配规则</a></li>
              <li><a href="#mockjs-syntax" className="text-primary-600 hover:underline">Mock.js 语法</a></li>
              <li><a href="#best-practices" className="text-primary-600 hover:underline">最佳实践</a></li>
              <li><a href="#troubleshooting" className="text-primary-600 hover:underline">常见问题</a></li>
            </ul>
          </div>

          {/* Configuration Reference */}
          <div id="config-reference" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">配置参考</h2>
            
            <div className="card mb-6">
              <h3 className="text-2xl font-bold mb-4">接口配置结构</h3>
              <CodeBlock
                code={`{
  // 基本信息
  "id": "unique-id",              // 接口唯一标识（自动生成）
  "name": "接口名称",              // 接口显示名称（必填）
  "description": "接口描述",       // 接口详细描述（可选）
  "featureId": "feature-id",      // 所属功能模块ID（必填）
  
  // 匹配规则
  "urlPattern": "/api/users",     // URL匹配模式（必填）
  "matchType": "exact",           // 匹配类型：exact|wildcard|regex
  "method": "GET",                // HTTP方法：GET|POST|PUT|DELETE|PATCH|ALL
  
  // 代理配置
  "proxyType": "response",        // 代理类型：response|file|redirect
  "targetUrl": "",                // 重定向目标URL（redirect模式）
  "localFilePath": "",            // 本地文件路径（file模式）
  "preserveParams": true,         // 是否保留请求参数（redirect模式）
  
  // 响应配置
  "responses": [{
    "id": "response-id",          // 响应ID（自动生成）
    "name": "响应名称",            // 响应显示名称
    "description": "响应描述",     // 响应详细描述
    "content": {},                // 响应内容（支持Mock.js语法）
    "isActive": true              // 是否为当前激活的响应
  }],
  
  // 高级选项
  "enabled": true,                // 是否启用该接口
  "delay": 0,                     // 响应延迟（毫秒）
  "statusCode": 200,              // HTTP状态码
  "headers": {                    // 自定义响应头
    "Content-Type": "application/json"
  },
  "logging": true,                // 是否记录日志
  
  // 元数据
  "createTime": "2024-01-01",     // 创建时间（自动生成）
  "updateTime": "2024-01-01"      // 更新时间（自动更新）
}`}
                language="json"
              />
            </div>

            <div className="card">
              <h3 className="text-2xl font-bold mb-4">功能模块配置结构</h3>
              <CodeBlock
                code={`{
  "id": "feature-id",             // 模块唯一标识（自动生成）
  "name": "功能模块名称",          // 模块显示名称（必填）
  "description": "模块描述",       // 模块详细描述（可选）
  "enabled": true,                // 是否启用该模块
  "createTime": "2024-01-01",     // 创建时间（自动生成）
  "updateTime": "2024-01-01"      // 更新时间（自动更新）
}`}
                language="json"
              />
            </div>
          </div>

          {/* API Reference */}
          <div id="api-reference" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">API 参考</h2>
            
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-xl font-bold mb-2">获取所有功能模块</h3>
                <CodeBlock
                  code="GET /api/features"
                  language="text"
                />
                <p className="text-gray-600 mt-2">返回所有功能模块的列表</p>
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-2">创建功能模块</h3>
                <CodeBlock
                  code={`POST /api/features
Content-Type: application/json

{
  "name": "用户管理",
  "description": "用户相关接口"
}`}
                  language="http"
                />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-2">获取所有接口</h3>
                <CodeBlock
                  code="GET /api/interfaces"
                  language="text"
                />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-2">创建接口</h3>
                <CodeBlock
                  code={`POST /api/interfaces
Content-Type: application/json

{
  "name": "用户信息接口",
  "featureId": "feature-id",
  "urlPattern": "/api/user/info",
  "method": "GET",
  "responses": [...]
}`}
                  language="http"
                />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-2">测试接口</h3>
                <CodeBlock
                  code={`POST /api/test-interface
Content-Type: application/json

{
  "interfaceId": "interface-id",
  "responseId": "response-id"
}`}
                  language="http"
                />
              </div>
            </div>
          </div>

          {/* Matching Rules */}
          <div id="matching-rules" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">匹配规则详解</h2>
            
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-xl font-bold mb-4">精确匹配 (exact)</h3>
                <p className="text-gray-600 mb-4">完全匹配 URL 路径，大小写敏感</p>
                <CodeBlock
                  code={`// 配置
{
  "urlPattern": "/api/user/info",
  "matchType": "exact"
}

// 匹配
✓ /api/user/info
✗ /api/user/info?id=123  // 带参数不匹配
✗ /api/user/profile
✗ /API/user/info         // 大小写不同`}
                  language="javascript"
                />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">通配符匹配 (wildcard)</h3>
                <p className="text-gray-600 mb-4">使用 * 作为通配符，匹配任意字符</p>
                <CodeBlock
                  code={`// 配置
{
  "urlPattern": "/api/user/*",
  "matchType": "wildcard"
}

// 匹配
✓ /api/user/info
✓ /api/user/profile
✓ /api/user/123/detail
✗ /api/users            // 不匹配
✗ /api/product/info     // 不匹配`}
                  language="javascript"
                />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">正则表达式匹配 (regex)</h3>
                <p className="text-gray-600 mb-4">使用正则表达式进行复杂匹配</p>
                <CodeBlock
                  code={`// 配置：匹配用户ID（纯数字）
{
  "urlPattern": "^/api/user/\\\\d+$",
  "matchType": "regex"
}

// 匹配
✓ /api/user/123
✓ /api/user/456789
✗ /api/user/abc         // 不是数字
✗ /api/user/123/detail  // 后面还有路径

// 配置：匹配多个相似路径
{
  "urlPattern": "^/api/(user|admin)/info$",
  "matchType": "regex"
}

// 匹配
✓ /api/user/info
✓ /api/admin/info
✗ /api/product/info`}
                  language="javascript"
                />
              </div>
            </div>
          </div>

          {/* Mock.js Syntax */}
          <div id="mockjs-syntax" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Mock.js 语法速查</h2>
            
            <div className="card">
              <h3 className="text-xl font-bold mb-4">基本数据类型</h3>
              <CodeBlock
                code={`{
  // 字符串
  "string": "@string",              // 随机字符串
  "string5": "@string(5)",          // 5个字符
  "string5_10": "@string(5, 10)",   // 5-10个字符
  
  // 数字
  "integer": "@integer",            // 随机整数
  "integer1_100": "@integer(1, 100)", // 1-100之间
  "float": "@float",                // 随机浮点数
  "float0_100": "@float(0, 100, 2, 2)", // 保留2位小数
  
  // 布尔值
  "boolean": "@boolean",            // true或false
  
  // 日期时间
  "date": "@date",                  // 日期：2024-01-01
  "date_custom": "@date('yyyy-MM-dd')",
  "time": "@time",                  // 时间：12:30:45
  "datetime": "@datetime",          // 日期时间
  "now": "@now",                    // 当前时间
  
  // 颜色
  "color": "@color",                // 颜色：#79f2e3
  "hex": "@hex",                    // 十六进制
  "rgb": "@rgb",                    // RGB格式
  "rgba": "@rgba"                   // RGBA格式
}`}
                language="json"
              />
            </div>

            <div className="card mt-6">
              <h3 className="text-xl font-bold mb-4">中文数据</h3>
              <CodeBlock
                code={`{
  // 姓名
  "name": "@cname",                 // 中文姓名：张三
  "firstName": "@cfirst",           // 姓
  "lastName": "@clast",             // 名
  
  // 段落和句子
  "title": "@ctitle",               // 中文标题
  "title5_10": "@ctitle(5, 10)",    // 5-10个字
  "sentence": "@csentence",         // 中文句子
  "paragraph": "@cparagraph",       // 中文段落
  "word": "@cword",                 // 中文字符
  
  // 地址
  "region": "@region",              // 区域：华北
  "province": "@province",          // 省份：山东省
  "city": "@city",                  // 城市：济南市
  "county": "@county",              // 区县：历下区
  "zip": "@zip"                     // 邮编
}`}
                language="json"
              />
            </div>

            <div className="card mt-6">
              <h3 className="text-xl font-bold mb-4">英文数据</h3>
              <CodeBlock
                code={`{
  // 姓名
  "name": "@name",                  // 英文姓名
  "firstName": "@first",            // 名
  "lastName": "@last",              // 姓
  
  // 段落和句子
  "title": "@title",                // 英文标题
  "sentence": "@sentence",          // 英文句子
  "paragraph": "@paragraph",        // 英文段落
  "word": "@word",                  // 英文单词
  
  // 网络
  "url": "@url",                    // URL地址
  "domain": "@domain",              // 域名
  "email": "@email",                // 邮箱
  "ip": "@ip",                      // IP地址
  "tld": "@tld"                     // 顶级域名
}`}
                language="json"
              />
            </div>

            <div className="card mt-6">
              <h3 className="text-xl font-bold mb-4">其他常用</h3>
              <CodeBlock
                code={`{
  // 图片
  "avatar": "@image('200x200')",   // 图片URL
  "avatar_with_text": "@image('200x200', '#50B347', '#FFF', 'Avatar')",
  
  // ID
  "id": "@id",                      // 18位ID
  "guid": "@guid",                  // GUID
  "increment": "@increment",        // 自增ID
  
  // 数组（重复生成）
  "list|5": [{                      // 固定5个元素
    "id": "@increment",
    "name": "@cname"
  }],
  "list|1-10": [{                   // 1-10个元素
    "id": "@increment"
  }],
  
  // 对象属性重复
  "user": {
    "id|+1": 1,                     // 自增：1,2,3...
    "age|18-60": 1,                 // 18-60之间
    "score|1-100.2": 1              // 1-100，保留2位小数
  }
}`}
                language="json"
              />
            </div>
          </div>

          {/* Best Practices */}
          <div id="best-practices" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">最佳实践</h2>
            
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-xl font-bold mb-4">1. 合理组织功能模块</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>按业务功能划分模块，如"用户管理"、"商品管理"等</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>每个模块包含相关的接口，便于管理和维护</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>为模块添加清晰的描述，方便团队协作</span>
                  </li>
                </ul>
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">2. 使用多响应管理不同场景</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>为每个接口配置多个响应：成功、失败、异常等</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>使用描述性的响应名称，如"用户不存在"、"权限不足"</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>添加响应描述，说明该响应的使用场景</span>
                  </li>
                </ul>
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">3. 合理使用 Mock.js 语法</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>使用 Mock.js 生成随机数据，让测试更真实</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>数组数据使用范围语法，如 "list|5-10"</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>使用 @increment 生成唯一ID</span>
                  </li>
                </ul>
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">4. 设置适当的响应延迟</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>模拟真实网络环境，设置合理的延迟时间</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>测试加载状态和超时处理</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>不同接口可设置不同的延迟时间</span>
                  </li>
                </ul>
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">5. 定期备份配置数据</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>使用导出功能备份重要配置</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>将配置文件纳入版本控制系统</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>团队共享配置文件，保持环境一致</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div id="troubleshooting" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">常见问题</h2>
            
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-xl font-bold mb-2">接口没有生效？</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">1.</span>
                    <span>检查功能模块和接口是否都已启用</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">2.</span>
                    <span>确认 URL 匹配规则是否正确</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">3.</span>
                    <span>检查 HTTP 方法是否匹配</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">4.</span>
                    <span>查看日志记录中是否有匹配记录</span>
                  </li>
                </ul>
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-2">Mock.js 语法不生效？</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">1.</span>
                    <span>确保语法正确，特别注意引号和转义字符</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">2.</span>
                    <span>在 JSON 中使用双引号，不要使用单引号</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">3.</span>
                    <span>检查 Mock.js 语法是否正确，参考官方文档</span>
                  </li>
                </ul>
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-2">无法访问插件管理界面？</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">1.</span>
                    <span>确认 Whistle 服务已启动（w2 status）</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">2.</span>
                    <span>检查插件是否正确安装（npm list -g whistle.mock-plugin）</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">3.</span>
                    <span>尝试重启 Whistle 服务（w2 restart）</span>
                  </li>
                </ul>
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-2">性能问题？</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">1.</span>
                    <span>禁用不使用的功能模块和接口</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">2.</span>
                    <span>使用精确匹配而不是正则表达式（性能更好）</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">3.</span>
                    <span>定期清理日志记录</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-600 mr-2">4.</span>
                    <span>避免在响应中生成过大的数据</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Documentation;
