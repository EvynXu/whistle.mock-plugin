# URL重定向功能设计文档

## 1. 功能概述

URL重定向功能是Whistle.mock-plugin的核心功能之一，允许用户将特定URL的请求重定向到另一个目标URL。该功能对于以下场景尤其有用：

- 将线上API请求重定向到本地开发服务器
- 将测试环境API请求重定向到生产环境
- 在不同服务之间进行灵活切换
- 模拟跨域请求场景
- 实现A/B测试环境切换

## 2. 功能需求

### 2.1 基础功能

- **创建重定向规则**：用户可以创建新的URL重定向规则，指定源URL和目标URL
- **编辑重定向规则**：用户可以编辑现有的重定向规则
- **删除重定向规则**：用户可以删除不再需要的重定向规则
- **启用/禁用规则**：用户可以灵活地启用或禁用特定的重定向规则
- **规则描述**：允许用户为规则添加描述文本，便于管理

### 2.2 高级功能

- **URL匹配模式**：支持多种URL匹配模式
  - 精确匹配：完全匹配源URL
  - 前缀匹配：匹配以特定前缀开头的URL
  - 正则表达式匹配：使用正则表达式匹配URL
  - 通配符匹配：支持`*`和`?`等通配符
  
- **参数处理**：
  - **参数保留**：默认将源URL的查询参数传递到目标URL
  - **参数修改**：允许添加、删除或修改特定参数
  - **路径参数提取**：从URL路径中提取变量并在目标URL中使用

- **请求头处理**：
  - 保留原始请求头
  - 添加自定义请求头
  - 修改特定请求头

- **重定向类型**：
  - 服务器端重定向（默认）
  - 客户端重定向（返回30x状态码）

- **条件重定向**：
  - 基于请求方法（GET, POST等）的条件重定向
  - 基于请求头内容的条件重定向
  - 基于请求体内容的条件重定向

- **批量操作**：
  - 批量导入/导出重定向规则
  - 批量启用/禁用规则

### 2.3 监控与调试

- **重定向日志**：记录所有重定向操作
- **失败通知**：重定向失败时提供通知
- **重定向测试**：提供工具测试重定向规则是否正常工作
- **流量统计**：显示每条规则的命中次数和最近使用时间

## 3. 用户界面设计

### 3.1 主界面

- 重定向规则列表，包含以下列：
  - 状态指示器（启用/禁用）
  - 源URL
  - 目标URL
  - 匹配方式
  - 描述
  - 最近使用时间
  - 命中次数
  - 操作按钮（编辑、删除、测试）

- 顶部功能区：
  - 添加新规则按钮
  - 批量操作按钮（导入、导出）
  - 搜索/过滤输入框

### 3.2 创建/编辑规则表单

- **基础信息部分**：
  - 源URL输入框（必填）
  - 目标URL输入框（必填）
  - 描述输入框（可选）
  - 是否启用开关

- **高级选项（可折叠）**：
  - URL匹配模式选择
  - 参数处理选项
  - 请求头处理选项
  - 重定向类型选择
  - 条件设置

### 3.3 规则测试工具

- 测试URL输入框
- 测试请求方法选择
- 测试请求头和参数设置
- 测试结果显示区域

## 4. 技术实现

### 4.1 数据结构

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

### 4.2 后端API

- `GET /cgi-bin/redirects` - 获取所有重定向规则
- `POST /cgi-bin/redirects` - 创建新的重定向规则
- `PUT /cgi-bin/redirects/:id` - 更新现有重定向规则
- `DELETE /cgi-bin/redirects/:id` - 删除重定向规则
- `PATCH /cgi-bin/redirects/:id/toggle` - 切换规则启用状态
- `POST /cgi-bin/redirects/test` - 测试重定向规则
- `GET /cgi-bin/redirects/stats` - 获取规则使用统计
- `POST /cgi-bin/redirects/import` - 批量导入规则
- `GET /cgi-bin/redirects/export` - 导出所有规则

### 4.3 Whistle规则生成

根据用户配置的重定向规则，插件将生成相应的Whistle规则，例如：

```
# ID: rule123 - API重定向到本地开发服务器
https://api.example.com/users whistle.mock-plugin://redirect?target=http://localhost:3000/mock/users
```

### 4.4 实现步骤

1. **数据存储实现**：
   - 在插件数据目录创建redirects.json文件
   - 实现CRUD操作的数据访问层

2. **后端服务实现**：
   - 创建路由处理器处理API请求
   - 实现重定向逻辑
   - 实现规则转换为Whistle规则的功能

3. **前端界面实现**：
   - 重构现有UI组件，支持新的功能
   - 实现高级选项表单
   - 添加测试工具界面

## 5. 迭代计划

### 第一阶段：基础功能实现

- 基本的重定向规则创建、编辑、删除功能
- 简单的启用/禁用功能
- 基础UI实现

### 第二阶段：高级匹配功能

- 实现多种URL匹配模式
- 添加参数处理功能
- 增强UI，支持新功能

### 第三阶段：条件重定向与监控

- 实现条件重定向功能
- 添加规则测试工具
- 实现使用统计和监控功能

### 第四阶段：批量操作与优化

- 实现规则导入/导出功能
- 优化性能和用户体验
- 添加高级调试工具

## 6. 使用示例

### 基本重定向

1. 创建重定向规则：
   - 源URL: `https://api.example.com/users`
   - 目标URL: `http://localhost:3000/mock/users`
   - 描述: "用户API重定向到本地开发服务器"

2. 启用规则

3. 所有对`https://api.example.com/users`的请求将被重定向到`http://localhost:3000/mock/users`

### 使用路径参数的高级重定向

1. 创建重定向规则：
   - 源URL: `https://api.example.com/users/:id`
   - 目标URL: `http://localhost:3000/mock/users/:id`
   - 匹配模式: 路径参数
   - 描述: "带ID的用户API重定向到本地"

2. 请求`https://api.example.com/users/123`将被重定向到`http://localhost:3000/mock/users/123`

## 7. 注意事项与限制

- 规则优先级：多条规则匹配同一URL时，精确匹配优先于前缀匹配优先于正则匹配
- 性能考虑：大量规则可能影响性能，建议保持规则简洁
- 循环重定向：系统将检测并阻止循环重定向
- 跨域限制：某些重定向可能受到浏览器跨域策略的限制 