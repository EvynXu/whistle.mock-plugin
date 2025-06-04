import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// 清理JSON响应
export const cleanJsonResponse = (jsonStr) => {
  try {
    const parsed = JSON.parse(jsonStr);
    return JSON.stringify(parsed);
  } catch (e) {
    return jsonStr;
  }
};

// 验证URL是否合法
export const isValidUrl = (url) => {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

// 缓存刷新服务
export const flushCache = async () => {
  try {
    const response = await axios.get('/_flush_cache');
    return response.data;
  } catch (error) {
    console.error('刷新缓存失败:', error);
    throw error;
  }
};

// 更新成功后刷新缓存
export const refreshCacheAfterUpdate = async () => {
  try {
    await flushCache();
    // 这里不需要显示提示，因为主要操作会有自己的提示
  } catch (error) {
    // 如果刷新缓存失败，记录错误但不影响用户体验
    console.error('刷新缓存失败，可能需要等待缓存自动过期:', error);
  }
};

// 检查 URL 是否匹配模式
export const isUrlMatchPattern = (url, pattern, proxyType) => {
  if (!url || !pattern) return false;
  
  try {
    // 对于url_redirect类型，需要完全匹配
    if (proxyType === 'url_redirect') {
      return url === pattern;
    }
    
    // 对于redirect类型，只要url以pattern开头即可命中（前缀匹配）
    if (proxyType === 'redirect') {
      return url.indexOf(pattern) === 0;
    }
    
    // 以下是默认的匹配逻辑（用于response类型等）
    // 如果是正则表达式
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      const regex = new RegExp(pattern.slice(1, -1));
      return regex.test(url);
    }
    
    // 如果是通配符模式
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(url);
    }
    
    // 精确匹配
    return url === pattern;
  } catch (e) {
    console.error('URL匹配检查失败:', e);
    return false;
  }
};

// 格式化响应内容
export const formatResponseContent = (content, contentType) => {
  if (contentType && contentType.includes('json')) {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return content;
    }
  }
  return content;
};

// 生成唯一的响应ID
export const generateResponseId = () => {
  return uuidv4();
}; 