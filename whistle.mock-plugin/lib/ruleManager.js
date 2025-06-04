const fs = require('fs');
const path = require('path');
const url = require('url');
const Mock = require('mockjs');

// 获取嵌套对象属性值的工具函数
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

// 参数匹配功能
const isParamMatch = (req, paramMatchers, log) => {
  if (!paramMatchers || !Array.isArray(paramMatchers) || paramMatchers.length === 0) {
    return true; // 如果没有参数匹配规则，视为匹配成功
  }

  try {
    // 合并所有可能的参数来源
    let requestParams = {};
    
    // URL查询参数
    if (req.query) {
      requestParams = { ...requestParams, ...req.query };
    }
    
    // POST请求体参数
    if (req.body && typeof req.body === 'object') {
      requestParams = { ...requestParams, ...req.body };
    }
    
    // URL路径参数（如果有的话）
    if (req.params) {
      requestParams = { ...requestParams, ...req.params };
    }

    if (log) {
      log(`参数匹配检查 - 请求参数: ${JSON.stringify(requestParams)}`);
      log(`参数匹配检查 - 匹配规则: ${JSON.stringify(paramMatchers)}`);
    }

    // 检查每个匹配规则
    for (const matcher of paramMatchers) {
      const { paramPath, paramValue, matchType = 'exact' } = matcher;
      
      if (!paramPath) {
        continue; // 跳过无效的匹配规则
      }

      // 获取实际参数值
      const actualValue = getNestedValue(requestParams, paramPath);
      
      if (log) {
        log(`参数匹配检查 - 路径: ${paramPath}, 期望值: ${paramValue}, 实际值: ${actualValue}, 匹配类型: ${matchType}`);
      }

      // 如果参数不存在，视为不匹配
      if (actualValue === undefined || actualValue === null) {
        if (log) {
          log(`参数匹配失败 - 参数 ${paramPath} 不存在`);
        }
        return false;
      }

      // 根据匹配类型进行比较
      let isMatch = false;
      const actualStr = String(actualValue);
      const expectedStr = String(paramValue);

      switch (matchType) {
        case 'exact':
          isMatch = actualStr === expectedStr;
          break;
        case 'contains':
          isMatch = actualStr.includes(expectedStr);
          break;
        case 'regex':
          try {
            const regex = new RegExp(expectedStr);
            isMatch = regex.test(actualStr);
          } catch (e) {
            if (log) {
              log(`参数匹配失败 - 正则表达式无效: ${expectedStr}`);
            }
            return false;
          }
          break;
        default:
          isMatch = actualStr === expectedStr;
      }

      if (!isMatch) {
        if (log) {
          log(`参数匹配失败 - ${paramPath}: ${actualStr} 不匹配 ${expectedStr} (${matchType})`);
        }
        return false;
      }
    }

    if (log) {
      log('参数匹配成功 - 所有规则都匹配');
    }
    return true;
  } catch (error) {
    if (log) {
      log(`参数匹配检查出错: ${error.message}`);
    }
    return false;
  }
};

/**
 * 规则管理模块，负责处理 Whistle 规则和代理请求
 */
const ruleManager = {
  /**
   * 初始化规则管理器
   * @param {object} options 选项对象
   * @param {object} options.server Whistle 服务器对象
   * @param {object} options.config Whistle 配置对象
   * @param {object} options.dataManager 数据管理器对象
   */
  init(options) {
    this.server = options.server;
    this.config = options.config;
    this.dataManager = options.dataManager;
    this.baseDir = options.config.baseDir;
    
    // 设置日志函数
    this.log = options.log || console.log;
    this.log('规则管理器初始化完成, baseDir: ' + this.baseDir);
    
    // 确保 mock 数据目录存在
    this.mockDataDir = path.join(this.baseDir, 'mock-data');
    if (!fs.existsSync(this.mockDataDir)) {
      fs.mkdirSync(this.mockDataDir, { recursive: true });
      this.log('创建mock数据目录: ' + this.mockDataDir);
    }
  },

  /**
   * 处理代理请求
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {string} ruleValue 规则值
   * @param {function} next 下一个中间件
   * @returns {Promise<object>} 处理结果
   */
  async handleRequest(req, res, ruleValue, next) {
    // 只记录请求开始和规则值
    this.log(`[规则处理器] 收到请求: ${req.method} ${req.url}, 规则值: ${ruleValue || '无'}`);
    
    // 获取所有启用的接口配置
    const enabledInterfaces = await this.dataManager.getEnabledInterfaces();
    
    // 只记录接口数量，不记录详情
    this.log(`[规则处理器] 启用的接口数量: ${enabledInterfaces ? enabledInterfaces.length : 0}`);
    
    if (!enabledInterfaces || enabledInterfaces.length === 0) {
      this.log('[规则处理器] 没有启用的接口可用，透传请求');
      return { handled: false };
    }

    // 解析请求路径
    const parsedUrl = url.parse(req.url);
    const requestPath = parsedUrl.pathname;
    
    // 查找匹配的接口
    const matchedInterface = this.findMatchingInterface(enabledInterfaces, requestPath, req.method, req);
    
    if (!matchedInterface) {
      this.log(`[规则处理器] 未找到匹配的接口，请求将透传: ${req.method} ${requestPath}`);
      
      // 从请求头获取原始完整URL
      const originalUrl = req.originalReq?.url || req.originalReq?.realUrl;
      
      // 如果存在原始URL，确保放回请求头，以便后续处理程序使用
      if (originalUrl && originalUrl.startsWith('http')) {
        this.log(`[规则处理器] 保存原始URL到请求头，确保透传: ${originalUrl}`);
        req.headers['x-whistle-real-url'] = originalUrl;
      }
      
      // 标记为未处理，将由下一个中间件处理
      return { handled: false };
    }

    this.log(`[规则处理器] 找到匹配的接口: ${matchedInterface.name}, 代理类型: ${matchedInterface.proxyType}`);
    
    // 根据接口类型处理请求
    this.log(`[规则处理器] 开始处理请求...`);
    const result = await this.processRequest(matchedInterface, req, res);
    this.log(`[规则处理器] 请求处理完成，状态: ${result.error ? '失败' : '成功'}`);
    
    return { handled: true, result };
  },

  /**
   * 根据请求路径和方法查找匹配的接口
   * @param {Array} interfaces 接口列表
   * @param {string} requestPath 请求路径
   * @param {string} method 请求方法
   * @param {object} req 完整的请求对象，用于参数匹配
   * @returns {object|null} 匹配的接口对象，如果没有匹配则返回 null
   */
  findMatchingInterface(interfaces, requestPath, method, req) {
    // 简化日志，只记录正在进行匹配的操作
    this.log(`[规则处理器] 尝试匹配接口，路径: ${requestPath}, 方法: ${method}`);
    
    // 确保interfaces是一个数组
    if (!Array.isArray(interfaces)) {
      this.log(`[规则处理器] 错误: interfaces不是一个数组`);
      return null;
    }
    
    // 防止空路径
    if (!requestPath) {
      this.log(`[规则处理器] 错误: 请求路径为空`);
      return null;
    }
    
    // 收集所有URL匹配的接口
    const urlMatchedInterfaces = [];
    
    // 先收集所有URL匹配的接口（根据proxyType采用不同匹配策略）
    for (const intf of interfaces) {
      if (!intf || !intf.urlPattern) {
        continue;
      }
      
      // 检查HTTP方法是否匹配
      const methodField = intf.httpMethod || intf.method;
      const methodValue = methodField && methodField.toUpperCase();
      const methodMatches = !methodValue || 
                            methodValue === 'ALL' || 
                            methodValue === 'ANY' || 
                            methodValue === method;
      
      if (!methodMatches) {
        continue;
      }
      
      // 根据proxyType选择匹配策略
      const proxyType = intf.proxyType || 'response';
      let urlMatches = false;
      
      try {
        urlMatches = this.isUrlMatchByProxyType(requestPath, intf.urlPattern, proxyType, req);
      } catch (err) {
        this.log(`[规则处理器] 匹配接口 ${intf.name} 时出错: ${err.message}`);
        continue;
      }
      
      if (urlMatches) {
        this.log(`[规则处理器] 接口 ${intf.name} URL匹配成功 (${proxyType}模式)`);
        urlMatchedInterfaces.push(intf);
      }
    }
    
    this.log(`[规则处理器] 找到 ${urlMatchedInterfaces.length} 个URL匹配的接口`);
    
    if (urlMatchedInterfaces.length === 0) {
      this.log(`[规则处理器] 未找到匹配的接口`);
      return null;
    }
    
    // 在URL匹配的接口中，查找参数也匹配的接口
    for (const intf of urlMatchedInterfaces) {
      // 检查参数匹配
      if (isParamMatch(req, intf.paramMatchers, this.log)) {
        this.log(`[规则处理器] 找到完全匹配的接口: ${intf.name} (URL + 参数匹配)`);
        return intf;
      } else {
        this.log(`[规则处理器] 接口 ${intf.name} URL匹配但参数不匹配，继续查找...`);
      }
    }
    
    // 如果没有参数匹配的接口，返回第一个没有参数匹配规则的接口
    const fallbackInterface = urlMatchedInterfaces.find(intf => 
      !intf.paramMatchers || !Array.isArray(intf.paramMatchers) || intf.paramMatchers.length === 0
    );
    
    if (fallbackInterface) {
      this.log(`[规则处理器] 使用回退接口: ${fallbackInterface.name} (无参数匹配规则)`);
      return fallbackInterface;
    }
    
    this.log(`[规则处理器] 所有URL匹配的接口都有参数匹配规则且都不满足，未找到合适的接口`);
    return null;
  },

  /**
   * 根据代理类型进行URL匹配
   * @param {string} requestPath 请求路径
   * @param {string} pattern URL匹配模式
   * @param {string} proxyType 代理类型
   * @param {object} req 请求对象（用于获取完整URL）
   * @returns {boolean} 是否匹配
   */
  isUrlMatchByProxyType(requestPath, pattern, proxyType, req) {
    if (!pattern) return false;
    // 获取完整URL（如果需要）
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

    switch (proxyType) {
      case 'url_redirect':
        // URL重定向：需要完全匹配完整URL
        this.log(`[规则处理器] url_redirect模式 - 完全匹配: ${fullUrl} === ${pattern}`);
        return pattern === fullUrl;
        
      case 'redirect':
        // 重定向：前缀匹配
        this.log(`[规则处理器] redirect模式 - 前缀匹配: ${fullUrl}.startsWith(${pattern})`);
        return fullUrl.startsWith(pattern);
        
      case 'response':
      case 'file':
      default:
        // 模拟响应和文件代理：支持多种匹配方式
        return this.isUrlMatchForResponse(requestPath, pattern);
    }
  },

  /**
   * 响应类型的URL匹配（支持精确匹配、通配符、正则表达式）
   * @param {string} requestPath 请求路径
   * @param {string} pattern URL匹配模式
   * @returns {boolean} 是否匹配
   */
  isUrlMatchForResponse(requestPath, pattern) {
    // 精确匹配
    if (pattern === requestPath) {
      this.log(`[规则处理器] response模式 - 精确匹配成功: ${requestPath}`);
      return true;
    }

    // 通配符匹配
    if (pattern.includes('*')) {
      try {
        // 从缓存获取或创建正则表达式
        if (!this.regexCache) {
          this.regexCache = new Map();
        }
        
        const cacheKey = `wildcard:${pattern}`;
        let regex = this.regexCache.get(cacheKey);
        
        if (!regex) {
          // 转换通配符为正则表达式
          const regexPattern = pattern
            .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&') // 转义特殊字符
            .replace(/\*/g, '.*'); // 将 * 替换为 .*
          
          regex = new RegExp('^' + regexPattern + '$');
          this.regexCache.set(cacheKey, regex);
        }
        
        const matches = regex.test(requestPath);
        this.log(`[规则处理器] response模式 - 通配符匹配${matches ? '成功' : '失败'}: ${requestPath} ~ ${pattern}`);
        return matches;
      } catch (err) {
        this.log(`[规则处理器] 通配符匹配错误: ${err.message}`);
        return false;
      }
    }

    // 正则表达式匹配
    if (pattern.startsWith('/') && pattern.length > 2 && pattern.endsWith('/')) {
      try {
        // 从缓存获取或创建正则表达式
        if (!this.regexCache) {
          this.regexCache = new Map();
        }
        
        const cacheKey = `regex:${pattern}`;
        let regex = this.regexCache.get(cacheKey);
        
        if (!regex) {
          const regexStr = pattern.slice(1, -1);
          regex = new RegExp(regexStr);
          this.regexCache.set(cacheKey, regex);
        }
        
        const matches = regex.test(requestPath);
        this.log(`[规则处理器] response模式 - 正则匹配${matches ? '成功' : '失败'}: ${requestPath} ~ ${pattern}`);
        return matches;
      } catch (err) {
        this.log(`[规则处理器] 正则表达式匹配错误: ${err.message}`);
        return false;
      }
    }

    // 都不匹配
    this.log(`[规则处理器] response模式 - 所有匹配方式都失败: ${requestPath} != ${pattern}`);
    return false;
  },

  /**
   * 根据接口类型处理请求
   * @param {object} interfaceObj 接口对象
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @returns {Promise<object>} 处理结果
   */
  async processRequest(interfaceObj, req, res) {
    // 兼容不同的代理类型字段名和值
    const proxyType = interfaceObj.proxyType || '';
    
    // 创建统一的配置对象，兼容直接字段访问和config嵌套字段
    const config = interfaceObj.config || interfaceObj;
    
    // 只记录关键信息
    this.log(`[规则处理器] 处理请求，接口: ${interfaceObj.name}, 代理类型: ${proxyType}`);
    
    // 设置响应头
    let headers = config.headers;
    if (typeof headers === 'string') {
      headers = this.parseHeaders(headers);
    } else if (typeof headers === 'object' && headers !== null) {
      // 已经是对象格式，直接使用
    } else {
      headers = {};
    }
    
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // 设置内容类型
    if (config.contentType && !res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', config.contentType);
    }
    
    // 添加延迟
    const delay = parseInt(config.responseDelay || config.delay || 0, 10);
    if (delay > 0) {
      this.log(`[规则处理器] 添加响应延迟: ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // 设置状态码
    res.statusCode = parseInt(config.httpStatus || config.statusCode || 200, 10);
    
    // 根据代理类型处理
    let result;
    if (proxyType === 'url_redirect' || proxyType === 'redirect') {
      result = await this.handleUrlRedirect(interfaceObj, req, res);
    } 
    else if (proxyType === 'data_template' || proxyType === 'response') {
      // 添加CORS支持 - 设置跨域相关的响应头
      const origin = req.headers.origin || req.headers.host;
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      result = await this.handleDataTemplate(interfaceObj, req, res);
    } 
    else if (proxyType === 'file_proxy' || proxyType === 'file') {
      result = await this.handleFileProxy(interfaceObj, req, res);
    } 
    else if (proxyType === 'dynamic_data') {
      result = await this.handleDynamicData(interfaceObj, req, res);
    } 
    else {
      // 默认使用数据模板处理
      this.log(`[规则处理器] 未知的代理类型 "${proxyType}"，默认使用数据模板处理`);
      result = await this.handleDataTemplate(interfaceObj, req, res);
    }
    
    // 记录处理结果
    this.log(`[规则处理器] 请求处理完成，状态码: ${res.statusCode}`);
    
    // 记录完整的命中规则日志
    if (this.dataManager && typeof this.dataManager.logRequest === 'function') {
      const parsedUrl = url.parse(req.url);
      try {
        this.dataManager.logRequest({
          type: 'mock_hit',
          eventType: 'mock_hit',
          message: `命中接口规则: ${interfaceObj.name}`,
          method: req.method,
          url: req.url,
          path: parsedUrl.pathname,
          status: res.statusCode,
          pattern: interfaceObj.urlPattern,
          proxyType: proxyType,
          interfaceName: interfaceObj.name,
          interfaceId: interfaceObj.id,
          responseData: result,
          responseTime: new Date().toISOString(),
          contentType: res.getHeader('Content-Type') || config.contentType
        });
      } catch (err) {
        this.log(`[规则处理器] 记录命中规则日志失败: ${err.message}`);
      }
    }
    
    return result;
  },

  /**
   * 处理 URL 重定向类型
   * @param {object} interfaceObj 接口对象
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @returns {Promise<object>} 处理结果
   */
  async handleUrlRedirect(interfaceObj, req, res) {
    // 兼容不同的字段命名
    const config = interfaceObj.config || interfaceObj;
    const targetUrl = config.targetUrl || '';
    const preserveParams = config.preserveParams || false;
    const proxyType = interfaceObj.proxyType || config.proxyType || '';

    if (!targetUrl) {
      res.end(JSON.stringify({ error: 'No target URL specified' }));
      return { error: 'No target URL specified' };
    }

    let redirectUrl = targetUrl;

    if (proxyType === 'url_redirect') {
      // url_redirect 只跳转到 targetUrl，不附加原始请求的 query 参数
      redirectUrl = targetUrl;
    } else if (proxyType === 'redirect') {
      // redirect 类型：将 pattern 部分替换为 targetUrl
      const pattern = config.urlPattern || interfaceObj.urlPattern || '';
      const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
      this.log(`[规则处理器] fullUrl : ${fullUrl}`);
      if (pattern && fullUrl && fullUrl.startsWith(pattern)) {
        redirectUrl = targetUrl + fullUrl.slice(pattern.length);
        this.log(`[规则处理器] redirectUrl : ${redirectUrl}`);
        // 保留参数
        if (preserveParams) {
          const parsedReqUrl = url.parse(fullUrl, true);
          const parsedTargetUrl = url.parse(redirectUrl, true);
          const mergedQuery = { ...parsedTargetUrl.query, ...parsedReqUrl.query };
          const redirectUrlObj = new url.URL(redirectUrl);
          Object.entries(mergedQuery).forEach(([key, value]) => {
            redirectUrlObj.searchParams.set(key, value);
          });
          redirectUrl = redirectUrlObj.toString();
        }
      } else {
        // pattern 不匹配，直接跳转到 targetUrl
        redirectUrl = targetUrl;
      }
    } else {
      // 其他类型，默认直接跳转到 targetUrl
      if (preserveParams) {
        const parsedReqUrl = url.parse(req.url, true);
        const parsedTargetUrl = url.parse(targetUrl, true);
        const mergedQuery = { ...parsedTargetUrl.query, ...parsedReqUrl.query };
        const redirectUrlObj = new url.URL(targetUrl);
        Object.entries(mergedQuery).forEach(([key, value]) => {
          redirectUrlObj.searchParams.set(key, value);
        });
        redirectUrl = redirectUrlObj.toString();
      }
    }

    // TODO krollxw 执行重定向
    res.setHeader('Location', redirectUrl);
    res.statusCode = 302;
    res.end();

    return { redirectUrl };
  },

  /**
   * 处理数据模板类型
   * @param {object} interfaceObj 接口对象
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @returns {Promise<object>} 处理结果
   */
  async handleDataTemplate(interfaceObj, req, res) {
    // 兼容不同的字段命名
    const config = interfaceObj.config || interfaceObj;
    
    // 支持多响应系统
    let template = '';
    
    // 检查是否有多响应配置
    if (config.responses && Array.isArray(config.responses) && config.responses.length > 0) {
      // 获取当前激活的响应
      const activeResponseId = config.activeResponseId;
      const activeResponse = activeResponseId 
        ? config.responses.find(r => r.id === activeResponseId)
        : config.responses[0];
      
      if (activeResponse) {
        this.log(`[规则处理器] 使用响应: ${activeResponse.name || '未命名'}`);
        template = activeResponse.content;
      }
    }
    
    // 如果没有找到响应内容，回退到传统字段
    if (!template) {
      template = config.responseContent || config.template || '{}';
      this.log(`[规则处理器] 使用传统响应内容`);
    }
    
    if (!template) {
      res.end(JSON.stringify({ error: 'No template specified' }));
      return { error: 'No template specified' };
    }
    
    try {
      // 使用 Mock.js 生成数据
      const mockData = Mock.mock(JSON.parse(template));
      
      // 设置内容类型
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      
      // 发送数据
      res.end(JSON.stringify(mockData));
      
      // 返回处理结果，包含响应信息
      return { 
        mockData,
        mockInfo: {
          delay: parseInt(config.responseDelay || config.delay || 0, 10),
          timestamp: new Date().toISOString(),
          responseName: config.responses && config.activeResponseId 
            ? (config.responses.find(r => r.id === config.activeResponseId)?.name || '未命名')
            : '默认响应'
        }
      };
    } catch (err) {
      this.log(`[规则处理器] 模板解析错误: ${err.message}`);
      res.end(JSON.stringify({ error: 'Template parsing error', message: err.message }));
      return { error: 'Template parsing error', message: err.message };
    }
  },

  /**
   * 处理文件代理类型
   * @param {object} interfaceObj 接口对象
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @returns {Promise<object>} 处理结果
   */
  async handleFileProxy(interfaceObj, req, res) {
    // 兼容不同的字段命名
    const config = interfaceObj.config || interfaceObj;
    const filePath = config.filePath || '';
    
    // 只记录关键信息
    this.log(`[规则处理器] 处理文件代理，路径: ${filePath}`);
    
    if (!filePath) {
      this.log(`[规则处理器] 错误: 未指定文件路径`);
      res.end(JSON.stringify({ error: 'No file path specified' }));
      return { error: 'No file path specified' };
    }
    
    // 确定文件路径
    const absFilePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(this.mockDataDir, filePath);
    
    try {
      // 检查文件是否存在
      if (!fs.existsSync(absFilePath)) {
        this.log(`[规则处理器] 错误: 文件不存在: ${path.basename(absFilePath)}`);
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'File not found', path: absFilePath }));
        return { error: 'File not found', path: absFilePath };
      }
      
      // 读取文件内容
      const fileContent = fs.readFileSync(absFilePath, 'utf8');
      this.log(`[规则处理器] 成功读取文件: ${path.basename(absFilePath)}`);
      
      // 设置内容类型（根据文件扩展名）
      if (!res.getHeader('Content-Type')) {
        const ext = path.extname(absFilePath).toLowerCase();
        const contentType = this.getContentTypeByExt(ext);
        if (contentType) {
          res.setHeader('Content-Type', contentType);
        }
      }
      
      // 设置响应头，标识插件处理
      res.setHeader('X-Handled-By', 'whistle.mock-plugin');
      
      // 发送文件内容
      res.end(fileContent);
      return { filePath: absFilePath, fileName: path.basename(absFilePath) };
    } catch (err) {
      this.log(`[规则处理器] 读取文件错误: ${err.message}`);
      res.end(JSON.stringify({ error: 'File reading error', message: err.message }));
      return { error: 'File reading error', message: err.message };
    }
  },

  /**
   * 处理动态数据生成类型
   * @param {object} interfaceObj 接口对象
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @returns {Promise<object>} 处理结果
   */
  async handleDynamicData(interfaceObj, req, res) {
    const { config } = interfaceObj;
    const { script } = config;
    
    if (!script) {
      res.end(JSON.stringify({ error: 'No script specified' }));
      return { error: 'No script specified' };
    }
    
    try {
      // 创建执行环境
      const context = {
        req,
        Mock,
        url: req.url,
        method: req.method,
        headers: req.headers,
        query: url.parse(req.url, true).query,
      };
      
      // 从请求中读取 body
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const body = await this.readRequestBody(req);
        context.body = body;
        
        // 尝试解析 JSON
        try {
          context.bodyJson = JSON.parse(body);
        } catch (e) {
          // 忽略解析错误
        }
      }
      
      // 执行脚本
      const fn = new Function('ctx', `
        with (ctx) {
          ${script}
          return typeof result !== 'undefined' ? result : {};
        }
      `);
      
      const result = fn(context);
      
      // 设置内容类型
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      
      // 发送结果
      res.end(typeof result === 'string' ? result : JSON.stringify(result));
      return { result };
    } catch (err) {
      res.end(JSON.stringify({ error: 'Script execution error', message: err.message }));
      return { error: 'Script execution error', message: err.message };
    }
  },

  /**
   * 从请求中读取 body
   * @param {object} req 请求对象
   * @returns {Promise<string>} 请求体字符串
   */
  readRequestBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', err => {
        reject(err);
      });
    });
  },

  /**
   * 解析响应头字符串
   * @param {string} headersStr 响应头字符串
   * @returns {object} 解析后的响应头对象
   */
  parseHeaders(headersStr) {
    if (!headersStr) return {};
    
    const headers = {};
    headersStr.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        if (value) {
          headers[key.trim()] = value;
        }
      }
    });
    
    return headers;
  },

  /**
   * 根据文件扩展名获取内容类型
   * @param {string} ext 文件扩展名
   * @returns {string|null} 内容类型
   */
  getContentTypeByExt(ext) {
    const contentTypes = {
      '.json': 'application/json; charset=utf-8',
      '.xml': 'application/xml; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.htm': 'text/html; charset=utf-8',
      '.txt': 'text/plain; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.csv': 'text/csv; charset=utf-8',
    };
    
    return contentTypes[ext] || null;
  }
};

module.exports = ruleManager; 