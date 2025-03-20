const fs = require('fs');
const path = require('path');
const url = require('url');
const Mock = require('mockjs');

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
    
    // 记录所有经过插件的请求
    try {
      if (this.dataManager && typeof this.dataManager.logRequest === 'function') {
        this.dataManager.logRequest({
          type: 'plugin_request',
          method: req.method,
          url: req.url,
          ruleValue,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      // 错误日志需要保留
      this.log(`[规则处理器] 记录请求日志失败: ${err.message}`);
    }
    
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
    const matchedInterface = this.findMatchingInterface(enabledInterfaces, requestPath, req.method);
    
    if (!matchedInterface) {
      this.log(`[规则处理器] 未找到匹配的接口，请求将透传: ${req.method} ${requestPath}`);
      
      // 记录未匹配的情况
      try {
        if (this.dataManager && typeof this.dataManager.logRequest === 'function') {
          this.dataManager.logRequest({
            type: 'not_matched',
            method: req.method,
            url: req.url,
            path: requestPath,
            ruleValue,
            timestamp: new Date().toISOString(),
            message: '未找到匹配的接口配置，请求继续'
          });
        }
      } catch (err) {
        this.log(`[规则处理器] 记录未匹配日志失败: ${err.message}`);
      }
      
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

    // 记录匹配到接口的情况
    try {
      if (this.dataManager && typeof this.dataManager.logRequest === 'function') {
        this.dataManager.logRequest({
          type: 'matched',
          method: req.method,
          url: req.url,
          path: requestPath,
          ruleValue,
          interfaceId: matchedInterface.id,
          interfaceName: matchedInterface.name,
          timestamp: new Date().toISOString(),
          message: `请求匹配到接口: ${matchedInterface.name}`
        });
      }
    } catch (err) {
      this.log(`[规则处理器] 记录匹配日志失败: ${err.message}`);
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
   * @returns {object|null} 匹配的接口对象，如果没有匹配则返回 null
   */
  findMatchingInterface(interfaces, requestPath, method) {
    // 简化日志，只记录正在进行匹配的操作
    this.log(`[规则处理器] 尝试匹配接口，路径: ${requestPath}, 方法: ${method}`);
    
    // 确保interfaces是一个数组
    if (!Array.isArray(interfaces)) {
      this.log(`[规则处理器] 错误: interfaces不是一个数组`);
      return null;
    }
    
    // 先尝试完全匹配
    let matchedInterface = interfaces.find(intf => {
      // 检查URL和方法是否匹配
      const urlMatches = intf.urlPattern === requestPath;
      
      // 修复: 兼容不同的方法名称和值
      const methodField = intf.httpMethod || intf.method;
      const methodValue = methodField && methodField.toUpperCase();
      const methodMatches = !methodValue || 
                            methodValue === 'ALL' || 
                            methodValue === 'ANY' || 
                            methodValue === method;
      
      // 移除中间匹配过程的日志
      return urlMatches && methodMatches;
    });

    if (matchedInterface) {
      this.log(`[规则处理器] 找到完全匹配的接口: ${matchedInterface.name}`);
      return matchedInterface;
    }

    // 如果没有完全匹配，尝试正则表达式匹配
    this.log(`[规则处理器] 未找到完全匹配，尝试正则表达式匹配...`);
    
    matchedInterface = interfaces.find(intf => {
      try {
        // 将通配符转换为正则表达式
        const pattern = this.convertPatternToRegex(intf.urlPattern);
        const regex = new RegExp(pattern);
        
        // 获取方法值，兼容不同的字段名
        const methodField = intf.httpMethod || intf.method;
        const methodValue = methodField && methodField.toUpperCase();
        
        // 只记录尝试匹配的模式，不记录详细过程
        this.log(`[规则处理器] 尝试正则匹配，测试 ${interfaces.length} 个模式`);
        
        // 检查URL和方法是否匹配
        const urlMatches = regex.test(requestPath);
        const methodMatches = !methodValue || 
                              methodValue === 'ALL' || 
                              methodValue === 'ANY' || 
                              methodValue === method;
        
        // 移除中间匹配过程的日志
        return urlMatches && methodMatches;
      } catch (err) {
        this.log(`[规则处理器] 无效的URL模式: ${intf.urlPattern}, 错误: ${err.message}`);
        return false;
      }
    });
    
    if (matchedInterface) {
      this.log(`[规则处理器] 找到模式匹配的接口: ${matchedInterface.name}`);
    } else {
      this.log(`[规则处理器] 未找到任何匹配的接口`);
    }
    
    return matchedInterface;
  },

  /**
   * 将URL模式中的通配符转换为正则表达式
   * @param {string} pattern URL模式
   * @returns {string} 正则表达式字符串
   */
  convertPatternToRegex(pattern) {
    if (pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 2) {
      // 已经是正则表达式格式：/pattern/
      return pattern.slice(1, -1);
    }
    
    // 转换通配符 * 为 .*
    return pattern.replace(/\*/g, '.*').replace(/\//g, '\\/');
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
    
    if (!targetUrl) {
      res.end(JSON.stringify({ error: 'No target URL specified' }));
      return { error: 'No target URL specified' };
    }
    
    // 构建重定向URL
    let redirectUrl = targetUrl;
    
    // 如果需要保留参数，则将原请求的查询参数附加到重定向URL
    if (preserveParams) {
      const parsedUrl = url.parse(req.url, true);
      const parsedTargetUrl = url.parse(targetUrl, true);
      
      // 合并查询参数
      const mergedQuery = { ...parsedTargetUrl.query, ...parsedUrl.query };
      
      // 重建URL
      const redirectUrlObj = new url.URL(targetUrl);
      Object.entries(mergedQuery).forEach(([key, value]) => {
        redirectUrlObj.searchParams.set(key, value);
      });
      
      redirectUrl = redirectUrlObj.toString();
    }
    
    // 执行重定向
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
    const template = config.responseContent || config.template || '{}';
    
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
      return { mockData };
    } catch (err) {
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
      return { success: true };
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