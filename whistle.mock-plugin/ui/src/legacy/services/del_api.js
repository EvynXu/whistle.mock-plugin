/**
 * API 服务模块
 * 提供功能和接口相关的 API 调用
 */
const API_BASE_URL = '/api';

/**
 * 通用 API 请求方法
 * @param {string} url - 请求 URL
 * @param {object} options - 请求选项
 * @returns {Promise<any>} - 请求结果
 */
const request = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || '请求失败');
  }
  
  return data;
};

/**
 * 功能相关 API
 */
export const FeatureAPI = {
  /**
   * 获取所有功能
   * @returns {Promise<Array>} 功能列表
   */
  getAllFeatures: () => request(`${API_BASE_URL}/features`),
  
  /**
   * 获取单个功能
   * @param {string} id - 功能 ID
   * @returns {Promise<object>} 功能对象
   */
  getFeature: (id) => request(`${API_BASE_URL}/features/${id}`),
  
  /**
   * 创建功能
   * @param {object} feature - 功能对象
   * @returns {Promise<object>} 创建的功能对象
   */
  createFeature: (feature) => request(`${API_BASE_URL}/features`, {
    method: 'POST',
    body: JSON.stringify(feature)
  }),
  
  /**
   * 更新功能
   * @param {string} id - 功能 ID
   * @param {object} feature - 功能对象
   * @returns {Promise<object>} 更新的功能对象
   */
  updateFeature: (id, feature) => request(`${API_BASE_URL}/features/${id}`, {
    method: 'PUT',
    body: JSON.stringify(feature)
  }),
  
  /**
   * 删除功能
   * @param {string} id - 功能 ID
   * @returns {Promise<object>} 删除结果
   */
  deleteFeature: (id) => request(`${API_BASE_URL}/features/${id}`, {
    method: 'DELETE'
  }),
  
  /**
   * 获取功能下的所有接口
   * @param {string} id - 功能 ID
   * @returns {Promise<Array>} 接口列表
   */
  getFeatureInterfaces: (id) => request(`${API_BASE_URL}/features/${id}/interfaces`)
};

/**
 * 接口相关 API
 */
export const InterfaceAPI = {
  /**
   * 获取单个接口
   * @param {string} id - 接口 ID
   * @returns {Promise<object>} 接口对象
   */
  getInterface: (id) => request(`${API_BASE_URL}/interfaces/${id}`),
  
  /**
   * 创建接口
   * @param {object} interfaceObj - 接口对象
   * @returns {Promise<object>} 创建的接口对象
   */
  createInterface: (interfaceObj) => request(`${API_BASE_URL}/interfaces`, {
    method: 'POST',
    body: JSON.stringify(interfaceObj)
  }),
  
  /**
   * 更新接口
   * @param {string} id - 接口 ID
   * @param {object} interfaceObj - 接口对象
   * @returns {Promise<object>} 更新的接口对象
   */
  updateInterface: (id, interfaceObj) => request(`${API_BASE_URL}/interfaces/${id}`, {
    method: 'PUT',
    body: JSON.stringify(interfaceObj)
  }),
  
  /**
   * 删除接口
   * @param {string} id - 接口 ID
   * @returns {Promise<object>} 删除结果
   */
  deleteInterface: (id) => request(`${API_BASE_URL}/interfaces/${id}`, {
    method: 'DELETE'
  }),
  
  /**
   * 测试接口
   * @param {string} id - 接口 ID
   * @param {object} testData - 测试数据
   * @returns {Promise<object>} 测试结果
   */
  testInterface: (id, testData) => request(`${API_BASE_URL}/interfaces/${id}/test`, {
    method: 'POST',
    body: JSON.stringify(testData)
  })
};

/**
 * 代理相关 API
 */
export const ProxyAPI = {
  /**
   * 获取文件内容
   * @param {string} path - 文件路径
   * @returns {Promise<object>} 文件内容
   */
  getFile: (path) => request(`${API_BASE_URL}/proxy/file?path=${encodeURIComponent(path)}`),
  
  /**
   * 保存文件内容
   * @param {string} path - 文件路径
   * @param {string} content - 文件内容
   * @returns {Promise<object>} 保存结果
   */
  saveFile: (path, content) => request(`${API_BASE_URL}/proxy/file`, {
    method: 'POST',
    body: JSON.stringify({ path, content })
  }),
  
  /**
   * 列出文件
   * @param {string} path - 目录路径
   * @returns {Promise<Array>} 文件列表
   */
  listFiles: (path = '') => request(`${API_BASE_URL}/proxy/files?path=${encodeURIComponent(path)}`),
  
  /**
   * 删除文件
   * @param {string} path - 文件路径
   * @returns {Promise<object>} 删除结果
   */
  deleteFile: (path) => request(`${API_BASE_URL}/proxy/file?path=${encodeURIComponent(path)}`, {
    method: 'DELETE'
  }),
  
  /**
   * 测试 mock 数据模板
   * @param {string} template - 模板字符串
   * @returns {Promise<object>} 生成的数据
   */
  testMockTemplate: (template) => request(`${API_BASE_URL}/proxy/test`, {
    method: 'POST',
    body: JSON.stringify({ template })
  }),
  
  /**
   * 获取版本信息
   * @returns {Promise<object>} 版本信息文件内容
   */
  getVersionInfo: () => request('/cgi-bin/version')
}; 