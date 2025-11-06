import React from 'react';
import CodeBlock from '../components/CodeBlock';

const Examples = () => {
  return (
    <div className="py-12">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">示例</h1>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto">
            实际应用场景和配置示例
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Example 1 */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              示例 1：用户管理系统
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              完整的用户管理接口，包括用户列表、用户详情、创建用户等功能
            </p>

            <div className="space-y-6">
              <div className="card">
                <h3 className="text-xl font-bold mb-4">用户列表接口</h3>
                <CodeBlock
                  code={`{
  "name": "用户列表",
  "urlPattern": "/api/users",
  "method": "GET",
  "responses": [
    {
      "name": "成功响应",
      "description": "返回用户列表",
      "content": {
        "code": 200,
        "data": {
          "total": 100,
          "page": 1,
          "pageSize": 10,
          "list|10": [{
            "id": "@increment",
            "name": "@cname",
            "email": "@email",
            "phone": /^1[3-9]\\d{9}/,
            "avatar": "@image('100x100')",
            "role": "@pick(['admin', 'user', 'guest'])",
            "status": "@pick(['active', 'inactive'])",
            "createTime": "@datetime"
          }]
        }
      }
    },
    {
      "name": "空列表",
      "description": "没有用户数据",
      "content": {
        "code": 200,
        "data": {
          "total": 0,
          "page": 1,
          "pageSize": 10,
          "list": []
        }
      }
    }
  ]
}`}
                  language="json"
                />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">用户详情接口</h3>
                <CodeBlock
                  code={`{
  "name": "用户详情",
  "urlPattern": "/api/users/*",
  "matchType": "wildcard",
  "method": "GET",
  "responses": [
    {
      "name": "成功响应",
      "content": {
        "code": 200,
        "data": {
          "id": "@integer(1, 1000)",
          "name": "@cname",
          "email": "@email",
          "phone": /^1[3-9]\\d{9}/,
          "avatar": "@image('200x200')",
          "gender": "@pick(['male', 'female'])",
          "birthday": "@date",
          "address": "@county(true)",
          "role": "user",
          "status": "active",
          "profile": {
            "bio": "@cparagraph",
            "website": "@url",
            "company": "@ctitle(2, 4)",
            "position": "@ctitle(2, 3)"
          },
          "createTime": "@datetime",
          "updateTime": "@datetime"
        }
      }
    },
    {
      "name": "用户不存在",
      "content": {
        "code": 404,
        "message": "用户不存在"
      }
    }
  ]
}`}
                  language="json"
                />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">创建用户接口</h3>
                <CodeBlock
                  code={`{
  "name": "创建用户",
  "urlPattern": "/api/users",
  "method": "POST",
  "responses": [
    {
      "name": "创建成功",
      "content": {
        "code": 200,
        "message": "创建成功",
        "data": {
          "id": "@increment",
          "name": "@cname",
          "email": "@email",
          "createTime": "@now"
        }
      }
    },
    {
      "name": "参数错误",
      "content": {
        "code": 400,
        "message": "参数错误",
        "errors": {
          "name": "用户名不能为空",
          "email": "邮箱格式不正确"
        }
      }
    },
    {
      "name": "用户已存在",
      "content": {
        "code": 409,
        "message": "用户邮箱已存在"
      }
    }
  ]
}`}
                  language="json"
                />
              </div>
            </div>
          </div>

          {/* Example 2 */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              示例 2：电商商品管理
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              电商系统的商品相关接口，包括商品列表、分类、详情等
            </p>

            <div className="space-y-6">
              <div className="card">
                <h3 className="text-xl font-bold mb-4">商品列表接口</h3>
                <CodeBlock
                  code={`{
  "name": "商品列表",
  "urlPattern": "/api/products",
  "method": "GET",
  "responses": [{
    "name": "成功响应",
    "content": {
      "code": 200,
      "data": {
        "total": 50,
        "list|10": [{
          "id": "@increment",
          "name": "@ctitle(5, 10)",
          "description": "@cparagraph",
          "price": "@float(10, 1000, 2, 2)",
          "originalPrice": "@float(20, 1500, 2, 2)",
          "discount": "@integer(50, 95)",
          "stock": "@integer(0, 1000)",
          "sales": "@integer(0, 10000)",
          "rating": "@float(3, 5, 1, 1)",
          "images|3-5": ["@image('400x400')"],
          "category": {
            "id": "@integer(1, 10)",
            "name": "@pick(['电子产品', '服装', '食品', '图书', '家居'])"
          },
          "tags|2-4": ["@pick(['热卖', '新品', '推荐', '特价', '限时'])"],
          "status": "@pick(['on_sale', 'off_shelf', 'sold_out'])",
          "createTime": "@datetime"
        }]
      }
    }
  }]
}`}
                  language="json"
                />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">商品详情接口</h3>
                <CodeBlock
                  code={`{
  "name": "商品详情",
  "urlPattern": "/api/products/*",
  "matchType": "wildcard",
  "method": "GET",
  "responses": [{
    "name": "成功响应",
    "content": {
      "code": 200,
      "data": {
        "id": "@integer(1, 1000)",
        "name": "@ctitle(5, 15)",
        "description": "@cparagraph(3, 5)",
        "price": "@float(10, 1000, 2, 2)",
        "originalPrice": "@float(20, 1500, 2, 2)",
        "stock": "@integer(0, 1000)",
        "sales": "@integer(0, 10000)",
        "rating": "@float(3, 5, 1, 1)",
        "images|5-10": ["@image('800x800')"],
        "video": "@url",
        "category": {
          "id": "@integer(1, 10)",
          "name": "@ctitle(2, 4)",
          "path": "@url('path')"
        },
        "attributes": {
          "brand": "@ctitle(2, 4)",
          "model": "@string('upper', 5)",
          "color|2-4": ["@color"],
          "size|2-5": ["@pick(['S', 'M', 'L', 'XL', 'XXL'])"]
        },
        "specs|3-5": [{
          "name": "@ctitle(2, 4)",
          "value": "@ctitle(2, 6)"
        }],
        "reviews": {
          "total": "@integer(0, 1000)",
          "average": "@float(3, 5, 1, 1)",
          "list|5": [{
            "id": "@increment",
            "user": {
              "id": "@integer(1, 10000)",
              "name": "@cname",
              "avatar": "@image('50x50')"
            },
            "rating": "@integer(1, 5)",
            "content": "@cparagraph",
            "images|0-3": ["@image('200x200')"],
            "createTime": "@datetime"
          }]
        },
        "relatedProducts|4": [{
          "id": "@increment",
          "name": "@ctitle(5, 10)",
          "price": "@float(10, 1000, 2, 2)",
          "image": "@image('200x200')"
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

          {/* Example 3 */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              示例 3：文章博客系统
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              博客系统的文章管理接口
            </p>

            <div className="card">
              <h3 className="text-xl font-bold mb-4">文章列表接口</h3>
              <CodeBlock
                code={`{
  "name": "文章列表",
  "urlPattern": "/api/articles",
  "method": "GET",
  "responses": [{
    "name": "成功响应",
    "content": {
      "code": 200,
      "data": {
        "total": 100,
        "list|10": [{
          "id": "@increment",
          "title": "@ctitle(10, 30)",
          "summary": "@cparagraph(1, 2)",
          "cover": "@image('800x450')",
          "author": {
            "id": "@integer(1, 100)",
            "name": "@cname",
            "avatar": "@image('100x100')"
          },
          "category": {
            "id": "@integer(1, 10)",
            "name": "@pick(['技术', '生活', '随笔', '教程', '分享'])"
          },
          "tags|2-4": ["@ctitle(2, 4)"],
          "views": "@integer(0, 10000)",
          "likes": "@integer(0, 1000)",
          "comments": "@integer(0, 500)",
          "status": "@pick(['published', 'draft'])",
          "publishTime": "@datetime",
          "updateTime": "@datetime"
        }]
      }
    }
  }]
}`}
                language="json"
              />
            </div>
          </div>

          {/* Example 4 */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              示例 4：数据统计图表
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              后台管理系统的统计数据接口
            </p>

            <div className="space-y-6">
              <div className="card">
                <h3 className="text-xl font-bold mb-4">总览统计</h3>
                <CodeBlock
                  code={`{
  "name": "总览统计",
  "urlPattern": "/api/dashboard/overview",
  "method": "GET",
  "responses": [{
    "name": "成功响应",
    "content": {
      "code": 200,
      "data": {
        "users": {
          "total": "@integer(10000, 100000)",
          "today": "@integer(100, 1000)",
          "growth": "@float(0, 100, 2, 2)"
        },
        "orders": {
          "total": "@integer(50000, 500000)",
          "today": "@integer(500, 5000)",
          "growth": "@float(-10, 50, 2, 2)"
        },
        "revenue": {
          "total": "@float(1000000, 10000000, 2, 2)",
          "today": "@float(10000, 100000, 2, 2)",
          "growth": "@float(-5, 30, 2, 2)"
        },
        "products": {
          "total": "@integer(1000, 10000)",
          "onSale": "@integer(800, 9000)",
          "soldOut": "@integer(50, 500)"
        }
      }
    }
  }]
}`}
                  language="json"
                />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">趋势图数据</h3>
                <CodeBlock
                  code={`{
  "name": "销售趋势",
  "urlPattern": "/api/dashboard/trend",
  "method": "GET",
  "responses": [{
    "name": "成功响应",
    "content": {
      "code": 200,
      "data": {
        "dates|7": ["@date('MM-dd')"],
        "sales|7": ["@integer(1000, 10000)"],
        "orders|7": ["@integer(100, 1000)"],
        "users|7": ["@integer(50, 500)"]
      }
    }
  }]
}`}
                  language="json"
                />
              </div>
            </div>
          </div>

          {/* Example 5 */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              示例 5：文件上传和下载
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              文件处理相关接口的 Mock 配置
            </p>

            <div className="space-y-6">
              <div className="card">
                <h3 className="text-xl font-bold mb-4">文件上传接口</h3>
                <CodeBlock
                  code={`{
  "name": "文件上传",
  "urlPattern": "/api/upload",
  "method": "POST",
  "delay": 2000,  // 模拟上传延迟
  "responses": [
    {
      "name": "上传成功",
      "content": {
        "code": 200,
        "message": "上传成功",
        "data": {
          "fileId": "@guid",
          "fileName": "@string('lower', 10) + '.jpg'",
          "fileSize": "@integer(1024, 10485760)",
          "fileType": "image/jpeg",
          "url": "@image('1920x1080')",
          "thumbnail": "@image('400x300')",
          "uploadTime": "@now"
        }
      }
    },
    {
      "name": "文件过大",
      "content": {
        "code": 413,
        "message": "文件大小不能超过 10MB"
      }
    },
    {
      "name": "文件类型不支持",
      "content": {
        "code": 415,
        "message": "不支持的文件类型"
      }
    }
  ]
}`}
                  language="json"
                />
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">文件列表接口</h3>
                <CodeBlock
                  code={`{
  "name": "文件列表",
  "urlPattern": "/api/files",
  "method": "GET",
  "responses": [{
    "name": "成功响应",
    "content": {
      "code": 200,
      "data": {
        "total": "@integer(10, 100)",
        "list|10": [{
          "id": "@guid",
          "name": "@string('lower', 10) + @pick(['.jpg', '.png', '.pdf', '.doc'])",
          "size": "@integer(1024, 10485760)",
          "type": "@pick(['image', 'document', 'video', 'audio'])",
          "url": "@url",
          "thumbnail": "@image('200x200')",
          "uploader": {
            "id": "@integer(1, 1000)",
            "name": "@cname"
          },
          "uploadTime": "@datetime",
          "downloads": "@integer(0, 1000)"
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

          {/* Example 6 */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              示例 6：错误处理和边界场景
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              各种错误状态和边界情况的 Mock 配置
            </p>

            <div className="card">
              <CodeBlock
                code={`{
  "name": "综合接口",
  "urlPattern": "/api/test",
  "method": "GET",
  "responses": [
    {
      "name": "成功响应",
      "content": {
        "code": 200,
        "data": { ... }
      }
    },
    {
      "name": "请求参数错误",
      "content": {
        "code": 400,
        "message": "请求参数错误",
        "errors": {
          "field1": "字段1不能为空",
          "field2": "字段2格式不正确"
        }
      }
    },
    {
      "name": "未授权",
      "content": {
        "code": 401,
        "message": "未登录或登录已过期"
      }
    },
    {
      "name": "无权限",
      "content": {
        "code": 403,
        "message": "您没有权限执行此操作"
      }
    },
    {
      "name": "资源不存在",
      "content": {
        "code": 404,
        "message": "请求的资源不存在"
      }
    },
    {
      "name": "请求超时",
      "delay": 30000,
      "content": {
        "code": 408,
        "message": "请求超时"
      }
    },
    {
      "name": "服务器错误",
      "content": {
        "code": 500,
        "message": "服务器内部错误",
        "error": "Internal Server Error"
      }
    },
    {
      "name": "服务不可用",
      "content": {
        "code": 503,
        "message": "服务暂时不可用，请稍后重试"
      }
    }
  ]
}`}
                language="json"
              />
            </div>
          </div>

          {/* Tips */}
          <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">💡 使用提示</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>复制这些示例到你的项目中，根据实际需求进行修改</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>为每个接口配置多个响应场景，方便测试不同情况</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>使用 Mock.js 语法生成随机数据，让测试更真实</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>设置适当的响应延迟，模拟真实网络环境</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>查看<a href="/documentation" className="text-primary-600 hover:underline font-medium">完整文档</a>了解更多配置选项</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Examples;
