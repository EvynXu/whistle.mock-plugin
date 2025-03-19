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
    
    // 确保 mock 数据目录存在
    this.mockDataDir = path.join(this.baseDir, 'mock-data');
    if (!fs.existsSync(this.mockDataDir)) {
      fs.mkdirSync(this.mockDataDir, { recursive: true });
    }
  },

  /**
   * 处理代理请求
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {string} ruleValue 规则值
   * @returns {Promise<object>} 处理结果
   */
  async handleRequest(req, res, ruleValue) {
    // 获取所有启用的接口配置
    const enabledInterfaces = await this.dataManager.getEnabledInterfaces();
    if (!enabledInterfaces || enabledInterfaces.length === 0) {
      return { handled: false };
    }

    // 解析请求路径
    const parsedUrl = url.parse(req.url);
    const requestPath = parsedUrl.pathname;
    
    // 查找匹配的接口
    const matchedInterface = this.findMatchingInterface(enabledInterfaces, requestPath, req.method);
    if (!matchedInterface) {
      return { handled: false };
    }

    // 根据接口类型处理请求
    const result = await this.processRequest(matchedInterface, req, res);
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
    // 先尝试完全匹配
    let matchedInterface = interfaces.find(intf => {
      // 检查URL和方法是否匹配
      const urlMatches = intf.urlPattern === requestPath;
      const methodMatches = intf.method === 'ANY' || intf.method === method;
      return urlMatches && methodMatches;
    });

    if (matchedInterface) {
      return matchedInterface;
    }

    // 如果没有完全匹配，尝试正则表达式匹配
    return interfaces.find(intf => {
      try {
        // 将通配符转换为正则表达式
        const pattern = this.convertPatternToRegex(intf.urlPattern);
        const regex = new RegExp(pattern);
        
        // 检查URL和方法是否匹配
        const urlMatches = regex.test(requestPath);
        const methodMatches = intf.method === 'ANY' || intf.method === method;
        
        return urlMatches && methodMatches;
      } catch (err) {
        console.error('Invalid URL pattern:', intf.urlPattern, err);
        return false;
      }
    });
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
    const { proxyType, config } = interfaceObj;
    
    // 设置响应头
    if (config.headers) {
      const headers = this.parseHeaders(config.headers);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }
    
    // 添加延迟
    if (config.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }
    
    // 设置状态码
    res.statusCode = config.statusCode || 200;
    
    // 根据代理类型处理
    switch (proxyType) {
      case 'url_redirect':
        return this.handleUrlRedirect(interfaceObj, req, res);
      
      case 'data_template':
        return this.handleDataTemplate(interfaceObj, req, res);
      
      case 'file_proxy':
        return this.handleFileProxy(interfaceObj, req, res);
      
      case 'dynamic_data':
        return this.handleDynamicData(interfaceObj, req, res);
      
      default:
        res.end(JSON.stringify({ error: 'Unsupported proxy type' }));
        return { error: 'Unsupported proxy type' };
    }
  },

  /**
   * 处理 URL 重定向类型
   * @param {object} interfaceObj 接口对象
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @returns {Promise<object>} 处理结果
   */
  async handleUrlRedirect(interfaceObj, req, res) {
    const { config } = interfaceObj;
    const { targetUrl, preserveParams } = config;
    
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
    const { config } = interfaceObj;
    const { template } = config;
    
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
    const { config } = interfaceObj;
    const { filePath } = config;
    
    if (!filePath) {
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
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'File not found', path: absFilePath }));
        return { error: 'File not found', path: absFilePath };
      }
      
      // 读取文件内容
      const fileContent = fs.readFileSync(absFilePath, 'utf8');
      
      // 设置内容类型（根据文件扩展名）
      if (!res.getHeader('Content-Type')) {
        const ext = path.extname(absFilePath).toLowerCase();
        const contentType = this.getContentTypeByExt(ext);
        if (contentType) {
          res.setHeader('Content-Type', contentType);
        }
      }
      
      // 发送文件内容
      res.end(fileContent);
      return { fileContent };
    } catch (err) {
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