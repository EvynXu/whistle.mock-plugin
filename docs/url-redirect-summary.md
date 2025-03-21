# URL重定向功能总体规划

## 1. 功能简介

URL重定向功能是Whistle.mock-plugin插件的核心功能之一，它允许用户将特定URL的请求重定向到另一个目标URL。这对于前端开发、接口测试和调试非常有用，尤其在以下场景中：

- 将线上API请求重定向到本地开发服务器
- 在测试和生产环境之间灵活切换
- 模拟跨域请求场景
- 实现A/B测试环境切换
- API版本迁移测试

## 2. 功能亮点

- **灵活的URL匹配规则**：支持精确匹配、前缀匹配、正则表达式和通配符
- **强大的参数处理**：保留、修改或添加URL参数，支持路径参数提取
- **请求头处理**：自定义请求头的添加、修改或删除
- **条件性重定向**：基于请求方法、请求头或请求体内容进行条件性重定向
- **使用统计和监控**：追踪规则使用情况，帮助优化配置
- **批量操作**：导入/导出、批量启用/禁用，提高工作效率
- **测试工具**：内置测试工具，验证重定向规则是否按预期工作

## 3. 当前状态

URL重定向功能目前已完成UI界面设计，但后端实现尚在进行中。现有界面支持：

- 基本的重定向规则列表展示
- 创建、编辑和删除重定向规则的表单界面
- 规则启用/禁用切换

## 4. 实现计划

我们计划分四个阶段实现完整的URL重定向功能：

### 阶段一：基础功能（预计2周）
- 基本的重定向规则CRUD功能
- 规则启用/禁用切换
- 基础UI实现

### 阶段二：高级匹配功能（预计2周）
- 多种URL匹配模式
- 参数处理功能
- 增强的UI，支持新增功能

### 阶段三：条件重定向与监控（预计2周）
- 条件重定向功能
- 规则测试工具
- 使用统计和监控功能

### 阶段四：批量操作与优化（预计2周）
- 规则导入/导出功能
- 性能优化
- 用户体验改进

## 5. 技术实现

### 数据结构
```javascript
{
  "redirectRules": [
    {
      "id": "唯一标识符",
      "sourceUrl": "源URL",
      "targetUrl": "目标URL",
      "description": "规则描述",
      "active": true,
      "matchType": "exact|prefix|regex|wildcard",
      "pattern": "匹配模式（当matchType不是exact时使用）",
      "preserveParams": true,
      "customParams": [
        { "name": "参数名", "value": "参数值", "action": "add|remove|modify" }
      ],
      "headers": [
        { "name": "头名称", "value": "头值", "action": "add|remove|modify" }
      ],
      "redirectType": "server|client",
      "conditions": [
        {
          "type": "method|header|body",
          "name": "条件名（针对header和body）",
          "value": "条件值",
          "operator": "equals|contains|startsWith|endsWith|regex"
        }
      ],
      "stats": {
        "hitCount": 0,
        "lastUsed": null
      }
    }
  ]
}
```

### 接口设计
- `GET /cgi-bin/redirects` - 获取所有重定向规则
- `POST /cgi-bin/redirects` - 创建新的重定向规则
- `PUT /cgi-bin/redirects/:id` - 更新现有重定向规则
- `DELETE /cgi-bin/redirects/:id` - 删除重定向规则
- `PATCH /cgi-bin/redirects/:id/toggle` - 切换规则启用状态
- `POST /cgi-bin/redirects/test` - 测试重定向规则
- `GET /cgi-bin/redirects/stats` - 获取规则使用统计
- `POST /cgi-bin/redirects/import` - 批量导入规则
- `GET /cgi-bin/redirects/export` - 导出所有规则

### 前端实现
- 基于React和Ant Design开发界面
- 响应式设计，支持桌面、平板和移动设备
- 优化用户交互流程

### 后端实现
- 基于Express开发API
- 与Whistle插件API集成
- 高效的规则匹配算法
- 日志和监控功能

## 6. 用户界面概览

URL重定向功能将提供三个主要界面：

1. **规则列表页面**：展示所有重定向规则，支持搜索、筛选和分页
2. **创建/编辑规则表单**：配置重定向规则的详细信息，包括基本配置和高级选项
3. **规则测试工具**：验证重定向规则是否按预期工作

详细的UI设计参见[URL重定向功能UI原型设计](url-redirect-ui-prototype.md)文档。

## 7. 使用场景示例

### 场景一：本地开发
将生产环境API请求重定向到本地开发服务器：
```
源URL: https://api.example.com/users
目标URL: http://localhost:3000/mock/users
```

### 场景二：API版本切换
测试新版API时，将旧版API请求重定向到新版API：
```
源URL: https://api.example.com/v1/products
目标URL: https://api.example.com/v2/products
```

### 场景三：环境切换
在不修改前端代码的情况下，将请求从生产环境切换到测试环境：
```
源URL: https://api.production.com/*
目标URL: https://api.testing.com/*
匹配方式: 通配符
```

### 场景四：带参数的重定向
保留原始URL参数，同时添加认证参数：
```
源URL: https://api.example.com/data
目标URL: http://localhost:8080/mock/data
自定义参数: token=dev123 (添加)
```

## 8. 相关文档

- [URL重定向功能设计文档](url-redirect-design.md)
- [URL重定向功能实现计划](url-redirect-implementation-plan.md)
- [URL重定向功能UI原型设计](url-redirect-ui-prototype.md)

## 9. 结语

URL重定向功能是Whistle.mock-plugin的重要组成部分，它将大大提高开发和测试效率。通过分阶段实现，我们将确保功能的稳定性和用户体验。我们欢迎用户反馈，不断改进和优化这一功能。 