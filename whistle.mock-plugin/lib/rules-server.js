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

// 记录日志
const log = (message) => {
  console.log(`[mock-plugin:rulesServer] ${message}`);
};

// 加载功能模块配置
const loadFeatures = () => {
  try {
    if (!fs.existsSync(FEATURES_FILE)) {
      log('功能模块配置文件不存在');
      return [];
    }
    
    const data = fs.readJsonSync(FEATURES_FILE);
    
    // 处理不同的数据结构
    let features = [];
    
    if (data && Array.isArray(data)) {
      // 如果直接是数组
      features = data;
    } else if (data && data.features && Array.isArray(data.features)) {
      // 如果是 {features: [...]} 格式
      features = data.features;
    } else {
      log('未能识别功能模块数据结构');
      return [];
    }
    
    log(`总共发现 ${features.length} 个功能模块配置`);
    
    // 过滤出启用状态的功能模块
    const enabledFeatures = features.filter(feature => feature.active === true);
    
    log(`找到 ${enabledFeatures.length} 个启用的功能模块`);
    return enabledFeatures;
  } catch (err) {
    log(`加载功能模块配置失败: ${err.message}`);
    return [];
  }
};

// 加载接口配置
const loadInterfaces = () => {
  try {
    if (!fs.existsSync(INTERFACES_FILE)) {
      log('接口配置文件不存在');
      return [];
    }
    
    const data = fs.readJsonSync(INTERFACES_FILE);
    // 为了避免日志过长，只打印前100个字符
    const dataPreview = JSON.stringify(data).substring(0, 100) + (JSON.stringify(data).length > 100 ? '...' : '');
    log(`读取到接口配置数据: ${dataPreview}`);
    
    // 处理不同的数据结构
    let interfaces = [];
    
    if (data && Array.isArray(data)) {
      // 如果直接是数组
      interfaces = data;
    } else if (data && data.interfaces && Array.isArray(data.interfaces)) {
      // 如果是 {interfaces: [...]} 格式
      interfaces = data.interfaces;
    } else {
      log('未能识别接口数据结构');
      return [];
    }
    
    log(`总共发现 ${interfaces.length} 个接口配置`);
    
    // 加载功能模块配置
    const enabledFeatures = loadFeatures();
    const enabledFeatureIds = enabledFeatures.map(feature => feature.id);
    
    // 过滤出启用状态的接口
    // 兼容不同字段: active 或 enabled
    const enabledInterfaces = interfaces.filter(intf => {
      // 首先检查接口本身是否启用
      const isInterfaceEnabled = intf.enabled === true || intf.active === true;
      
      // 如果接口未启用，直接排除
      if (!isInterfaceEnabled) {
        return false;
      }
      
      // 如果接口有关联功能，检查功能是否启用
      const featureId = intf.featureId;
      if (featureId) {
        return enabledFeatureIds.includes(featureId);
      }
      
      // 如果接口没有关联功能，只要接口本身启用就可以
      return true;
    });
    
    log(`找到 ${enabledInterfaces.length} 个启用的接口配置`);
    return enabledInterfaces;
  } catch (err) {
    log(`加载接口配置失败: ${err.message}`);
    return [];
  }
};

// 匹配URL是否符合模式
const isUrlMatch = (url, pattern) => {
  if (!pattern) return false;

  try {
    // 精确匹配
    if (pattern === url) {
      return true;
    }

    // 通配符匹配
    if (pattern.includes('*')) {
      // 需要转换为正则表达式，处理特殊字符
      const regexPattern = pattern
        .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&') // 转义特殊字符
        .replace(/\*/g, '.*'); // 将 * 替换为 .*
      
      const regex = new RegExp('^' + regexPattern + '$');
      return regex.test(url);
    }

    // 正则表达式匹配
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      const regexStr = pattern.slice(1, -1);
      const regex = new RegExp(regexStr);
      return regex.test(url);
    }
  } catch (e) {
    log(`正则表达式匹配错误: ${e.message}`);
  }

  return false;
};

// Whistle 规则服务器实现
module.exports = (server, options) => {
  server.on('request', (req, res) => {
    const oReq = req.originalReq;
    
    // 提取请求相关信息
    const fullUrl = oReq.url;
    log(`原始URL: ${fullUrl}`);
    
    // 特殊调试路径，用于查看配置文件内容
    if (fullUrl.endsWith('/_debug/config')) {
      try {
        const configs = {
          interfaces: fs.existsSync(INTERFACES_FILE) ? fs.readJsonSync(INTERFACES_FILE) : null,
          features: fs.existsSync(FEATURES_FILE) ? fs.readJsonSync(FEATURES_FILE) : null
        };
        res.end(JSON.stringify(configs, null, 2));
        return;
      } catch (err) {
        log(`读取配置文件失败: ${err.message}`);
        res.end(`读取配置文件失败: ${err.message}`);
        return;
      }
    }
    
    // 调试路径，查看启用的接口
    if (fullUrl.endsWith('/_debug/enabled-interfaces')) {
      try {
        const enabledInterfaces = loadInterfaces();
        res.end(JSON.stringify({
          count: enabledInterfaces.length,
          interfaces: enabledInterfaces
        }, null, 2));
        return;
      } catch (err) {
        log(`获取启用接口失败: ${err.message}`);
        res.end(`获取启用接口失败: ${err.message}`);
        return;
      }
    }
    
    // 解析URL
    let parsedUrl;
    try {
      parsedUrl = url.parse(fullUrl);
    } catch (err) {
      log(`解析URL失败: ${err.message}`);
      // 解析失败时，不处理请求
      res.end('');
      return;
    }
    
    // 尝试获取 pathname 或 path，用于匹配
    const method = oReq.method;
    const path = parsedUrl.pathname || '';
    
    log(`请求方法: ${method}, 请求路径: ${path}`);
    
    // 加载启用的接口配置
    const enabledInterfaces = loadInterfaces();
    log(`已加载 ${enabledInterfaces.length} 个接口配置`);
    
    if (enabledInterfaces.length === 0) {
      log('没有找到启用的接口配置，跳过处理');
      res.end('');
      return;
    }
    
    // 检查是否有匹配的接口
    const matchedInterface = enabledInterfaces.find(intf => {
      // 获取URL模式
      const pattern = intf.urlPattern || '';
      
      if (!pattern) {
        log(`接口 ${intf.id || intf.name || '未知'} 缺少URL模式`);
        return false;
      }
      
      // 检查URL模式匹配
      const urlMatches = isUrlMatch(path, pattern);
      
      if (!urlMatches) {
        // 不记录每个失败的匹配，以减少日志量
        return false;
      }
      
      log(`URL模式匹配成功: ${path} 匹配 ${pattern}`);
      
      // 检查HTTP方法匹配
      const methodField = intf.httpMethod || intf.method || '';
      const methodValue = methodField.toUpperCase();
      const methodMatches = !methodValue || 
                            methodValue === 'ALL' || 
                            methodValue === 'ANY' || 
                            methodValue === method;
      
      if (!methodMatches) {
        log(`方法不匹配: 请求方法 ${method}, 接口方法 ${methodValue}`);
        return false;
      }
      
      log(`方法匹配成功: ${method} 匹配 ${methodValue || 'ALL'}`);
      
      return true;
    });
    
    // 如果找到匹配的接口，返回对应的规则将请求转发到插件
    if (matchedInterface) {
      log(`找到匹配接口 "${matchedInterface.name || matchedInterface.id || '未知'}" 用于 ${method} ${path}`);
      res.end(`${fullUrl} mock-plugin://`);
    } else {
      // 如果没有匹配的接口，返回空字符串，Whistle 会继续处理下一个规则
      log(`未找到匹配接口，跳过处理 ${method} ${path}`);
      res.end('');
    }
  });
}; 