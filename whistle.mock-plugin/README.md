# Whistle Mock Plugin

一个功能强大的Whistle接口Mock插件，提供完整的API接口模拟解决方案，支持多响应管理、智能参数匹配、灵活代理配置等高级功能。

## 🚀 核心功能特性

### 1. 功能模块管理
- **模块化组织**：将相关接口按功能模块分组管理
- **批量控制**：一键启用/禁用整个功能模块
- **描述信息**：为每个模块添加详细说明和标签
- **状态统计**：实时显示模块下接口数量和启用状态

### 2. 多响应管理 ⭐ 核心特性
- **多响应支持**：每个接口可配置多个不同的响应内容
- **响应切换**：可随时切换不同的响应场景
- **响应描述**：为每个响应添加名称和详细描述
- **内容预览**：支持JSON格式化预览和编辑
- **向下兼容**：完全兼容单响应模式的历史配置

### 3. 智能接口匹配
- **多种匹配模式**：
  - 精确匹配：完全匹配URL路径
  - 通配符匹配：支持 `*` 通配符模式
  - 正则表达式：支持复杂的URL匹配规则
- **HTTP方法过滤**：支持GET、POST、PUT、DELETE等方法筛选
- **参数匹配**：支持query参数、body参数的智能匹配
- **匹配优先级**：精确匹配优先，正则匹配兜底

### 4. 代理模式支持
- **响应模式**：直接返回配置的JSON/HTML响应内容
- **文件代理**：返回本地文件内容作为响应
- **URL重定向**：将请求转发到指定的目标URL
- **参数保留**：重定向时可选择保留原始请求参数

### 5. Mock.js 集成
- **动态数据生成**：集成Mock.js库，支持动态数据生成
- **模板语法**：支持Mock.js的所有数据模板语法
- **随机数据**：自动生成随机的姓名、地址、图片等数据
- **数据类型**：支持字符串、数字、布尔值、数组、对象等所有数据类型

### 6. 高级配置选项
- **响应延迟**：模拟网络延迟，设置响应时间
- **HTTP状态码**：自定义返回状态码（200、404、500等）
- **响应头设置**：配置Content-Type、CORS等响应头
- **请求日志**：详细记录所有匹配的请求信息

### 7. 用户界面特性
- **现代化UI**：基于Ant Design的美观界面
- **响应式设计**：适配不同屏幕尺寸
- **实时预览**：JSON内容格式化显示
- **快速操作**：支持快捷键和批量操作
- **搜索过滤**：快速查找接口和功能模块

## 📋 使用场景

### 开发阶段
- **前后端分离开发**：前端独立开发，不依赖后端接口
- **接口设计验证**：快速验证接口设计的合理性
- **并行开发**：前后端团队并行开发，提高效率

### 测试阶段
- **边界测试**：模拟各种异常状态和边界数据
- **压力测试**：模拟高延迟、超时等网络状况
- **错误场景**：测试错误处理逻辑和用户体验

### 演示阶段
- **客户演示**：构建稳定的演示环境
- **功能展示**：展示不同的业务场景和数据状态
- **原型验证**：快速搭建原型进行需求验证

## 🏗️ 项目架构

```
whistle.mock-plugin/
├── lib/                          # 核心业务逻辑
│   ├── models.js                 # 数据模型定义
│   ├── ruleManager.js           # 规则匹配引擎
│   └── routes/                  # API路由
│       ├── features.js          # 功能模块管理
│       └── interfaces.js        # 接口管理
├── ui/                          # 前端界面
│   ├── src/
│   │   ├── components/          # 通用组件
│   │   ├── pages/              # 页面组件
│   │   │   ├── Home.js         # 首页
│   │   │   ├── FeatureManagement.js  # 功能模块管理
│   │   │   └── InterfaceManagement.js # 接口管理
│   │   └── utils/              # 工具函数
│   └── public/                 # 静态资源
├── app/                        # Whistle插件入口
│   └── index.js               # 插件主文件
├── test/                      # 测试文件
├── package.json              # 项目依赖
└── README.md                # 项目文档
```

## 🔧 安装和使用

### 1. 安装插件
```bash
# 通过npm安装
npm install whistle.mock-plugin -g

# 或通过yarn安装
yarn global add whistle.mock-plugin
```

### 2. 启动Whistle
```bash
# 启动whistle
w2 start

# 打开whistle管理界面
# 访问 http://localhost:8899
```

### 3. 配置插件
1. 在Whistle管理界面中进入"Plugins"页面
2. 找到"mock-plugin"并启用
3. 点击插件名称进入管理界面

### 4. 基本使用
1. **创建功能模块**：点击"添加功能模块"创建一个新的模块
2. **添加接口**：在功能模块中添加需要Mock的接口
3. **配置响应**：为接口添加多个响应内容
4. **启用代理**：启用功能模块和接口，开始拦截请求

## 📝 配置示例

### 基本接口配置
```json
{
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
      "id": "error",
      "name": "错误响应", 
      "description": "用户不存在的情况",
      "content": {
        "code": 404,
        "message": "用户不存在"
      }
    }
  ]
}
```

### 通配符匹配配置
```json
{
  "name": "文件下载接口",
  "urlPattern": "/api/files/*",
  "method": "GET",
  "proxyType": "redirect",
  "targetUrl": "https://cdn.example.com/files/",
  "preserveParams": true
}
```


## 🤝 贡献指南

欢迎提交Issue和Pull Request来帮助改进这个项目！

### 开发环境搭建
```bash
# 克隆项目
git clone [repository-url]

# 安装依赖
cd whistle.mock-plugin
npm install

# 启动开发服务
npm run dev

# 构建项目
npm run build
```

### 开发规范
- 使用ESLint进行代码检查
- 遵循React和Node.js最佳实践
- 提交前请运行测试用例
- 提交信息请使用中文并保持简洁明了

## 📄 许可证

MIT License

## 🔗 相关链接

- [Whistle官方文档](https://wproxy.org/whistle/)
- [Mock.js文档](http://mockjs.com/)
- [Ant Design](https://ant.design/) 