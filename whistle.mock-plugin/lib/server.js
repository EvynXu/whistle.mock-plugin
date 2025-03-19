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
    
    // 添加时间戳和ID
    const newLog = {
      ...logData,
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
app.use(express.json({limit: '3mb'}));
app.use(express.urlencoded({ extended: true, limit: '3mb'}));

// 加载功能和接口配置
const loadConfigurations = () => {
  try {
    let featuresData = { features: [] };
    let interfacesData = { interfaces: [] };

    try {
      if (fs.existsSync(FEATURES_FILE)) {
        featuresData = fs.readJsonSync(FEATURES_FILE);
        if (!featuresData || !Array.isArray(featuresData.features)) {
          featuresData = { features: [] };
        }
      }
    } catch (err) {
      logMessage('加载功能配置失败: ' + err.message);
      featuresData = { features: [] };
    }

    try {
      if (fs.existsSync(INTERFACES_FILE)) {
        interfacesData = fs.readJsonSync(INTERFACES_FILE);
        if (!interfacesData || !Array.isArray(interfacesData.interfaces)) {
          interfacesData = { interfaces: [] };
        }
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
    // 从请求头中获取原始URL
    let originalUrl = '';
    
    logMessage(`开始解析原始URL，请求URL: ${req.url}`);
    logMessage(`请求方法: ${req.method}`);
    
    // 尝试从 x-whistle-real-url 头获取
    const whistleRealUrl = req.headers['x-whistle-real-url'];
    if (whistleRealUrl) {
      logMessage(`从x-whistle-real-url头获取原始URL: ${whistleRealUrl}`);
      // 提取URL的路径部分
      try {
        const url = new URL(whistleRealUrl);
        originalUrl = url.pathname + url.search;
        logMessage(`提取的路径部分: ${originalUrl}`);
        return originalUrl;
      } catch (e) {
        logMessage(`URL解析失败: ${e.message}, 使用完整URL: ${whistleRealUrl}`);
        return whistleRealUrl;
      }
    }
    
    // 尝试从 x-forwarded-url 头获取
    const forwardedUrl = req.headers['x-forwarded-url'];
    if (forwardedUrl) {
      logMessage(`从x-forwarded-url头获取原始URL: ${forwardedUrl}`);
      // 提取URL的路径部分
      try {
        const url = new URL(forwardedUrl);
        originalUrl = url.pathname + url.search;
        logMessage(`提取的路径部分: ${originalUrl}`);
        return originalUrl;
      } catch (e) {
        logMessage(`URL解析失败: ${e.message}, 使用完整URL: ${forwardedUrl}`);
        return forwardedUrl;
      }
    }
    
    // 从规则值中获取信息
    const ruleValue = req.headers['x-whistle-rule-value'];
    if (ruleValue) {
      logMessage(`从规则值获取信息: ${ruleValue}`);
      
      // 尝试从规则值中提取域名和路径
      try {
        // 尝试从规则值中解析出URL
        const match = /https?:\/\/([^\/]+)(\/.*)?/.exec(ruleValue);
        if (match) {
          const host = match[1];
          const path = match[2] || '/';
          logMessage(`从规则值解析出域名 ${host} 和路径 ${path}`);
          return path; // 返回路径部分
        } else {
          logMessage(`规则值 ${ruleValue} 不符合 http(s)://host/path 格式`);
        }
      } catch (e) {
        logMessage(`解析规则值出错: ${e.message}`);
      }
    } else {
      logMessage(`请求头中没有x-whistle-rule-value`);
    }
    
    // 如果没有找到原始URL，使用请求URL
    logMessage(`无法从请求头中获取原始URL，使用请求URL: ${req.url}`);
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

// 加载规则管理器和数据管理器
const dataManager = require('./dataManager');
const ruleManager = require('./ruleManager');

// 初始化
const initPlugin = () => {
  try {
    // 初始化数据管理器
    dataManager.init({
      baseDir: DATA_DIR,
      log: logMessage
    });
    
    // 初始化规则管理器
    ruleManager.init({
      baseDir: DATA_DIR,
      dataManager: dataManager,
      log: logMessage
    });
    
    logMessage('插件初始化完成');
  } catch (err) {
    logMessage('插件初始化失败: ' + err.message);
    console.error('插件初始化失败:', err);
  }
};

// 执行初始化
initPlugin();

// 处理请求
app.use(async (req, res) => {
  try {
    logMessage(`----- 新请求开始 -----`);
    logMessage(`收到请求: ${req.method} ${req.url}`);
    
    // 记录请求头
    logAllHeaders(req);
    
    // 获取规则值
    const ruleValue = req.headers['x-whistle-rule-value'];
    logMessage(`规则值: ${ruleValue || '无'}`);
    
    // 使用规则管理器处理请求
    const result = await ruleManager.handleRequest(req, res, ruleValue);
    
    if (result && result.handled) {
      logMessage(`规则管理器成功处理了请求`);
      return; // 请求已处理，无需继续
    }
    
    // 如果规则管理器未处理，使用旧的处理方式
    logMessage(`规则管理器未处理请求，使用旧的处理方式`);
    handleLegacyRequest(req, res);
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
const handleLegacyRequest = (req, res) => {
  try {
    // 获取查询URL和方法
    const requestUrl = req.url;
    const method = req.method;
    
    // 获取原始请求URL
    const originalUrl = parseOriginalUrl(req);
    logMessage(`原始请求URL: ${originalUrl}`);
    
    // 加载配置
    const { features, interfaces } = loadConfigurations();
    
    // 查找匹配的接口
    const activeFeatures = features.filter(feature => feature.active);
    
    if (activeFeatures.length === 0) {
      logMessage('没有启用的功能模块');
    } else {
      logMessage(`找到 ${activeFeatures.length} 个启用的功能模块`);
    }
    
    // 分别尝试用请求URL和原始URL进行匹配
    const urlsToTry = [
      requestUrl,      // 请求URL
      originalUrl,     // 从请求头解析的原始URL
      originalUrl.split('?')[0], // 原始URL不带查询参数
      requestUrl.split('?')[0]   // 请求URL不带查询参数
    ];
    
    // 移除重复的URL
    const uniqueUrls = [...new Set(urlsToTry)];
    
    // 查找并返回第一个匹配的接口
    for (const url of uniqueUrls) {
      logMessage(`尝试匹配URL: ${url}`);
      
      for (const feature of activeFeatures) {
        const featureInterfaces = interfaces.filter(
          item => item.featureId === feature.id && item.active
        );
        
        logMessage(`检查功能"${feature.name}"中的${featureInterfaces.length}个接口...`);
        
        for (const interfaceItem of featureInterfaces) {
          // 方法匹配检查
          if (interfaceItem.httpMethod !== 'ALL' && interfaceItem.httpMethod !== method) {
            logMessage(`方法不匹配: ${interfaceItem.httpMethod} != ${method}`);
            continue;
          }
          
          // URL匹配检查
          if (isUrlMatch(url, interfaceItem.urlPattern)) {
            logMessage(`找到匹配的接口: ${interfaceItem.name} (${interfaceItem.urlPattern})`);
            
            // 处理延迟
            if (interfaceItem.responseDelay > 0) {
              logMessage(`响应延迟: ${interfaceItem.responseDelay}ms`);
              setTimeout(() => {
                handleResponse(interfaceItem, req, res);
              }, interfaceItem.responseDelay);
            } else {
              handleResponse(interfaceItem, req, res);
            }
            return;
          } else {
            logMessage(`URL不匹配: ${url} (模式: ${interfaceItem.urlPattern})`);
          }
        }
      }
    }
    
    // 无匹配接口，返回404
    logMessage('没有找到匹配的接口配置');
    res.status(404).json({
      code: 404,
      message: '未找到匹配的接口配置',
      data: null
    });
  } catch (err) {
    logMessage('处理请求出错: ' + err.message);
    console.error(err);
    res.status(500).json({
      code: 500,
      message: '内部服务器错误: ' + err.message,
      data: null
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
      const ruleManager = require('./ruleManager');
      ruleManager.init({
        server: server,
        config: {
          baseDir: DATA_DIR
        },
        dataManager: require('./dataManager'),
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
      logMessage(`Whistle存储目录: ${options.storage}`);
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