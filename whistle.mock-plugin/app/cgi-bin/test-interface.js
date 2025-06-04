const fs = require('fs-extra');
const path = require('path');
const Mock = require('mockjs');
const url = require('url');

// 缓存控制
const CONFIG = {
  // 缓存有效期（毫秒），默认 60 秒
  CACHE_INTERVAL: process.env.MOCK_PLUGIN_CACHE_INTERVAL || 60000
};

// 缓存控制变量
let enabledInterfacesCache = null; // 仅缓存启用状态的接口
let cacheTime = 0;

// 获取文件修改时间
const getFileModTime = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtimeMs;
  } catch (err) {
    return 0;
  }
};

// 生成随机数工具函数（与rules-server.js中保持一致）
const generateRandomValue = (pattern) => {
  // 如果不是以@开头的模式，直接返回原值
  if (!pattern || !pattern.startsWith('@')) {
    return pattern;
  }
  
  const formatPattern = pattern.substring(1); // 去掉@前缀
  // 使用单次正则替换优化性能
  return formatPattern.replace(/x/g, () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return chars.charAt(Math.floor(Math.random() * chars.length));
  });
};

// 正则表达式缓存
const regexCache = new Map();

// URL匹配函数，提取为纯函数减少重复代码
const isUrlMatchPattern = (url, pattern, proxyType) => {
  if (!url || !pattern) return false;
  console.log(`isUrlMatchPattern ${url} - ${pattern}`);
  try {
    // 对于url_redirect类型，需要完全匹配
    if (proxyType === 'url_redirect') {
      return url === pattern;
    }
    
    // 对于redirect类型，只要url以pattern开头即可命中（前缀匹配）
    if (proxyType === 'redirect') {
      return url.startsWith(pattern);
    }
    
    // 默认的匹配逻辑（用于response类型等）
    // 精确匹配
    if (pattern === url) {
      return true;
    }
    
    // 正则表达式
    if (pattern.startsWith('/') && pattern.length > 2 && pattern.endsWith('/')) {
      // 使用缓存的正则表达式
      const cacheKey = `regex:${pattern}`;
      let regex = regexCache.get(cacheKey);
      
      if (!regex) {
        regex = new RegExp(pattern.slice(1, -1));
        regexCache.set(cacheKey, regex);
      }
      
      return regex.test(url);
    }
    
    // 通配符模式
    if (pattern.includes('*')) {
      // 使用缓存的正则表达式
      const cacheKey = `wildcard:${pattern}`;
      let regex = regexCache.get(cacheKey);
      
      if (!regex) {
        const regexPattern = pattern
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*');
        regex = new RegExp(`^${regexPattern}$`);
        regexCache.set(cacheKey, regex);
      }
      
      return regex.test(url);
    }
    
    return false;
  } catch (e) {
    console.error('URL匹配检查失败:', e);
    return false;
  }
};

// 加载启用的接口数据，带缓存
const loadEnabledInterfaces = (dataDir, interfacesFile, featuresFile) => {
  try {
    const currentTime = Date.now();
    const interfacesFileModTime = getFileModTime(interfacesFile);
    const featuresFileModTime = getFileModTime(featuresFile);
    
    // 取两个文件的最后修改时间的最大值
    const lastModTime = Math.max(interfacesFileModTime, featuresFileModTime);
    
    // 使用缓存
    if (enabledInterfacesCache && 
        currentTime - cacheTime < CONFIG.CACHE_INTERVAL &&
        lastModTime <= cacheTime) {
      return enabledInterfacesCache;
    }
    
    // 1. 读取并解析所有功能模块
    let enabledFeatureIds = [];
    if (fs.existsSync(featuresFile)) {
      try {
        const featuresData = fs.readJsonSync(featuresFile);
        let features = [];
        
        if (featuresData && Array.isArray(featuresData)) {
          features = featuresData;
        } else if (featuresData && featuresData.features && Array.isArray(featuresData.features)) {
          features = featuresData.features;
        }
        
        // 过滤出启用状态的功能ID
        enabledFeatureIds = features
          .filter(feature => feature.active === true)
          .map(feature => feature.id);
      } catch (err) {
        console.error('读取功能模块失败:', err);
      }
    }
    
    // 2. 读取并解析所有接口
    let enabledInterfaces = [];
    if (fs.existsSync(interfacesFile)) {
      try {
        const interfacesData = fs.readJsonSync(interfacesFile);
        let interfaces = [];
        
        if (interfacesData && Array.isArray(interfacesData)) {
          interfaces = interfacesData;
        } else if (interfacesData && interfacesData.interfaces && Array.isArray(interfacesData.interfaces)) {
          interfaces = interfacesData.interfaces;
        }
        
        // 过滤出启用状态的接口
        enabledInterfaces = interfaces.filter(intf => {
          // 首先检查接口本身是否启用
          const isInterfaceEnabled = intf.active !== false; // 默认为true
          
          if (!isInterfaceEnabled) {
            return false;
          }
          
          // 如果接口有关联功能，检查功能是否启用
          if (intf.featureId) {
            return enabledFeatureIds.includes(intf.featureId);
          }
          
          // 如果接口没有关联功能，只要接口本身启用就可以
          return true;
        });
      } catch (err) {
        console.error('读取接口配置失败:', err);
      }
    }
    
    // 更新缓存
    enabledInterfacesCache = enabledInterfaces;
    cacheTime = currentTime;
    
    return enabledInterfaces;
  } catch (err) {
    console.error('加载启用接口失败:', err);
    return enabledInterfacesCache || [];
  }
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
      
      // 读取接口数据（使用缓存）
      const interfaces = loadEnabledInterfaces(dataDir, interfacesFile, featuresFile);
      
      if (!interfaces || interfaces.length === 0) {
        return res.status(404).json({
          code: 404,
          message: '未找到接口数据',
          data: null
        });
      }
      
      // 查找指定接口
      const targetInterface = interfaces.find(item => item.id === interfaceId);
      
      if (!targetInterface) {
        return res.status(404).json({
          code: 404,
          message: '指定的接口不存在',
          data: null
        });
      }
      
      // 检查接口URL是否与测试URL匹配
      const pattern = targetInterface.pattern;
      const proxyType = targetInterface.proxyType || 'response';
      
      // 使用URL匹配检查
      const isMatch = isUrlMatchPattern(url, pattern, proxyType);
      
      // 测试接口只验证URL模式匹配，不验证HTTP方法
      // 因为这里的req.method是测试请求的POST方法，与接口配置的HTTP方法无关
      const matchResult = isMatch;
      
      // 构建测试结果
      const result = {
        interfaceId: targetInterface.id,
        interfaceName: targetInterface.name,
        proxyType: targetInterface.proxyType,
        pattern: targetInterface.pattern,
        url: url,
        isMatch: matchResult,
        matchDetail: {
          urlMatch: isMatch,
          note: 'HTTP方法匹配在测试模式下不进行验证，仅验证URL模式匹配'
        }
      };
      
      // 根据代理类型处理额外信息
      if (matchResult) {
        if (proxyType === 'response') {
          // 添加响应数据（如果有）
          if (targetInterface.response) {
            result.responseData = targetInterface.response;
          }
        } else if (proxyType === 'redirect' || proxyType === 'url_redirect') {
          // 添加重定向信息（如果有）
          if (targetInterface.targetUrl) {
            // 处理动态生成的目标URL
            const targetUrl = generateRandomValue(targetInterface.targetUrl);
            result.redirectInfo = {
              targetUrl: targetUrl,
              targetFormatted: targetUrl
            };
            
            // 添加自定义请求头（如果有）
            if (targetInterface.customHeaders) {
              try {
                result.redirectInfo.customHeaders = targetInterface.customHeaders;
              } catch (e) {
                console.error('解析自定义请求头失败:', e);
              }
            }
          }
        }
      }
      
      // 返回测试结果
      return res.json({
        code: 200,
        message: matchResult ? '接口匹配成功' : '接口匹配失败',
        data: result
      });
    }
    
    // 处理缓存刷新请求
    if (req.path === '/_flush_cache') {
      // 清空缓存
      enabledInterfacesCache = null;
      cacheTime = 0;
      
      return res.json({
        code: 200,
        message: '缓存已刷新',
        data: null
      });
    }
    
    // 处理缓存状态请求
    if (req.path === '/_cache_status') {
      return res.json({
        code: 200,
        message: '缓存状态',
        data: {
          enabledInterfaces: {
            cached: !!enabledInterfacesCache,
            lastUpdate: cacheTime,
            count: enabledInterfacesCache ? enabledInterfacesCache.length : 0
          },
          cacheInterval: CONFIG.CACHE_INTERVAL
        }
      });
    }
    
    // 其他请求返回405
    return res.status(405).json({
      code: 405,
      message: '方法不允许',
      data: null
    });
  } catch (err) {
    console.error('测试接口处理错误:', err);
    
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误: ' + (err.message || err),
      data: null
    });
  }
}; 