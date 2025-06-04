# rules-server.js 分析文档

## 概述
`rules-server.js` 是 whistle.mock-plugin 的规则服务器模块，专门负责为Whistle代理服务器生成代理规则。它是连接Whistle和Mock插件的桥梁，决定哪些请求应该被拦截和如何处理。

## 主要职责

### 1. Whistle规则生成器
- **规则格式**: 生成符合Whistle语法的代理规则
- **动态规则**: 根据接口配置实时生成规则
- **规则优先级**: 确保正确的规则匹配顺序

### 2. 配置管理系统

#### 配置加载
- **功能模块加载**: 从 `features.json` 读取功能模块配置
- **接口配置加载**: 从 `interfaces.json` 读取接口配置
- **状态过滤**: 只加载启用状态的功能和接口

#### 缓存优化
- **智能缓存**: 基于文件修改时间的缓存机制
- **缓存失效**: 自动检测配置文件变化
- **性能提升**: 减少重复的文件读取操作

### 3. 接口匹配引擎

#### URL匹配策略
根据不同的代理类型采用不同的匹配策略：

**response类型 (模拟响应)**:
- 精确匹配: `pattern === url`
- 通配符匹配: 支持 `*` 通配符，如 `/api/users/*`
- 正则表达式: 支持 `/pattern/` 格式

**redirect类型 (重定向)**:
- 前缀匹配: `fullUrl.startsWith(pattern)`
- 灵活匹配: 只要URL以pattern开头即可

**url_redirect类型 (URL重定向)**:
- 完全匹配: `pattern === fullUrl`
- 精确控制: 必须完全匹配才能触发

#### HTTP方法匹配
- **全方法支持**: 'ALL', 'ANY' 匹配所有HTTP方法
- **特定方法**: 支持 GET, POST, PUT, DELETE 等
- **大小写不敏感**: 自动转换为大写进行比较

### 4. 代理类型处理

#### Response类型 (模拟响应)
```javascript
// 生成规则格式
`${fullUrl} mock-plugins://`
```
- **功能**: 将请求转发到mock-plugins插件处理
- **用途**: 返回Mock.js生成的动态数据
- **优势**: 支持复杂的参数匹配和多响应系统

#### Redirect类型 (重定向)
```javascript
// 规则生成逻辑
const redirectRule = buildRedirectRule(fullUrl, targetUrl, customHeaders, pattern, 0);
```
- **URL替换**: 将匹配的pattern部分替换为targetUrl
- **自定义请求头**: 支持添加自定义HTTP请求头
- **动态值**: 支持 `@xxx` 格式的随机值生成

#### URL Redirect类型 (URL重定向)
```javascript
// 完全匹配后重定向
const redirectRule = buildRedirectRule(fullUrl, targetUrl, customHeaders, pattern, 1);
```
- **精确重定向**: 完全匹配URL后重定向到目标
- **参数保留**: 可选择是否保留原始查询参数
- **完整替换**: 替换整个URL而非部分

### 5. 高级规则构建

#### 自定义请求头处理
```javascript
// 动态请求头规则
`${fullUrl} headerReplace://req.${key}:/(.*)/=${processedValue}`
```
- **头部注入**: 在请求转发时添加自定义请求头
- **动态值生成**: 支持随机字符串生成
- **格式处理**: 自动处理特殊字符和转义

#### 随机值生成
- **模式识别**: 识别 `@xxx` 格式的模式字符串
- **字符替换**: 将 `x` 替换为随机字符
- **字符集控制**: 使用安全的字符集避免特殊字符

### 6. 性能优化机制

#### 正则表达式缓存
```javascript
const regexCache = new Map();
// 缓存键格式: "wildcard:pattern" 或 "regex:pattern"
```
- **缓存策略**: 缓存编译后的正则表达式对象
- **键值管理**: 基于模式类型和内容生成缓存键
- **内存优化**: 避免重复编译相同的正则表达式

#### 文件监控缓存
- **修改时间检测**: 通过文件mtime检测配置变化
- **缓存时间控制**: 默认60秒缓存有效期
- **自动失效**: 文件修改后自动失效缓存

#### 查找优化
- **单次遍历**: 使用 `Array.find()` 只遍历一次接口列表
- **早期返回**: 找到匹配项后立即返回
- **条件短路**: 利用逻辑短路减少不必要的计算

### 7. 调试和监控系统

#### 日志级别控制
```javascript
const CONFIG = {
  LOG_LEVEL: process.env.MOCK_PLUGIN_LOG_LEVEL || 4,
  // 0=NONE, 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG
};
```
- **环境变量控制**: 通过环境变量动态调整日志级别
- **分级输出**: 错误、警告、信息、调试四个级别
- **性能考虑**: 高日志级别时减少不必要的日志输出

#### 调试端点
- **配置查看**: `/_debug/config` - 查看当前配置
- **接口列表**: `/_debug/enabled-interfaces` - 查看启用的接口
- **缓存状态**: `/_cache_status` - 查看缓存信息
- **手动刷新**: `/_flush_cache` - 手动清除缓存

### 8. 错误处理和容错

#### 配置文件错误
- **JSON解析错误**: 自动重置为默认配置
- **文件结构错误**: 验证和修复配置结构
- **权限错误**: 记录错误但继续服务

#### URL处理错误
- **解析失败**: 安全处理URL解析异常
- **匹配错误**: 正则表达式编译错误的容错
- **规则生成错误**: 验证规则有效性

#### 服务降级
- **配置加载失败**: 使用缓存的配置继续服务
- **部分功能故障**: 不影响其他功能的正常运行
- **透明错误**: 错误不会暴露给最终用户

### 9. 缓存管理器

#### 缓存控制接口
```javascript
const cacheManager = {
  clearCache: () => { /* 清除缓存 */ },
  getStatus: () => { /* 获取状态 */ }
};
```
- **主动清除**: 支持手动清除所有缓存
- **状态查询**: 提供详细的缓存状态信息
- **版本控制**: 缓存版本号用于调试和监控

#### 缓存策略
- **时间失效**: 基于时间的缓存失效机制
- **文件变化失效**: 配置文件变化时自动失效
- **手动控制**: 支持手动刷新缓存

### 10. 规则匹配优先级

#### 匹配流程
1. **URL模式检查**: 首先检查URL是否匹配
2. **HTTP方法验证**: 验证请求方法是否匹配
3. **规则有效性**: 验证重定向规则的有效性
4. **类型处理**: 根据proxyType生成相应规则

#### 优先级顺序
1. **response类型**: 最高优先级，返回mock-plugins规则
2. **redirect类型**: 中等优先级，生成重定向规则
3. **url_redirect类型**: 特殊处理，完全匹配重定向
4. **默认处理**: 未知类型默认使用mock-plugins

## 核心数据流

```
Whistle请求 → 
配置加载 → 
接口匹配 → 
规则生成 → 
返回给Whistle
```

## 配置文件依赖

### features.json 依赖
- **active字段**: 只处理 `active: true` 的功能模块
- **id字段**: 用于关联接口配置
- **数组格式**: 支持直接数组或 `{features: []}` 格式

### interfaces.json 依赖
- **featureId**: 关联到功能模块
- **active**: 接口本身的启用状态
- **urlPattern**: URL匹配模式
- **proxyType**: 代理类型决定处理方式
- **httpMethod**: HTTP方法过滤

## 环境变量配置

### 核心配置项
```javascript
const CONFIG = {
  LOG_LEVEL: process.env.MOCK_PLUGIN_LOG_LEVEL || 4,
  CACHE_INTERVAL: process.env.MOCK_PLUGIN_CACHE_INTERVAL || 60000,
  VERBOSE_CONSOLE: process.env.MOCK_PLUGIN_VERBOSE === 'true'
};
```
- **MOCK_PLUGIN_LOG_LEVEL**: 日志级别控制
- **MOCK_PLUGIN_CACHE_INTERVAL**: 缓存有效期（毫秒）
- **MOCK_PLUGIN_VERBOSE**: 详细控制台输出

## 规则生成示例

### 模拟响应规则
```
输入: GET /api/users
输出: https://example.com/api/users mock-plugins://
```

### 重定向规则  
```
输入: GET https://example.com/api/users
配置: pattern="/api", targetUrl="https://api.example.com"
输出: 
https://example.com/api/users https://api.example.com/users
https://example.com/api/users headerReplace://req.Authorization:/(.*)/=Bearer xxx
```

### URL重定向规则
```
输入: GET https://example.com/api/users
配置: pattern="https://example.com/api/users", targetUrl="https://api.example.com/users"
输出: https://example.com/api/users https://api.example.com/users
```

## 性能特征

### 时间复杂度
- **配置加载**: O(n) - n为接口数量
- **接口匹配**: O(n) - 最坏情况遍历所有接口  
- **正则匹配**: O(1) - 使用缓存的编译结果
- **规则生成**: O(1) - 简单字符串操作

### 空间复杂度
- **配置缓存**: O(n) - 存储启用的接口配置
- **正则缓存**: O(m) - m为不同正则模式数量
- **日志缓存**: O(k) - k为日志条数（最多5000条）

### 优化策略
- **延迟加载**: 只在需要时加载配置
- **缓存机制**: 减少重复的文件IO操作
- **早期返回**: 匹配成功后立即返回结果
- **内存管理**: 限制缓存大小防止内存泄露

## 集成模式

### Whistle插件接口
```javascript
module.exports = (server, options) => {
  server.on('request', (req, res) => {
    // 处理规则请求
  });
};
```
- **标准接口**: 符合Whistle插件规范
- **事件驱动**: 基于请求事件处理
- **异步处理**: 支持异步规则生成

### 与server.js的关系
- **职责分离**: rules-server专注规则生成，server.js处理实际请求
- **数据共享**: 共享配置文件和缓存机制
- **协同工作**: rules-server决定拦截，server.js处理响应 