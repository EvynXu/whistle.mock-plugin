# whistle.mock-plugin API 文档

本文档描述了 whistle.mock-plugin 插件的 API 接口和数据模型。

## 数据模型

### 功能模块 (Feature)

功能模块是接口的分组，用于组织和管理相关的接口。

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | string | 功能模块唯一标识符 |
| name | string | 功能模块名称 |
| description | string | 功能模块描述 |
| interfaceCount | number | 该功能模块下的接口数量 |
| active | boolean | 功能模块是否启用 |
| createdAt | string | 创建时间，ISO 字符串格式 |
| updatedAt | string | 最后更新时间，ISO 字符串格式 |

### 接口 (Interface)

接口定义了匹配规则和响应内容，用于模拟 API 响应。

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | string | 接口唯一标识符 |
| featureId | string | 所属功能模块 ID |
| name | string | 接口名称 |
| urlPattern | string | URL 匹配规则，支持精确匹配、通配符和正则表达式 |
| proxyType | string | 代理类型，可选值: 'response'(数据模板), 'redirect'(URL重定向), 'file'(文件代理) |
| responseContent | string | 响应内容，使用 Mock.js 语法 |
| targetUrl | string | 重定向目标 URL，仅在 proxyType='redirect' 时有效 |
| filePath | string | 文件路径，仅在 proxyType='file' 时有效 |
| httpStatus | number | HTTP 状态码 |
| responseDelay | number | 响应延迟，单位毫秒 |
| httpMethod | string | HTTP 方法，可选值: 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'ALL' |
| active | boolean | 接口是否启用 |
| contentType | string | 响应内容类型 |
| headers | object | 自定义响应头 |
| createdAt | string | 创建时间，ISO 字符串格式 |
| updatedAt | string | 最后更新时间，ISO 字符串格式 |

### API 响应 (ApiResponse)

所有 API 接口的标准响应格式。

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| code | number | 状态码，0 表示成功，其他值表示错误 |
| message | string | 状态消息 |
| data | any | 响应数据，具体结构根据接口而定 |

## API 接口

### 功能模块

#### 获取所有功能模块

```
GET /cgi-bin/features
```

请求参数：无

响应示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": [
    {
      "id": "1",
      "name": "用户管理",
      "description": "用户相关接口",
      "interfaceCount": 3,
      "active": true,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 获取指定功能模块的接口列表

```
GET /cgi-bin/interfaces?featureId={featureId}
```

请求参数：

| 参数 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| featureId | string | 是 | 功能模块 ID |

响应示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": [
    {
      "id": "1",
      "featureId": "1",
      "name": "获取用户信息",
      "urlPattern": "/api/users/*",
      "proxyType": "response",
      "responseContent": "{\"code\":0,\"data\":{\"id\":1,\"name\":\"test\"}}",
      "httpStatus": 200,
      "contentType": "application/json; charset=utf-8",
      "active": true
    }
  ]
}
```

### 接口

#### 创建接口

```
POST /cgi-bin/interfaces
```

请求参数：

| 参数 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| name | string | 是 | 接口名称 |
| featureId | string | 是 | 功能模块 ID |
| urlPattern | string | 是 | URL 匹配规则 |
| proxyType | string | 否 | 代理类型，默认 'response' |
| responseContent | string | 否 | 响应内容 |
| httpStatus | number | 否 | HTTP 状态码，默认 200 |
| contentType | string | 否 | 响应内容类型 |
| active | boolean | 否 | 是否启用，默认 true |

响应示例：

```json
{
  "code": 0,
  "message": "接口创建成功",
  "data": {
    "id": "1",
    "featureId": "1",
    "name": "获取用户信息",
    "urlPattern": "/api/users/*",
    "proxyType": "response",
    "responseContent": "{\"code\":0,\"data\":{\"id\":1,\"name\":\"test\"}}",
    "httpStatus": 200,
    "contentType": "application/json; charset=utf-8",
    "active": true
  }
}
```

#### 更新接口

```
PUT /cgi-bin/interfaces?id={id}
```

请求参数：

| 参数 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| id | string | 是 | 接口 ID (URL参数) |
| name | string | 否 | 接口名称 |
| urlPattern | string | 否 | URL 匹配规则 |
| proxyType | string | 否 | 代理类型 |
| responseContent | string | 否 | 响应内容 |
| httpStatus | number | 否 | HTTP 状态码 |
| contentType | string | 否 | 响应内容类型 |
| active | boolean | 否 | 是否启用 |

响应示例：

```json
{
  "code": 0,
  "message": "接口更新成功",
  "data": {
    "id": "1",
    "featureId": "1",
    "name": "获取用户信息",
    "urlPattern": "/api/users/*",
    "proxyType": "response",
    "responseContent": "{\"code\":0,\"data\":{\"id\":1,\"name\":\"updated\"}}",
    "httpStatus": 200,
    "contentType": "application/json; charset=utf-8",
    "active": true
  }
}
```

#### 删除接口

```
DELETE /cgi-bin/interfaces?id={id}
```

请求参数：

| 参数 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| id | string | 是 | 接口 ID (URL参数) |

响应示例：

```json
{
  "code": 0,
  "message": "接口删除成功",
  "data": null
}
```

#### 测试接口

```
POST /cgi-bin/test-interface
```

请求参数：

| 参数 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| url | string | 是 | 测试 URL |
| interfaceId | string | 是 | 接口 ID |

响应示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "statusCode": 200,
    "contentType": "application/json; charset=utf-8",
    "responseBody": "{\"code\":0,\"data\":{\"id\":1,\"name\":\"test\"}}"
  }
}
``` 