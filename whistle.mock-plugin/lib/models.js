/**
 * @file 数据模型定义文件
 * @description 定义了 whistle.mock-plugin 使用的数据模型
 */

/**
 * 功能模块数据模型
 * @typedef {Object} Feature
 * @property {string} id - 功能模块唯一标识符
 * @property {string} name - 功能模块名称
 * @property {string} description - 功能模块描述
 * @property {number} interfaceCount - 该功能模块下的接口数量
 * @property {boolean} active - 功能模块是否启用
 * @property {string} createdAt - 创建时间，ISO 字符串格式
 * @property {string} updatedAt - 最后更新时间，ISO 字符串格式
 */

/**
 * 接口数据模型
 * @typedef {Object} Interface
 * @property {string} id - 接口唯一标识符
 * @property {string} featureId - 所属功能模块 ID
 * @property {string} name - 接口名称
 * @property {string} urlPattern - URL 匹配规则，支持精确匹配、通配符和正则表达式
 * @property {string} proxyType - 代理类型，可选值: 'response'(数据模板), 'redirect'(URL重定向), 'file'(文件代理)
 * @property {string} responseContent - 响应内容，使用 Mock.js 语法
 * @property {string} targetUrl - 重定向目标 URL，仅在 proxyType='redirect' 时有效
 * @property {string} filePath - 文件路径，仅在 proxyType='file' 时有效
 * @property {number} httpStatus - HTTP 状态码
 * @property {number} responseDelay - 响应延迟，单位毫秒
 * @property {string} httpMethod - HTTP 方法，可选值: 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'ALL'
 * @property {boolean} active - 接口是否启用
 * @property {string} contentType - 响应内容类型
 * @property {Object|null} headers - 自定义响应头
 * @property {string} createdAt - 创建时间，ISO 字符串格式
 * @property {string} updatedAt - 最后更新时间，ISO 字符串格式
 */

/**
 * 接口测试请求数据模型
 * @typedef {Object} InterfaceTestRequest
 * @property {string} url - 测试 URL
 * @property {string} interfaceId - 接口 ID
 */

/**
 * 接口测试响应数据模型
 * @typedef {Object} InterfaceTestResponse
 * @property {number} statusCode - HTTP 状态码
 * @property {string} contentType - 响应内容类型
 * @property {string} responseBody - 响应内容
 */

/**
 * API 响应数据模型
 * @typedef {Object} ApiResponse
 * @property {number} code - 状态码，0 表示成功，其他值表示错误
 * @property {string} message - 状态消息
 * @property {*} data - 响应数据
 */

module.exports = {
  // 这里没有实际导出，仅用于文档说明
}; 