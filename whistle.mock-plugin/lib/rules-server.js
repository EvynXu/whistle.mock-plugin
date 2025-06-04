const fs = require('fs-extra');
const path = require('path');
const url = require('url');
const storage = require('./storage');

// 数据存储目录
const DATA_DIR = path.join(process.env.WHISTLE_PLUGIN_DATA_DIR || storage.DATA_DIR);
// 接口配置文件
const INTERFACES_FILE = path.join(DATA_DIR, 'interfaces.json');
// 添加功能模块配置文件
const FEATURES_FILE = path.join(DATA_DIR, 'features.json');

// 配置项
const CONFIG = {
  // 日志级别：0=NONE, 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG
  LOG_LEVEL: process.env.MOCK_PLUGIN_LOG_LEVEL || 4,
  // 缓存有效期（毫秒），默认 60 秒
  CACHE_INTERVAL: process.env.MOCK_PLUGIN_CACHE_INTERVAL || 60000,
  // 是否在控制台输出详细日志
  VERBOSE_CONSOLE: process.env.MOCK_PLUGIN_VERBOSE === 'true'
};

// 缓存控制变量
let enabledInterfacesCache = null; // 仅缓存启用状态的接口
let cacheTime = 0;
let cacheVersion = 1;

// 正则表达式缓存
const regexCache = new Map();

// 记录日志
const log = (message, level = 3) => {
  // 只记录小于等于当前日志级别的日志
  if (level <= CONFIG.LOG_LEVEL) {
    const prefix = level === 1 ? '[ERROR] ' : 
                   level === 2 ? '[WARN] ' : 
                   level === 4 ? '[DEBUG] ' : '';
    
    console.log(`[mock-plugin:rulesServer] ${prefix}${message}`);
  }
};

// 错误日志
const logError = (message) => log(message, 1);

// 警告日志
const logWarn = (message) => log(message, 2);

// 信息日志
const logInfo = (message) => log(message, 3);

// 调试日志
const logDebug = (message) => log(message, 4);

// 获取文件最后修改时间
const getFileModTime = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtimeMs;
  } catch (err) {
    return 0;
  }
};

// 加载所有启用的接口（整合了功能模块和接口的加载逻辑）
const loadEnabledInterfaces = () => {
  try {
    const currentTime = Date.now();
    const interfacesFileModTime = getFileModTime(INTERFACES_FILE);
    const featuresFileModTime = getFileModTime(FEATURES_FILE);
    
    // 取两个文件的最后修改时间的最大值
    const lastModTime = Math.max(interfacesFileModTime, featuresFileModTime);
    
    // 如果缓存有效且文件未被修改，直接返回缓存
    if (enabledInterfacesCache && 
        currentTime - cacheTime < CONFIG.CACHE_INTERVAL && 
        lastModTime <= cacheTime) {
      logDebug('使用已启用接口的缓存');
      return enabledInterfacesCache;
    }
    
    logDebug('缓存无效或文件已修改，重新加载接口');
    
    // 1. 读取并解析所有功能模块
    let enabledFeatureIds = [];
    if (fs.existsSync(FEATURES_FILE)) {
      try {
        const featuresData = fs.readJsonSync(FEATURES_FILE);
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
        
        logDebug(`找到 ${enabledFeatureIds.length} 个启用的功能模块`);
      } catch (err) {
        logError(`读取功能模块失败: ${err.message}`);
      }
    }
    
    // 2. 读取并解析所有接口
    let enabledInterfaces = [];
    if (fs.existsSync(INTERFACES_FILE)) {
      try {
        const interfacesData = fs.readJsonSync(INTERFACES_FILE);
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
        
        logInfo(`找到 ${enabledInterfaces.length} 个启用的接口`);
      } catch (err) {
        logError(`读取接口配置失败: ${err.message}`);
      }
    }
    
    // 更新缓存
    enabledInterfacesCache = enabledInterfaces;
    cacheTime = currentTime;
    
    return enabledInterfaces;
  } catch (err) {
    logError(`加载启用接口失败: ${err.message}`);
    return enabledInterfacesCache || [];
  }
};

// 匹配URL是否符合模式
const isUrlMatch = (url, pattern, proxyType, fullUrl) => {
  if (!pattern) return false;
  
  try {
    // 针对不同的代理类型采用不同的匹配策略
    
    // 对于url_redirect类型，需要完全匹配fullPath才命中
    if (proxyType === 'url_redirect') {
      // 精确匹配完整路径，这是最快的比较方式
      return pattern === fullUrl;
    }
    
    // 对于redirect类型，只要url以pattern开头即可命中（前缀匹配）
    if (proxyType === 'redirect') {
      // 使用字符串原生的startsWith方法更高效
      return fullUrl.startsWith(pattern);
    }
    
    // 以下是默认的匹配逻辑（用于response类型等）
    
    // 精确匹配 - 最高效的匹配方式
    if (pattern === url) {
      return true;
    }

    // 通配符匹配
    if (pattern.includes('*')) {
      // 使用缓存的正则表达式
      const cacheKey = `wildcard:${pattern}`;
      let regex = regexCache.get(cacheKey);
      
      if (!regex) {
        // 需要转换为正则表达式，处理特殊字符
        const regexPattern = pattern
          .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&') // 转义特殊字符
          .replace(/\*/g, '.*'); // 将 * 替换为 .*
        
        regex = new RegExp('^' + regexPattern + '$');
        regexCache.set(cacheKey, regex);
      }
      
      return regex.test(url);
    }

    // 正则表达式匹配
    if (pattern.startsWith('/') && pattern.length > 2 && pattern.endsWith('/')) {
      // 使用缓存的正则表达式
      const cacheKey = `regex:${pattern}`;
      let regex = regexCache.get(cacheKey);
      
      if (!regex) {
        const regexStr = pattern.slice(1, -1);
        regex = new RegExp(regexStr);
        regexCache.set(cacheKey, regex);
      }
      
      return regex.test(url);
    }
  } catch (e) {
    log(`正则表达式匹配错误: ${e.message}`);
  }

  return false;
};

// 验证目标URL是否有效
const isValidTargetUrl = (url) => {
  if (!url) return false;
  
  try {
    // 检查是否是合法的URL格式
    new URL(url);
    return true;
  } catch (e) {
    log(`URL验证错误: ${e.message}`);
    return false;
  }
};

// 验证重定向规则的有效性
const validateRedirectRule = (interface) => {
  if (!interface) return false;
  
  const { proxyType, targetUrl } = interface;
  
  // 对于redirect和url_redirect类型，必须有有效的目标URL
  if ((proxyType === 'redirect' || proxyType === 'url_redirect') && !isValidTargetUrl(targetUrl)) {
    log(`接口 ${interface.id || interface.name || '未知'} 的目标URL无效: ${targetUrl}`);
    return false;
  }
  
  return true;
};

// 生成随机数工具函数
const generateRandomValue = (pattern) => {
  // 如果不是以@开头的模式，直接返回原值
  if (!pattern || !pattern.startsWith('@')) {
    return pattern;
  }
  
  const formatPattern = pattern.substring(1); // 去掉@前缀
  // 使用单次正则替换代替每个字符的遍历
  return formatPattern.replace(/x/g, () => {
    // 使用一个固定的字符集，避免生成不兼容的字符
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return chars.charAt(Math.floor(Math.random() * chars.length));
  });
};

// 构建重定向规则
const buildRedirectRule = (fullUrl, targetUrl, customHeaders, pattern, isUrlRedirect = 0) => {
  // 构建目标URL
  let finalTargetUrl = fullUrl.replace(pattern, targetUrl);

  // 定义结果数组，避免多次字符串拼接
  const rules = [`${fullUrl} ${finalTargetUrl}`];
  
  // 如果有自定义请求头，添加到规则中
  if (customHeaders && Object.keys(customHeaders).length > 0) {
    // 为每个请求头创建一个规则行
    Object.entries(customHeaders).forEach(([key, value]) => {
      // 处理随机值
      const processedValue = generateRandomValue(value);
      
      // 添加到规则数组
      rules.push(`${fullUrl} headerReplace://req.${key}:/(.*)/=${processedValue}`);
    });
  }
  
  // 最后才将所有规则合并为一个字符串，减少字符串操作
  return rules.join('\n');
};

// 缓存管理接口 - 简化版本
const cacheManager = {
  // 清除缓存
  clearCache: () => {
    logInfo('主动清除接口缓存');
    enabledInterfacesCache = null;
    cacheTime = 0;
    cacheVersion++;
  },
  
  // 获取当前缓存状态
  getStatus: () => {
    return {
      enabled: {
        cached: !!enabledInterfacesCache,
        cacheTime: cacheTime,
        itemCount: enabledInterfacesCache ? enabledInterfacesCache.length : 0
      },
      cacheVersion,
      configInterval: CONFIG.CACHE_INTERVAL
    };
  }
};

// Whistle 规则服务器实现
module.exports = (server, options) => {
  // 优化：缓存常用路径匹配
  const debugConfigPath = '/_debug/config';
  const debugEnabledInterfacesPath = '/_debug/enabled-interfaces';
  const clearCachePath = '/_flush_cache';
  
  server.on('request', (req, res) => {
    const oReq = req.originalReq;
    
    // 提取请求相关信息
    const fullUrl = oReq.url;
    logDebug(`原始URL: ${fullUrl}`);
    
    // 处理缓存刷新请求
    if (fullUrl.startsWith(clearCachePath)) {
      cacheManager.clearCache();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: '缓存已刷新',
        cacheStatus: cacheManager.getStatus()
      }));
      return;
    }
    
    // 特殊调试路径，查看缓存状态
    if (fullUrl.endsWith('/_cache_status')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(cacheManager.getStatus()));
      return;
    }
    
    // 特殊调试路径，使用更高效的匹配
    if (fullUrl.endsWith(debugConfigPath)) {
      try {
        const configs = {
          interfaces: fs.existsSync(INTERFACES_FILE) ? fs.readJsonSync(INTERFACES_FILE) : null,
          features: fs.existsSync(FEATURES_FILE) ? fs.readJsonSync(FEATURES_FILE) : null
        };
        res.end(JSON.stringify(configs, null, 2));
        return;
      } catch (err) {
        logError(`读取配置文件失败: ${err.message}`);
        res.end(`读取配置文件失败: ${err.message}`);
        return;
      }
    }
    
    // 调试路径，查看启用的接口
    if (fullUrl.endsWith(debugEnabledInterfacesPath)) {
      try {
        const enabledInterfaces = loadEnabledInterfaces();
        res.end(JSON.stringify({
          count: enabledInterfaces.length,
          interfaces: enabledInterfaces
        }, null, 2));
        return;
      } catch (err) {
        logError(`获取启用接口失败: ${err.message}`);
        res.end(`获取启用接口失败: ${err.message}`);
        return;
      }
    }
    
    // 解析URL
    let parsedUrl;
    try {
      parsedUrl = url.parse(fullUrl);
    } catch (err) {
      logError(`解析URL失败: ${err.message}`);
      // 解析失败时，不处理请求
      res.end('');
      return;
    }
    
    // 尝试获取 pathname 或 path，用于匹配
    const method = oReq.method;
    const path = parsedUrl.pathname || '';
    
    logDebug(`请求方法: ${method}, 请求路径: ${path}`);
    
    // 加载启用的接口配置（使用缓存优化）
    const enabledInterfaces = loadEnabledInterfaces();
    
    if (enabledInterfaces.length === 0) {
      logDebug('没有找到启用的接口配置，跳过处理');
      res.end('');
      return;
    }
    
    // 优化：使用 find 查找匹配的接口，只遍历一次数组
    const matchedInterface = enabledInterfaces.find(intf => {
      // 获取URL模式
      const pattern = intf.urlPattern || '';
      const proxyType = intf.proxyType || 'response';
      
      if (!pattern) {
        logDebug(`接口 ${intf.id || intf.name || '未知'} 缺少URL模式`);
        return false;
      }
      
      // 检查URL模式匹配，根据proxyType选择适当的匹配策略
      const urlMatches = isUrlMatch(path, pattern, proxyType, fullUrl);
      
      if (!urlMatches) {
        // 不记录每个失败的匹配，以减少日志量
        return false;
      }
      
      logDebug(`URL模式匹配成功: ${fullUrl} 匹配 ${pattern} (${proxyType}模式)`);
      
      // 检查HTTP方法匹配
      const methodField = intf.httpMethod || intf.method || '';
      const methodValue = methodField.toUpperCase();
      const methodMatches = !methodValue || 
                            methodValue === 'ALL' || 
                            methodValue === 'ANY' || 
                            methodValue === method;
      
      if (!methodMatches) {
        logDebug(`方法不匹配: 请求方法 ${method}, 接口方法 ${methodValue}`);
        return false;
      }
      
      logDebug(`方法匹配成功: ${method} 匹配 ${methodValue || 'ALL'}`);
      
      return true;
    });
    
    // 如果找到匹配的接口，处理对应的规则
    if (matchedInterface) {
      logInfo(`找到匹配接口 "${matchedInterface.name || matchedInterface.id || '未知'}" 用于 ${method} ${path}`);
      
      // 处理不同的代理类型
      const proxyType = matchedInterface.proxyType || 'response';
      
      // 优先级判断：首先处理 response 类型
      if (proxyType === 'response') {
        // 返回指向插件服务的规则
        logDebug(`接口 "${matchedInterface.name}" 使用模拟响应模式`);
        res.end(`${fullUrl} mock-plugins://`);
        return;
      }
      
      // 对于redirect和url_redirect类型，验证规则有效性
      if ((proxyType === 'redirect' || proxyType === 'url_redirect') && !validateRedirectRule(matchedInterface)) {
        logWarn(`接口 "${matchedInterface.name}" 的重定向规则无效，跳过处理`);
        res.end('');
        return;
      }
      
      // 处理 redirect 类型：将请求的 url 中的源 url 部分替换为目标 url
      if (proxyType === 'redirect') {
        const targetUrl = matchedInterface.targetUrl.trim();
        const pattern = matchedInterface.urlPattern.trim();
        logDebug(`接口 "${matchedInterface.name}" 使用重定向模式，模式: ${pattern}, 目标URL: ${targetUrl}`);
        
        // 确保目标URL合法
        if (!isValidTargetUrl(targetUrl)) {
          logWarn(`目标URL不合法: ${targetUrl}，跳过处理`);
          res.end('');
          return;
        }
        
        // 执行重定向：将fullUrl中匹配的pattern替换为targetUrl
        // 使用startsWith优化匹配效率
        if (fullUrl.startsWith(pattern)) {
          // 获取自定义请求头
          const customHeaders = matchedInterface.customHeaders || {};
          
          // 构建重定向规则，包括自定义请求头
          const redirectRule = buildRedirectRule(fullUrl, targetUrl, customHeaders, pattern, 0);
          
          // 返回规则
          res.end(redirectRule);
          logDebug(`重定向规则: ${redirectRule}`);
          return;
        } else {
          logDebug(`URL ${fullUrl} 不以 ${pattern} 开头，跳过处理`);
          res.end('');
          return;
        }
      }
      
      // 处理 url_redirect 类型：完全匹配 fullPath 并直接返回目标URL
      if (proxyType === 'url_redirect') {
        const targetUrl = matchedInterface.targetUrl.trim();
        const pattern = matchedInterface.urlPattern.trim();
        logDebug(`接口 "${matchedInterface.name}" 使用URL重定向模式，模式: ${pattern}, 目标URL: ${targetUrl}`);
        
        // 确保目标URL合法
        if (!isValidTargetUrl(targetUrl)) {
          logWarn(`目标URL不合法: ${targetUrl}，跳过处理`);
          res.end('');
          return;
        }
        
        // 对于url_redirect，我们需要完全匹配
        if (fullUrl === matchedInterface.urlPattern) {
          // 获取自定义请求头
          const customHeaders = matchedInterface.customHeaders || {};
          
          // 构建重定向规则，包括自定义请求头
          const redirectRule = buildRedirectRule(fullUrl, targetUrl, customHeaders, pattern, 1);
          
          // 返回规则
          res.end(redirectRule);
          logDebug(`URL重定向规则: ${redirectRule}`);
          return;
        } else {
          logDebug(`URL ${fullUrl} 不完全匹配 ${matchedInterface.urlPattern}，跳过处理`);
          res.end('');
          return;
        }
      }
      
      // 默认情况下使用mock-plugins处理
      logDebug(`接口 "${matchedInterface.name}" 使用默认处理模式`);
      res.end(`${fullUrl} mock-plugins://`);
    } else {
      // 如果没有匹配的接口，返回空字符串，Whistle 会继续处理下一个规则
      logDebug(`未找到匹配接口，跳过处理 ${method} ${path}`);
      res.end('');
    }
  });
}; 