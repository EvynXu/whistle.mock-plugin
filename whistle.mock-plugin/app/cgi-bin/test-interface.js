const fs = require('fs-extra');
const path = require('path');
const Mock = require('mockjs');
const url = require('url');

// 生成随机数工具函数（与rules-server.js中保持一致）
const generateRandomValue = (pattern) => {
  // 如果不是以@开头的模式，直接返回原值
  if (!pattern || !pattern.startsWith('@')) {
    return pattern;
  }
  
  const formatPattern = pattern.substring(1); // 去掉@前缀
  // 为每个x生成一个随机字符（字母或数字）
  return formatPattern.replace(/x/g, () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return chars.charAt(Math.floor(Math.random() * chars.length));
  });
};

module.exports = async function(req, res) {
  const dataDir = this.dataDir;
  const interfacesFile = path.join(dataDir, 'interfaces.json');
  const featuresFile = path.join(dataDir, 'features.json');
  
  try {
    // 只处理 POST 请求
    if (req.method === 'POST') {
      const { url, interfaceId } = req.body;
      
      // 参数验证
      if (!url) {
        return res.status(400).json({
          code: 400,
          message: '测试URL不能为空',
          data: null
        });
      }
      
      if (!interfaceId) {
        return res.status(400).json({
          code: 400,
          message: '接口ID不能为空',
          data: null
        });
      }
      
      // 读取接口数据
      let interfacesData;
      try {
        interfacesData = fs.readJsonSync(interfacesFile);
        if (!interfacesData || !interfacesData.interfaces) {
          return res.status(404).json({
            code: 404,
            message: '未找到接口数据',
            data: null
          });
        }
      } catch (err) {
        return res.status(500).json({
          code: 500,
          message: '读取接口数据失败',
          data: null
        });
      }
      
      // 查找指定接口
      const targetInterface = interfacesData.interfaces.find(item => item.id === interfaceId);
      
      if (!targetInterface) {
        return res.status(404).json({
          code: 404,
          message: '指定的接口不存在',
          data: null
        });
      }
      
      // 检查接口是否已禁用
      if (targetInterface.active === false) {
        return res.status(400).json({
          code: 400,
          message: '接口已禁用，无法测试',
          data: null
        });
      }
      
      // 检查功能模块是否已禁用
      try {
        const featuresData = fs.readJsonSync(featuresFile);
        
        if (featuresData && featuresData.features) {
          const featureItem = featuresData.features.find(item => item.id === targetInterface.featureId);
          
          if (featureItem && featureItem.active === false) {
            return res.status(400).json({
              code: 400,
              message: '所属功能模块已禁用，接口无法使用',
              data: null
            });
          }
        }
      } catch (err) {
        // 忽略读取错误，继续处理
      }
      
      const startTime = Date.now();
      
      // 根据代理类型处理不同的响应
      let responseData;
      
      // 检查 URL 是否匹配模式
      const isUrlMatchPattern = (url, pattern, proxyType) => {
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
          
          // 默认的匹配逻辑（用于response类型等）
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
      
      // 处理不同的代理类型
      switch (targetInterface.proxyType) {
        case 'response':
          // 处理内容，支持 Mock.js 模板语法
          let responseBody = targetInterface.responseContent;
          
          try {
            // 如果响应内容是JSON，则尝试应用Mock.js模板
            if (targetInterface.contentType && targetInterface.contentType.includes('json')) {
              // 尝试解析JSON
              const jsonTemplate = JSON.parse(responseBody);
              // 使用Mock.js生成随机数据
              const mockData = Mock.mock(jsonTemplate);
              // 将结果转换回字符串
              responseBody = JSON.stringify(mockData);
            }
          } catch (err) {
            // 如果Mock失败，使用原始内容
          }
          
          // 模拟接口处理延迟
          const delay = targetInterface.responseDelay || 0;
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          // 模拟接口处理
          responseData = {
            statusCode: targetInterface.httpStatus || 200,
            contentType: targetInterface.contentType || 'application/json; charset=utf-8',
            responseBody: responseBody,
            mockInfo: {
              matchedPattern: targetInterface.urlPattern,
              requestMethod: targetInterface.httpMethod,
              delay: delay,
              duration: duration,
              timestamp: new Date().toISOString()
            }
          };
          break;
          
        case 'redirect':
          // 处理重定向
          const redirectTarget = targetInterface.targetUrl || '';
          
          // 验证目标URL是否有效
          if (!redirectTarget) {
            return res.status(400).json({
              code: 400,
              message: '重定向目标URL不能为空',
              data: null
            });
          }
          
          try {
            // 验证URL格式
            new URL(redirectTarget);
          } catch (err) {
            return res.status(400).json({
              code: 400,
              message: '重定向目标URL格式无效，必须包含http://或https://',
              data: null
            });
          }
          
          // 验证URL匹配（前缀匹配）
          if (url.indexOf(targetInterface.urlPattern) !== 0) {
            return res.status(400).json({
              code: 400,
              message: `测试URL不匹配重定向规则，URL必须以 ${targetInterface.urlPattern} 开头`,
              data: null
            });
          }
          
          // 处理自定义请求头，包括随机值
          const redirectHeaders = targetInterface.customHeaders || {};
          const processedHeaders = {};
          
          // 处理随机值，转换为实际值
          Object.entries(redirectHeaders).forEach(([key, value]) => {
            processedHeaders[key] = generateRandomValue(value);
          });
          
          const formattedRedirectHeaders = Object.entries(processedHeaders)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          
          responseData = {
            statusCode: 302,
            contentType: 'application/json; charset=utf-8',
            proxyType: 'redirect',
            targetUrl: redirectTarget,
            customHeaders: processedHeaders,
            formattedHeaders: formattedRedirectHeaders,
            mockInfo: {
              matchedPattern: targetInterface.urlPattern,
              requestMethod: targetInterface.httpMethod,
              timestamp: new Date().toISOString()
            }
          };
          break;
          
        case 'url_redirect':
          // 处理URL重定向
          const baseUrl = targetInterface.targetUrl || '';
          
          // 验证基础URL是否有效
          if (!baseUrl) {
            return res.status(400).json({
              code: 400,
              message: 'URL重定向目标URL不能为空',
              data: null
            });
          }
          
          try {
            // 验证URL格式
            new URL(baseUrl);
          } catch (err) {
            return res.status(400).json({
              code: 400,
              message: 'URL重定向目标URL格式无效，必须包含http://或https://',
              data: null
            });
          }
          
          // 验证URL完全匹配
          if (url !== targetInterface.urlPattern) {
            return res.status(400).json({
              code: 400,
              message: `测试URL不匹配URL重定向规则，URL必须完全匹配 ${targetInterface.urlPattern}`,
              data: null
            });
          }
          
          // 处理自定义请求头
          const urlRedirectHeaders = targetInterface.customHeaders || {};
          const processedUrlRedirectHeaders = {};
          
          // 处理随机值，转换为实际值
          Object.entries(urlRedirectHeaders).forEach(([key, value]) => {
            processedUrlRedirectHeaders[key] = generateRandomValue(value);
          });
          
          const formattedUrlRedirectHeaders = Object.entries(processedUrlRedirectHeaders)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          
          responseData = {
            statusCode: 302,
            contentType: 'application/json; charset=utf-8',
            proxyType: 'url_redirect',
            targetUrl: baseUrl,
            customHeaders: processedUrlRedirectHeaders,
            formattedHeaders: formattedUrlRedirectHeaders,
            mockInfo: {
              matchedPattern: targetInterface.urlPattern,
              requestMethod: targetInterface.httpMethod,
              timestamp: new Date().toISOString()
            }
          };
          break;
          
        default:
          // 不支持的代理类型
          return res.status(400).json({
            code: 400,
            message: `不支持的代理类型: ${targetInterface.proxyType || 'undefined'}`,
            data: null
          });
      }
      
      return res.json({
        code: 0,
        message: '成功',
        data: responseData
      });
    } else {
      // 不支持的请求方法
      return res.status(405).json({
        code: 405,
        message: '不支持的请求方法',
        data: null
      });
    }
  } catch (err) {
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误: ' + err.message,
      data: null
    });
  }
}; 