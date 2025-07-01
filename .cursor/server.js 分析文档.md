# server.js 分析文档

## 概述
`server.js` 是 whistle.mock-plugin 的核心服务器模块，负责处理HTTP请求、生成模拟响应、管理数据存储和提供完整的Mock服务功能。

## 主要职责

### 1. Express应用服务器
- **基础框架**: 使用Express.js创建HTTP服务器
- **中间件配置**: 配置JSON解析、URL编码解析等中间件
- **请求路由**: 处理所有进入的HTTP请求

### 2. 数据存储管理
- **目录初始化**: 确保数据目录（DATA_DIR）、日志目录（LOG_DIR）存在
- **配置文件管理**: 
  - `features.json`: 功能模块配置
  - `interfaces.json`: 接口配置 
  - `logs.json`: 运行日志
- **文件结构验证**: 自动检测和修复损坏的配置文件

### 3. 日志系统
- **文本日志**: 写入 `plugin.log` 文件，包含时间戳
- **JSON日志**: 结构化日志存储在 `logs.json`，支持前端查询
- **日志轮转**: 自动限制日志条数（最多5000条）防止文件过大
- **控制台输出**: 同时输出到控制台便于调试

### 4. 请求处理引擎

#### 请求解析
- **原始URL解析**: 从多个来源获取真实请求URL
  - `req.originalReq.realUrl`
  - `req.originalReq.url` 
  - `x-whistle-real-url` 请求头
  - `x-forwarded-url` 请求头
  - `x-whistle-rule-value` 规则值
- **请求体解析**: 支持JSON、表单数据等格式
- **请求头处理**: 记录和处理所有HTTP请求头

#### 智能路由分发
- **规则管理器优先**: 优先使用新的 `ruleManager` 处理请求
- **向后兼容**: 保留旧的 `handleLegacyRequest` 处理方式
- **透传机制**: 未匹配的请求自动转发到原始目标

### 5. 参数匹配系统
- **嵌套属性访问**: 支持 `a.b.c` 格式的深层属性路径
- **多种匹配模式**: 
  - 精确匹配 (exact)
  - 包含匹配 (contains) 
  - 正则表达式匹配 (regex)
- **多参数源支持**: 
  - URL查询参数
  - POST请求体参数
  - 路径参数

### 6. Mock响应生成

#### 响应类型处理
- **模拟响应 (response)**: 使用Mock.js生成动态数据
- **重定向 (redirect)**: HTTP重定向到其他URL
- **URL重定向 (url_redirect)**: 完整URL替换
- **文件代理 (file)**: 返回本地文件内容

#### Mock.js集成
- **模板解析**: 解析JSON模板并生成随机数据
- **数据类型支持**: 字符串、数字、数组、对象等
- **动态内容**: 支持时间戳、随机值等动态生成

### 7. 接口匹配逻辑

#### URL模式匹配
- **精确匹配**: 完全相等的URL路径
- **通配符匹配**: 支持 `*` 通配符
- **正则表达式**: 支持 `/pattern/` 格式的正则匹配

#### 智能优先级
1. **URL + 参数匹配**: 优先级最高
2. **仅URL匹配**: 中等优先级  
3. **默认回退**: 无参数匹配规则的接口作为回退

### 8. 错误处理和容错

#### 请求处理错误
- **URL解析失败**: 安全处理URL解析错误
- **JSON解析错误**: 自动降级为文本处理
- **网络错误**: 返回502错误状态

#### 配置文件错误
- **文件损坏**: 自动重建配置文件
- **格式错误**: 重置为默认结构
- **权限错误**: 记录错误但不影响服务

### 9. 性能优化

#### 缓存机制
- **规则缓存**: 与ruleManager共享缓存机制
- **配置缓存**: 减少频繁的文件读取
- **内存管理**: 限制日志和缓存大小

#### 请求优化
- **异步处理**: 非阻塞的请求处理
- **流式传输**: 支持大文件的流式处理
- **超时控制**: 30秒请求超时设置

### 10. 调试和监控

#### 调试接口
- **配置查看**: `/_debug/config` 查看当前配置
- **缓存状态**: `/_cache_status` 查看缓存信息
- **接口列表**: `/_debug/enabled-interfaces` 查看启用接口

#### 详细日志
- **请求追踪**: 记录每个请求的完整处理过程
- **匹配过程**: 详细的接口匹配日志
- **错误诊断**: 完整的错误堆栈和上下文

## 核心数据流

```
HTTP请求 → 
URL解析 → 
接口匹配 → 
参数验证 → 
响应生成 → 
数据返回
```

## 配置文件结构

### features.json
```json
{
  "features": [
    {
      "id": "feature-id",
      "name": "功能名称", 
      "description": "功能描述",
      "active": true
    }
  ]
}
```

### interfaces.json  
```json
{
  "interfaces": [
    {
      "id": "interface-id",
      "name": "接口名称",
      "featureId": "feature-id", 
      "urlPattern": "/api/users",
      "proxyType": "response",
      "responses": [...],
      "paramMatchers": [...],
      "active": true
    }
  ]
}
```

### logs.json
```json
{
  "logs": [
    {
      "id": "log-id",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "eventType": "mock_hit",
      "url": "/api/users",
      "method": "GET", 
      "message": "接口匹配成功"
    }
  ]
}
```

## 启动和初始化

### 服务器启动流程
1. **目录创建**: 确保数据和日志目录存在
2. **配置初始化**: 检查和修复配置文件
3. **规则管理器**: 初始化ruleManager和dataManager
4. **Express启动**: 绑定请求处理器
5. **缓存预热**: 加载初始配置到缓存

### 依赖注入
- **Whistle集成**: 接收Whistle传入的server和options
- **插件信息**: 记录插件版本和类型信息
- **存储配置**: 配置数据存储路径

## 特殊功能

### 自定义请求头处理
- **动态值生成**: 支持 `@xxx` 格式的随机值
- **头部注入**: 在重定向时添加自定义请求头
- **值替换**: 支持复杂的请求头值替换逻辑

### 多响应系统
- **响应管理**: 每个接口支持多个响应配置
- **动态切换**: 通过activeResponseId控制活跃响应
- **向后兼容**: 兼容旧的单响应格式

### 实时配置更新
- **文件监控**: 监控配置文件变化
- **缓存刷新**: 支持手动和自动缓存刷新
- **热重载**: 配置更改后无需重启服务

## 安全考虑

### 输入验证
- **URL验证**: 防止恶意URL注入
- **参数校验**: 验证请求参数格式
- **文件路径**: 防止目录遍历攻击

### 资源限制
- **内存限制**: 限制日志和缓存大小
- **文件大小**: 限制响应内容大小（100MB）
- **请求超时**: 防止长时间挂起的请求

## 错误码和状态

### HTTP状态码
- **200**: 成功响应
- **302**: 重定向响应
- **400**: 客户端错误
- **404**: 接口未找到
- **500**: 服务器内部错误
- **502**: 代理错误

### 自定义错误类型
- **ConfigError**: 配置文件错误
- **MatchError**: 接口匹配错误  
- **ProxyError**: 代理转发错误
- **ValidationError**: 参数验证错误 

## Whistle Mock插件标识响应头

### 功能概述
为了更好地识别和调试通过whistle.mock-plugin处理的请求，插件会在所有命中的代理请求响应中添加标识响应头。

### 环境变量控制
- **WHISTLE_MOCK_HEADERS**: 控制是否启用标识响应头（默认启用）
  - `true` 或未设置: 启用标识响应头
  - `false`: 禁用标识响应头

### 通用标识响应头

#### X-Whistle-Mock
- **值**: `true`
- **说明**: 标识该响应是通过whistle.mock-plugin处理的

#### X-Whistle-Mock-Mode
- **值**: `mock|redirect|file|dynamic|proxy`
- **说明**: 标识代理模式类型
  - `mock`: 数据模板响应 (response, data_template)
  - `redirect`: URL重定向 (redirect, url_redirect)
  - `file`: 文件代理 (file, file_proxy)
  - `dynamic`: 动态数据生成 (dynamic_data)
  - `proxy`: 其他代理类型

#### X-Whistle-Mock-Rule
- **值**: 接口名称
- **说明**: 命中的规则/接口名称

#### X-Whistle-Mock-Interface
- **值**: 接口ID
- **说明**: 接口的唯一标识符

#### X-Whistle-Mock-Feature
- **值**: 功能模块名称
- **说明**: 接口所属的功能模块名称（如果有）

#### X-Whistle-Mock-Response
- **值**: 响应名称
- **说明**: 对于有多个响应的接口，显示当前使用的响应名称

### 特定类型标识响应头

#### 数据模板响应 (Mock Data)
- **X-Whistle-Mock-Data-Type**: `template`
- **X-Whistle-Mock-Template**: 模板名称（多响应时）

#### 文件代理响应 (File Proxy)
- **X-Whistle-Mock-Data-Type**: `file`
- **X-Whistle-Mock-File**: 文件名
- **X-Whistle-Mock-File-Path**: 相对文件路径

#### 重定向响应 (Redirect)
- **X-Whistle-Mock-Data-Type**: `redirect`
- **X-Whistle-Mock-Target-Url**: 重定向目标URL

#### 动态数据响应 (Dynamic Data)
- **X-Whistle-Mock-Data-Type**: `dynamic`
- **X-Whistle-Mock-Script-Engine**: `function`

### 使用场景

#### 开发调试
- 在浏览器开发者工具中查看响应头，快速识别mock响应
- 通过响应头过滤和分析特定类型的请求
- 验证接口匹配和代理类型是否正确

#### 自动化测试
- 在测试中验证请求是否正确命中mock规则
- 基于响应头进行测试断言
- 监控和统计mock请求的使用情况

#### 生产环境监控
- 可通过环境变量禁用标识响应头
- 避免在生产环境中泄露内部信息
- 支持分环境的不同配置策略

### 示例响应头
```
X-Whistle-Mock: true
X-Whistle-Mock-Mode: mock
X-Whistle-Mock-Rule: 用户列表接口
X-Whistle-Mock-Interface: user-list-001
X-Whistle-Mock-Feature: 用户管理
X-Whistle-Mock-Response: 成功响应
X-Whistle-Mock-Data-Type: template
X-Whistle-Mock-Template: 成功响应
``` 