const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const Mock = require('mockjs');
const storage = require('./storage');

// 数据存储目录
const DATA_DIR = path.join(process.env.WHISTLE_PLUGIN_DATA_DIR || storage.DATA_DIR);
// 功能和接口配置文件
const FEATURES_FILE = path.join(DATA_DIR, 'features.json');
const INTERFACES_FILE = path.join(DATA_DIR, 'interfaces.json');

// 日志目录
const LOG_DIR = path.join(DATA_DIR, 'logs');
try {
  fs.ensureDirSync(LOG_DIR);
  console.log('Log directory created:', LOG_DIR);
} catch (err) {
  console.error('Failed to create log directory:', err.message);
}
const LOG_FILE = path.join(LOG_DIR, 'plugin.log');

// 记录日志
const logMessage = (message) => {
  try {
    // 确保日志目录存在
    if (!fs.existsSync(LOG_DIR)) {
      fs.ensureDirSync(LOG_DIR);
    }
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    fs.appendFileSync(LOG_FILE, logEntry);
    // 同时将日志输出到控制台，方便调试
    console.log(`[mock-plugin] ${message}`);
  } catch (err) {
    console.error('Error writing to log file:', err.message);
  }
};

// 记录请求日志，并写入到日志文件
const logRequest = (req, message = '') => {
  try {
    const url = req.url || '';
    const method = req.method || '';
    const ip = req.ip || '';
    
    let headers = '';
    try {
      headers = JSON.stringify(req.headers);
    } catch (err) {
      console.error('Error stringifying headers:', err.message);
      headers = '[无法解析的请求头]';
    }
    
    const logText = `${method} ${url} - IP: ${ip} - Headers: ${headers} ${message ? '- ' + message : ''}`;
    logMessage(logText);

    // 添加到 logs.json
    try {
      addToJsonLog({
        eventType: 'request',
        status: 'received',
        method,
        url,
        ip,
        headers: req.headers,
        message: message || '收到请求'
      });
    } catch (err) {
      console.error('Error adding request to JSON log:', err.message);
    }
  } catch (err) {
    console.error('Error in logRequest:', err.message);
  }
};

// 记录日志到 logs.json 文件
const addToJsonLog = (logData) => {
  try {
    const logsFile = path.join(DATA_DIR, 'logs.json');
    
    // 确保日志文件存在
    if (!fs.existsSync(logsFile)) {
      fs.writeJsonSync(logsFile, { logs: [] }, { spaces: 2 });
    }
    
    // 读取现有日志
    let logsData;
    try {
      logsData = fs.readJsonSync(logsFile);
      if (!logsData.logs) {
        logsData = { logs: [] };
      }
    } catch (err) {
      console.error('读取日志文件错误:', err);
      logsData = { logs: [] };
    }
    
    // 标准化日志数据，确保同时包含type和eventType字段
    const standardizedLogData = {
      ...logData,
      // 确保type和eventType都存在，前端可能使用eventType进行过滤
      eventType: logData.eventType || 'unknown',
      type: logData.eventType || 'unknown', // 复制eventType到type字段
      // 如果缺少必要字段，提供默认值，防止前端过滤出错
      url: logData.url || '',
      method: logData.method || '',
      message: logData.message || '',
      status: logData.status || '',
      pattern: logData.pattern || ''
    };
    
    // 添加时间戳和ID
    const newLog = {
      ...standardizedLogData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    // 添加新日志
    logsData.logs.unshift(newLog);
    
    // 限制日志数量，最多保留10000条
    if (logsData.logs.length > 10000) {
      logsData.logs = logsData.logs.slice(0, 10000);
    }
    
    fs.writeJsonSync(logsFile, logsData, { spaces: 2 });
  } catch (err) {
    console.error('记录日志到JSON文件失败:', err);
  }
};

// 确保数据目录存在
try {
  fs.ensureDirSync(DATA_DIR);
  logMessage('数据目录已确认: ' + DATA_DIR);
} catch (err) {
  console.error('创建数据目录失败:', err.message);
}

// 确保配置文件存在
if (!fs.existsSync(FEATURES_FILE)) {
  try {
    fs.writeJsonSync(FEATURES_FILE, { features: [] }, { spaces: 2 });
    logMessage('创建了功能配置文件: ' + FEATURES_FILE);
  } catch (err) {
    console.error('创建功能配置文件失败:', err.message);
  }
} else {
  // 验证文件结构
  try {
    const fileData = fs.readJsonSync(FEATURES_FILE);
    if (!fileData || !fileData.features) {
      // 如果文件存在但结构无效，重新初始化
      fs.writeJsonSync(FEATURES_FILE, { features: [] }, { spaces: 2 });
      logMessage('修复了损坏的features文件结构');
    }
  } catch (e) {
    // JSON解析错误时重新初始化文件
    try {
      fs.writeJsonSync(FEATURES_FILE, { features: [] }, { spaces: 2 });
      logMessage('修复了无法解析的features文件');
    } catch (err) {
      console.error('重置功能配置文件失败:', err.message);
    }
  }
}

if (!fs.existsSync(INTERFACES_FILE)) {
  try {
    fs.writeJsonSync(INTERFACES_FILE, { interfaces: [] }, { spaces: 2 });
    logMessage('创建了接口配置文件: ' + INTERFACES_FILE);
  } catch (err) {
    console.error('创建接口配置文件失败:', err.message);
  }
} else {
  // 验证文件结构
  try {
    const fileData = fs.readJsonSync(INTERFACES_FILE);
    if (!fileData || !fileData.interfaces) {
      // 如果文件存在但结构无效，重新初始化
      fs.writeJsonSync(INTERFACES_FILE, { interfaces: [] }, { spaces: 2 });
      logMessage('修复了损坏的interfaces文件结构');
    }
  } catch (e) {
    // JSON解析错误时重新初始化文件
    try {
      fs.writeJsonSync(INTERFACES_FILE, { interfaces: [] }, { spaces: 2 });
      logMessage('修复了无法解析的interfaces文件');
    } catch (err) {
      console.error('重置接口配置文件失败:', err.message);
    }
  }
}

// API前缀
const RULE_VALUE_HEADER = 'x-whistle-rule-value';
const MOCK_PREFIX = 'mock://';

// 创建 Express 应用
const app = express();

// 解析请求体
app.use(express.json({limit: '100mb'}));
app.use(express.urlencoded({ extended: true, limit: '100mb'}));

// 加载功能和接口配置
const loadConfigurations = () => {
  try {
    let featuresData = { features: [] };
    let interfacesData = { interfaces: [] };

    try {
      if (fs.existsSync(FEATURES_FILE)) {
        featuresData = fs.readJsonSync(FEATURES_FILE);
        // 确保featuresData和features字段都存在，并且features是数组
        if (!featuresData || !featuresData.features || !Array.isArray(featuresData.features)) {
          logMessage('功能配置数据结构不正确，重新初始化');
          featuresData = { features: [] };
        }
      } else {
        logMessage('功能配置文件不存在，使用空数组');
      }
    } catch (err) {
      logMessage('加载功能配置失败: ' + err.message);
      featuresData = { features: [] };
    }

    try {
      if (fs.existsSync(INTERFACES_FILE)) {
        interfacesData = fs.readJsonSync(INTERFACES_FILE);
        // 确保interfacesData和interfaces字段都存在，并且interfaces是数组
        if (!interfacesData || !interfacesData.interfaces || !Array.isArray(interfacesData.interfaces)) {
          logMessage('接口配置数据结构不正确，重新初始化');
          interfacesData = { interfaces: [] };
        }
      } else {
        logMessage('接口配置文件不存在，使用空数组');
      }
    } catch (err) {
      logMessage('加载接口配置失败: ' + err.message);
      interfacesData = { interfaces: [] };
    }

    return {
      features: featuresData.features || [],
      interfaces: interfacesData.interfaces || []
    };
  } catch (err) {
    logMessage('加载配置失败: ' + err.message);
    return { features: [], interfaces: [] };
  }
};

// 匹配URL是否符合模式
const isUrlMatch = (url, pattern) => {
  if (!pattern) return false;

  try {
    // 精确匹配
    if (pattern === url) {
      logMessage(`URL精确匹配成功: ${url} === ${pattern}`);
      return true;
    }

    // 通配符匹配
    if (pattern.includes('*')) {
      // 需要转换为正则表达式，处理特殊字符
      const regexPattern = pattern
        .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&') // 转义特殊字符
        .replace(/\*/g, '.*'); // 将 * 替换为 .*
      
      const regex = new RegExp('^' + regexPattern + '$');
      const result = regex.test(url);
      logMessage(`URL通配符匹配${result ? '成功' : '失败'}: ${url} ${result ? '匹配' : '不匹配'} 模式 ${pattern}`);
      return result;
    }

    // 正则表达式匹配
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      const regexStr = pattern.slice(1, -1);
      const regex = new RegExp(regexStr);
      const result = regex.test(url);
      logMessage(`URL正则匹配${result ? '成功' : '失败'}: ${url} ${result ? '匹配' : '不匹配'} 模式 ${pattern}`);
      return result;
    }
  } catch (e) {
    logMessage('正则表达式匹配错误: ' + e.message);
  }

  logMessage(`URL不匹配任何模式: ${url} != ${pattern}`);
  return false;
};

// 解析原始URL
const parseOriginalUrl = (req) => {
  try {
    logMessage(`开始解析原始URL，请求URL: ${req.url}`);
    logMessage(`请求方法: ${req.method}`);
    
    // 首先尝试从 originalReq 获取
    if (req.originalReq) {
      // 优先使用 realUrl，因为它是真实的 URL
      if (req.originalReq.realUrl) {
        logMessage(`从req.originalReq.realUrl获取原始URL: ${req.originalReq.realUrl}`);
        return req.originalReq.realUrl;
      }
      
      // 如果 realUrl 不存在，则使用 url
      if (req.originalReq.url) {
        logMessage(`从req.originalReq.url获取原始URL: ${req.originalReq.url}`);
        return req.originalReq.url;
      }
    }
    
    // 作为备选，继续尝试从请求头获取
    // 尝试从 x-whistle-real-url 头获取
    const whistleRealUrl = req.headers['x-whistle-real-url'];
    if (whistleRealUrl) {
      logMessage(`从x-whistle-real-url头获取原始URL: ${whistleRealUrl}`);
      return whistleRealUrl;
    }
    
    // 尝试从 x-forwarded-url 头获取
    const forwardedUrl = req.headers['x-forwarded-url'];
    if (forwardedUrl) {
      logMessage(`从x-forwarded-url头获取原始URL: ${forwardedUrl}`);
      return forwardedUrl;
    }
    
    // 从规则值中获取信息
    const ruleValue = req.headers['x-whistle-rule-value'];
    if (ruleValue) {
      logMessage(`从规则值获取信息: ${ruleValue}`);
      
      // 尝试从规则值中提取完整URL
      try {
        const match = /^(?:whistle\.mock-plugin:\/\/)?(.*)$/.exec(ruleValue);
        if (match && match[1]) {
          // 如果规则值包含URL，则直接使用
          if (match[1].startsWith('http')) {
            logMessage(`从规则值提取到完整URL: ${match[1]}`);
            return match[1]; 
          }
        }
      } catch (e) {
        logMessage(`解析规则值出错: ${e.message}`);
      }
    } else {
      logMessage(`请求头中没有x-whistle-rule-value`);
    }
    
    // 如果没有找到原始URL，使用请求URL
    logMessage(`无法获取原始URL，使用请求URL: ${req.url}`);
    return req.url;
  } catch (err) {
    logMessage(`解析原始URL失败: ${err.message}`);
    return req.url;
  }
};

// 获取所有请求头信息并记录
const logAllHeaders = (req) => {
  try {
    logMessage('===== 请求头信息 =====');
    Object.keys(req.headers).forEach(headerName => {
      logMessage(`  ${headerName}: ${req.headers[headerName]}`);
    });
    logMessage('=====================');
  } catch (err) {
    logMessage(`记录请求头失败: ${err.message}`);
  }
};

// 添加中间件记录所有请求
app.use((req, res, next) => {
  try {
    logMessage(`----- 新请求开始 -----`);
    logMessage(`收到请求: ${req.method} ${req.url}`);
    logAllHeaders(req);
    next();
  } catch (err) {
    logMessage(`请求日志中间件错误: ${err.message}`);
    next();
  }
});

// 处理请求
app.use(async (req, res, next) => {
  try {
    logMessage(`----- 新请求开始 -----`);
    logMessage(`收到请求: ${req.method} ${req.url}`);
    
    // 记录请求头
    logAllHeaders(req);
    
    // 获取规则值
    const ruleValue = req.headers['x-whistle-rule-value'];
    logMessage(`规则值: ${ruleValue || '无'}`);
    
    // 使用规则管理器处理请求
    let result;
    try {
      // 使用当前 require 的 ruleManager
      const ruleManagerModule = require('./ruleManager');
      // 传递next参数，确保未匹配的请求能够继续
      result = await ruleManagerModule.handleRequest(req, res, ruleValue, next);
    } catch (err) {
      logMessage(`规则管理器处理请求失败: ${err.message}`);
      result = { handled: false };
    }
    
    if (result && result.handled) {
      logMessage(`规则管理器成功处理了请求`);
      return; // 请求已处理，无需继续
    }
    
    // 如果规则管理器未处理，使用旧的处理方式
    logMessage(`规则管理器未处理请求，使用旧的处理方式`);
    handleLegacyRequest(req, res, next);
  } catch (err) {
    logMessage(`请求处理过程中发生错误: ${err.message}`);
    console.error('请求处理错误:', err);
    
    // 返回500错误
    res.status(500).json({
      code: 500,
      message: '内部服务器错误: ' + err.message,
      data: null
    });
  }
});

// 旧的请求处理方式，保持向后兼容
const handleLegacyRequest = (req, res, next) => {
  const http = require('http');
  const https = require('https');
  const { Readable } = require('stream');
  
  // 获取原始完整URL的所有可能来源
  let originalUrl = null;
  
  // 首先尝试从 originalReq 获取 (Whistle规范推荐方式)
  if (req.originalReq) {
    if (req.originalReq.realUrl) {
      originalUrl = req.originalReq.realUrl;
      logMessage(`从req.originalReq.realUrl获取原始URL: ${originalUrl}`);
    } else if (req.originalReq.url) {
      originalUrl = req.originalReq.url;
      logMessage(`从req.originalReq.url获取原始URL: ${originalUrl}`);
    }
  }
  
  // 如果 originalReq 没有提供有效URL，尝试从请求头获取
  if (!originalUrl || !originalUrl.startsWith('http')) {
    const whistleRealUrl = req.headers['x-whistle-real-url'];
    if (whistleRealUrl && whistleRealUrl.startsWith('http')) {
      originalUrl = whistleRealUrl;
      logMessage(`从x-whistle-real-url头获取原始URL: ${originalUrl}`);
    } else {
      const forwardedUrl = req.headers['x-forwarded-url'];
      if (forwardedUrl && forwardedUrl.startsWith('http')) {
        originalUrl = forwardedUrl;
        logMessage(`从x-forwarded-url头获取原始URL: ${originalUrl}`);
      }
    }
  }
  
  // 如果仍然没有找到原始URL，尝试从规则值获取
  if (!originalUrl || !originalUrl.startsWith('http')) {
    const ruleValue = req.headers['x-whistle-rule-value'];
    if (ruleValue) {
      try {
        const match = /^(?:whistle\.mock-plugin:\/\/)?(.*)$/.exec(ruleValue);
        if (match && match[1] && match[1].startsWith('http')) {
          originalUrl = match[1];
          logMessage(`从规则值提取到完整URL: ${originalUrl}`);
        }
      } catch (e) {
        logMessage(`解析规则值出错: ${e.message}`);
      }
    }
  }
  
  // 如果没有找到有效的原始URL，则无法继续
  if (!originalUrl || !originalUrl.startsWith('http')) {
    logMessage(`没有找到有效的原始URL，无法转发请求`);
    res.statusCode = 400;
    res.end(JSON.stringify({
      code: 400,
      message: '无法确定原始请求URL',
      data: null
    }));
    return;
  }
  
  // 记录到日志
  addToJsonLog({
    eventType: 'pass',
    status: 'not_matched',
    method: req.method,
    url: req.url,
    originalUrl: originalUrl,
    message: '未找到匹配的接口配置，转发到原始地址'
  });
  
  try {
    // 解析URL
    const urlObj = new URL(originalUrl);
    const isHttps = urlObj.protocol === 'https:';
    
    // 准备请求选项
    const options = {
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: req.method,
      headers: {...req.headers}
    };
    
    // 删除可能导致问题的请求头
    delete options.headers.host;
    delete options.headers['x-whistle-real-url'];
    delete options.headers['x-whistle-rule-value'];
    delete options.headers['x-forwarded-url'];
    
    // 设置正确的Host头
    options.headers.host = urlObj.host;
    
    logMessage(`准备转发请求到: ${originalUrl}, 方法: ${req.method}`);
    
    // 选择http或https模块
    const httpModule = isHttps ? https : http;
    
    // 创建请求并处理响应
    const proxyReq = httpModule.request(options, (proxyRes) => {
      logMessage(`收到来自 ${originalUrl} 的响应，状态码: ${proxyRes.statusCode}`);
      
      // 复制响应头
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });
      
      // 设置状态码
      res.statusCode = proxyRes.statusCode;
      
      // 传输响应体
      proxyRes.pipe(res);
      
      // 记录转发成功的日志
      addToJsonLog({
        eventType: 'response',
        status: 'forwarded',
        method: req.method,
        url: req.url,
        originalUrl: originalUrl,
        statusCode: proxyRes.statusCode,
        message: `请求已转发到原始地址，状态码: ${proxyRes.statusCode}`
      });
    });
    
    // 错误处理
    proxyReq.on('error', (error) => {
      logMessage(`转发请求到 ${originalUrl} 时出错: ${error.message}`);
      
      // 如果响应尚未发送，返回错误信息
      if (!res.headersSent) {
        res.statusCode = 502;
        res.end(JSON.stringify({
          code: 502,
          message: `转发请求到原始地址失败: ${error.message}`,
          data: null
        }));
      } else {
        // 如果已经发送了一部分响应，尝试结束响应
        try {
          res.end();
        } catch (e) {
          logMessage(`尝试结束已经部分发送的响应时出错: ${e.message}`);
        }
      }
      
      // 记录错误日志
      addToJsonLog({
        eventType: 'error',
        status: 'forward_failed',
        method: req.method,
        url: req.url,
        originalUrl: originalUrl,
        error: error.message,
        message: `转发请求到原始地址失败: ${error.message}`
      });
    });
    
    // 处理超时
    proxyReq.setTimeout(30000, () => {
      logMessage(`转发请求到 ${originalUrl} 超时`);
      proxyReq.destroy(new Error('请求超时'));
    });
    
    // 转发请求体
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // 如果请求有体，则转发
      if (req.readable) {
        req.pipe(proxyReq);
      } else {
        // 如果请求体已被读取，尝试重建并发送
        if (req.body) {
          const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
          proxyReq.write(bodyStr);
          proxyReq.end();
        } else {
          proxyReq.end();
        }
      }
    } else {
      // 对于GET和HEAD请求，直接结束请求
      proxyReq.end();
    }
  } catch (error) {
    logMessage(`准备转发请求时发生错误: ${error.message}`);
    res.statusCode = 500;
    res.end(JSON.stringify({
      code: 500,
      message: `内部服务器错误: ${error.message}`,
      data: null
    }));
    
    // 记录错误日志
    addToJsonLog({
      eventType: 'error',
      status: 'internal_error',
      method: req.method,
      url: req.url,
      originalUrl: originalUrl,
      error: error.message,
      message: `处理请求转发时发生内部错误: ${error.message}`
    });
  }
};

// 处理响应
const handleResponse = (interfaceItem, req, res) => {
  // 记录匹配信息
  addToJsonLog({
    eventType: 'match',
    status: 'matched',
    method: req.method,
    url: req.url,
    pattern: interfaceItem.urlPattern,
    interfaceId: interfaceItem.id,
    interfaceName: interfaceItem.name,
    featureId: interfaceItem.featureId,
    httpMethod: interfaceItem.httpMethod,
    message: `请求匹配到接口: ${interfaceItem.name}`
  });

  logMessage(`匹配到接口: ${interfaceItem.name}, ID: ${interfaceItem.id}`);
  logMessage(`URL匹配规则: ${interfaceItem.urlPattern}`);
  
  // 记录请求详情
  logMessage(`请求方法: ${req.method}`);
  logMessage(`原始URL: ${req.url}`);
  
  // 设置响应状态码
  const statusCode = parseInt(interfaceItem.httpStatus, 10) || 200;
  
  // 模拟延迟
  const delay = interfaceItem.responseDelay || 0;
  if (delay > 0) {
    logMessage(`模拟延迟处理: ${delay}ms`);
    setTimeout(() => processResponse(), delay);
  } else {
    processResponse();
  }
  
  function processResponse() {
    // 根据代理类型处理
    switch (interfaceItem.proxyType) {
      case 'response':
        try {
          // 设置响应头
          if (interfaceItem.contentType) {
            res.setHeader('Content-Type', interfaceItem.contentType);
          } else {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
          }
          
          // 添加调试头信息
          res.setHeader('X-Mock-Plugin', 'whistle.mock-plugin');
          res.setHeader('X-Mock-Interface', interfaceItem.name);
          res.setHeader('X-Mock-Interface-Id', interfaceItem.id);
          res.setHeader('X-Mock-Feature-Id', interfaceItem.featureId);
          
          // 尝试解析JSON
          let responseBody = interfaceItem.responseContent;
          logMessage(`响应内容(前50字符): ${responseBody.substring(0, 50)}...`);
          
          try {
            // 检查内容类型，如果是JSON则应用Mock.js
            if (interfaceItem.contentType && interfaceItem.contentType.includes('json')) {
              // 如果是JSON字符串，先解析为对象
              const jsonData = JSON.parse(responseBody);
              logMessage(`成功解析为JSON对象`);
              
              // 使用Mock.js处理模板
              const mockedData = Mock.mock(jsonData);
              logMessage(`Mock.js处理完成`);
              
              // 返回处理后的JSON
              res.status(statusCode).json(mockedData);
              logMessage(`响应JSON数据(状态码: ${statusCode}): ${JSON.stringify(mockedData).substr(0, 200)}...`);
              
              // 记录响应日志
              addToJsonLog({
                eventType: 'response',
                status: 'success',
                method: req.method,
                url: req.url,
                pattern: interfaceItem.urlPattern,
                interfaceId: interfaceItem.id,
                interfaceName: interfaceItem.name,
                featureId: interfaceItem.featureId,
                httpMethod: interfaceItem.httpMethod,
                statusCode: statusCode,
                contentType: interfaceItem.contentType,
                message: '成功返回JSON响应',
                responsePreview: JSON.stringify(mockedData).substr(0, 200)
              });
            } else {
              // 不是JSON，直接返回文本
              res.status(statusCode).send(responseBody);
              logMessage(`响应文本数据(状态码: ${statusCode}): ${responseBody.substr(0, 200)}...`);
              
              // 记录响应日志
              addToJsonLog({
                eventType: 'response',
                status: 'success',
                method: req.method,
                url: req.url,
                pattern: interfaceItem.urlPattern,
                interfaceId: interfaceItem.id,
                interfaceName: interfaceItem.name,
                featureId: interfaceItem.featureId,
                httpMethod: interfaceItem.httpMethod,
                statusCode: statusCode,
                contentType: interfaceItem.contentType,
                message: '成功返回文本响应',
                responsePreview: responseBody.substr(0, 200)
              });
            }
          } catch (e) {
            // JSON解析出错，直接返回原始内容
            logMessage(`JSON解析错误，作为文本返回: ${e.message}`);
            res.status(statusCode).send(responseBody);
            
            // 记录响应日志
            addToJsonLog({
              eventType: 'response',
              status: 'warning',
              method: req.method,
              url: req.url,
              pattern: interfaceItem.urlPattern,
              interfaceId: interfaceItem.id,
              interfaceName: interfaceItem.name,
              featureId: interfaceItem.featureId,
              httpMethod: interfaceItem.httpMethod,
              statusCode: statusCode,
              contentType: interfaceItem.contentType,
              message: `JSON解析错误，作为文本返回: ${e.message}`,
              responsePreview: responseBody.substr(0, 200)
            });
          }
        } catch (err) {
          logMessage('处理响应内容错误: ' + err.message);
          res.status(500).json({
            code: 500,
            message: '处理响应内容错误: ' + err.message,
            data: null
          });
          
          // 记录错误日志
          addToJsonLog({
            eventType: 'error',
            status: 'error',
            method: req.method,
            url: req.url,
            pattern: interfaceItem.urlPattern,
            interfaceId: interfaceItem.id,
            interfaceName: interfaceItem.name,
            featureId: interfaceItem.featureId,
            httpMethod: interfaceItem.httpMethod,
            message: '处理响应内容错误: ' + err.message,
            errorType: 'RESPONSE_PROCESSING_ERROR'
          });
        }
        break;
      
    case 'url':
      // URL重定向 - 实际场景中这需要代理到目标URL
      logMessage(`URL重定向: ${req.url} -> ${interfaceItem.targetUrl}`);
      res.status(statusCode).json({
        code: 302,
        message: '需要重定向到: ' + interfaceItem.targetUrl,
        data: {
          originalUrl: req.url,
          targetUrl: interfaceItem.targetUrl
        }
      });
      break;
      
    case 'file':
      try {
        // 文件代理 - 读取文件内容并返回
        const filePath = interfaceItem.filePath;
        
        if (!filePath) {
          logMessage('文件路径未指定');
          return res.status(400).json({
            code: 400,
            message: '文件路径未指定',
            data: null
          });
        }
        
        // 构建绝对路径 - 使用相对插件根目录的路径
        const absolutePath = path.resolve(process.cwd(), filePath);
        logMessage(`读取文件: ${absolutePath}`);
        
        if (!fs.existsSync(absolutePath)) {
          logMessage(`文件不存在: ${absolutePath}`);
          return res.status(404).json({
            code: 404,
            message: '文件不存在: ' + filePath,
            data: null
          });
        }
        
        const content = fs.readFileSync(absolutePath, 'utf8');
        
        // 尝试解析JSON
        try {
          const jsonData = JSON.parse(content);
          const mockedData = Mock.mock(jsonData);
          // 设置响应头
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('X-Mock-Plugin', 'whistle.mock-plugin');
          res.setHeader('X-Mock-Interface', interfaceItem.name);
          
          res.status(statusCode).json(mockedData);
          logMessage(`响应文件内JSON数据(状态码: ${statusCode}): ${JSON.stringify(mockedData).substr(0, 200)}...`);
        } catch (e) {
          // 不是JSON，直接返回文件内容
          res.status(statusCode).send(content);
          logMessage(`响应文件内文本数据(状态码: ${statusCode}): ${content.substr(0, 200)}...`);
        }
      } catch (err) {
        logMessage('读取文件错误: ' + err.message);
        res.status(500).json({
          code: 500,
          message: '读取文件错误: ' + err.message,
          data: null
        });
      }
      break;
      
    default:
      logMessage(`不支持的代理类型: ${interfaceItem.proxyType}`);
      res.status(400).json({
        code: 400,
        message: '不支持的代理类型: ' + interfaceItem.proxyType,
        data: null
      });
    }
  } // 结束 processResponse 函数
};

// 启动服务器
const server = app.listen(0);

// 导出启动服务器的函数
module.exports = function startServer(server, options) {
  // 确保之前的日志存在
  try {
    logMessage('------------------------------');
    logMessage('启动 whistle.mock-plugin 服务器...');
    logMessage('数据目录: ' + DATA_DIR);
    logMessage('日志文件: ' + LOG_FILE);
    
    // 加载并初始化规则管理器
    try {
      debugger
      const ruleManager = require('./ruleManager');
      
      // 初始化数据管理器
      const dataManager = require('./dataManager');
      dataManager.init({
        baseDir: DATA_DIR,
        log: logMessage
      });
      
      ruleManager.init({
        server: server,
        config: {
          baseDir: DATA_DIR
        },
        dataManager: dataManager,
        log: logMessage // 传递日志函数
      });
      logMessage('规则管理器初始化完成');
    } catch (err) {
      logMessage('规则管理器初始化失败: ' + err.message);
      console.error('规则管理器初始化失败:', err);
    }
    
    // 输出插件版本
    try {
      const packagePath = path.resolve(__dirname, '../package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = require(packagePath);
        logMessage(`插件版本: ${packageJson.name}@${packageJson.version}`);
      }
    } catch (e) {
      logMessage('获取插件版本失败: ' + e.message);
    }
    
    // 输出Whistle信息
    if (options && options.storage) {
      logMessage(`Whistle存储目录: ${JSON.stringify(options.storage)}`);
    }
    
    if (options && options.type) {
      logMessage(`Whistle插件类型: ${options.type}`);
    }
  } catch (e) {
    console.error('记录启动日志失败:', e);
  }
  
  // 检查和初始化配置文件
  if (!fs.existsSync(FEATURES_FILE) || !fs.existsSync(INTERFACES_FILE)) {
    logMessage('初始化配置文件...');
    if (!fs.existsSync(FEATURES_FILE)) {
      fs.writeJsonSync(FEATURES_FILE, { features: [] }, { spaces: 2 });
      logMessage('创建了features.json文件');
    }
    if (!fs.existsSync(INTERFACES_FILE)) {
      fs.writeJsonSync(INTERFACES_FILE, { interfaces: [] }, { spaces: 2 });
      logMessage('创建了interfaces.json文件');
    }
  }
  
  // 记录whistle传入的options
  logMessage('Whistle插件选项: ' + JSON.stringify(options));
  
  server.on('request', app);
  
  logMessage('whistle.mock-plugin 服务器已启动');
}; 