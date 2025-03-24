/**
 * 数据管理模块，负责功能和接口数据的存储和检索
 */
const fs = require('fs-extra');
const path = require('path');
const storage = require('./storage');

// 缓存启用的接口列表
let enabledInterfacesCache = null;
let lastCacheTime = 0;

// 缓存过期时间（毫秒）
const CACHE_TTL = 5000; // 5秒

const dataManager = {
  /**
   * 初始化数据管理器
   * @param {object} options 配置选项，包含 baseDir 和 log
   */
  init(options = {}) {
    this.baseDir = options.baseDir || storage.DATA_DIR;
    this.featuresFile = path.join(this.baseDir, 'features.json');
    this.interfacesFile = path.join(this.baseDir, 'interfaces.json');
    this.logsFile = path.join(this.baseDir, 'logs.json');
    this.log = options.log || console.log;
    
    this.log(`数据管理器初始化, 基础目录: ${this.baseDir}`);
    this.log(`功能配置文件: ${this.featuresFile}`);
    this.log(`接口配置文件: ${this.interfacesFile}`);
    this.log(`日志文件: ${this.logsFile}`);
    
    // 确保目录存在
    try {
      fs.ensureDirSync(this.baseDir);
      this.log(`确保目录存在: ${this.baseDir}`);
    } catch (err) {
      this.log(`创建目录失败: ${err.message}`);
      console.error('创建目录失败:', err);
    }
    
    // 初始化文件
    this.ensureFilesExist();
  },

  // 确保配置文件存在
  ensureFilesExist() {
    try {
      if (!fs.existsSync(this.featuresFile)) {
        fs.writeJsonSync(this.featuresFile, { features: [] }, { spaces: 2 });
        this.log(`创建功能配置文件: ${this.featuresFile}`);
      }

      if (!fs.existsSync(this.interfacesFile)) {
        fs.writeJsonSync(this.interfacesFile, { interfaces: [] }, { spaces: 2 });
        this.log(`创建接口配置文件: ${this.interfacesFile}`);
      }
      
      if (!fs.existsSync(this.logsFile)) {
        fs.writeJsonSync(this.logsFile, { logs: [] }, { spaces: 2 });
        this.log(`创建日志文件: ${this.logsFile}`);
      }
    } catch (err) {
      this.log(`确保文件存在失败: ${err.message}`);
      console.error('确保文件存在失败:', err);
    }
  },
  
  /**
   * 记录请求日志
   * @param {object} logData 日志数据
   */
  logRequest(logData) {
    try {
      // 首先检查参数是否有效，避免不必要的文件操作
      if (!logData || typeof logData !== 'object') {
        this.log(`记录请求日志失败: 无效的日志数据`);
        return false;
      }
      
      // 确保日志文件存在
      if (!fs.existsSync(this.logsFile)) {
        fs.writeJsonSync(this.logsFile, { logs: [] }, { spaces: 2 });
      }
      
      // 读取现有日志
      const logsData = fs.readJsonSync(this.logsFile);
      
      // 确保日志结构正确
      if (!logsData.logs) {
        logsData.logs = [];
      }
      
      // 标准化日志数据，确保同时包含type和eventType字段
      const standardizedLogData = {
        ...logData,
        // 确保type和eventType都存在，前端可能使用eventType进行过滤
        eventType: logData.eventType || logData.type || 'unknown',
        type: logData.type || logData.eventType || 'unknown',
        // 如果缺少必要字段，提供默认值，确保前端过滤不出错
        url: logData.url || '',
        method: logData.method || '',
        message: logData.message || '',
        status: logData.status || '',
        pattern: logData.pattern || ''
      };
      
      // 添加ID和时间戳
      const logEntry = {
        ...standardizedLogData,
        id: Date.now().toString(),
        timestamp: logData.timestamp || new Date().toISOString()
      };
      
      // 将新日志添加到前面
      logsData.logs.unshift(logEntry);
      
      // 限制日志数量，保留最新的5000条
      if (logsData.logs.length > 5000) {
        logsData.logs = logsData.logs.slice(0, 5000);
      }
      
      // 保存日志
      fs.writeJsonSync(this.logsFile, logsData, { spaces: 2 });
      
      this.log(`记录请求日志: ${logEntry.method} ${logEntry.url} (${logEntry.type})`);
      return true;
    } catch (err) {
      this.log(`记录请求日志失败: ${err.message}`);
      console.error('记录请求日志失败:', err);
      return false;
    }
  },
  
  /**
   * 获取请求日志
   * @param {object} options 查询选项
   * @param {number} options.limit 返回日志的最大数量
   * @param {string} options.type 日志类型
   * @returns {Promise<Array>} 日志列表
   */
  async getLogs(options = {}) {
    try {
      // 确保日志文件存在
      if (!fs.existsSync(this.logsFile)) {
        fs.writeJsonSync(this.logsFile, { logs: [] }, { spaces: 2 });
        return [];
      }
      
      // 读取日志
      const logsData = await fs.readJson(this.logsFile);
      
      if (!logsData.logs) {
        return [];
      }
      
      let logs = logsData.logs;
      
      // 根据类型过滤
      if (options.type) {
        logs = logs.filter(log => log.type === options.type);
      }
      
      // 限制返回数量
      if (options.limit && options.limit > 0) {
        logs = logs.slice(0, options.limit);
      }
      
      return logs;
    } catch (err) {
      this.log(`获取日志失败: ${err.message}`);
      console.error('获取日志失败:', err);
      return [];
    }
  },

  /**
   * 清空日志
   * @returns {Promise<boolean>} 是否成功
   */
  async clearLogs() {
    try {
      fs.writeJsonSync(this.logsFile, { logs: [] }, { spaces: 2 });
      this.log('日志已清空');
      return true;
    } catch (err) {
      this.log(`清空日志失败: ${err.message}`);
      console.error('清空日志失败:', err);
      return false;
    }
  },

  /**
   * 获取所有功能列表
   * @returns {Promise<Array>} 功能列表
   */
  async getFeatures() {
    try {
      this.log('尝试读取功能配置...');
      
      // 如果文件不存在，创建
      if (!fs.existsSync(this.featuresFile)) {
        this.log(`功能配置文件不存在，创建空文件`);
        fs.writeJsonSync(this.featuresFile, { features: [] }, { spaces: 2 });
      }

      const data = await fs.readJson(this.featuresFile);
      this.log(`成功读取功能配置, 发现 ${data.features ? data.features.length : 0} 个功能`);
      return data.features || [];
    } catch (err) {
      this.log(`读取功能配置失败: ${err.message}`);
      console.error('读取功能配置失败:', err);
      return [];
    }
  },

  /**
   * 获取单个功能
   * @param {string} id 功能ID
   * @returns {Promise<object>} 功能对象
   */
  async getFeature(id) {
    return new Promise((resolve, reject) => {
      this.db.features.findOne({ _id: id }, (err, doc) => {
        if (err) return reject(err);
        resolve(doc);
      });
    });
  },

  /**
   * 创建新功能
   * @param {object} feature 功能对象
   * @returns {Promise<object>} 创建后的功能对象
   */
  async createFeature(feature) {
    const now = new Date();
    const newFeature = {
      ...feature,
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      this.db.features.insert(newFeature, (err, doc) => {
        if (err) return reject(err);
        resolve(doc);
      });
    });
  },

  /**
   * 更新功能
   * @param {string} id 功能ID
   * @param {object} update 要更新的字段
   * @returns {Promise<object>} 更新后的功能对象
   */
  async updateFeature(id, update) {
    const updateObj = {
      ...update,
      updatedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      this.db.features.update(
        { _id: id },
        { $set: updateObj },
        { returnUpdatedDocs: true },
        (err, numAffected, affectedDocuments) => {
          if (err) return reject(err);
          resolve(affectedDocuments);
        }
      );
    });
  },

  /**
   * 删除功能
   * @param {string} id 功能ID
   * @returns {Promise<number>} 影响的行数
   */
  async deleteFeature(id) {
    // 首先删除该功能下的所有接口
    await this.deleteInterfacesByFeature(id);

    return new Promise((resolve, reject) => {
      this.db.features.remove({ _id: id }, {}, (err, numRemoved) => {
        if (err) return reject(err);
        resolve(numRemoved);
      });
    });
  },

  /**
   * 获取功能下的所有接口
   * @param {string} featureId 功能ID
   * @returns {Promise<Array>} 接口列表
   */
  async getInterfaces(featureId) {
    return new Promise((resolve, reject) => {
      this.db.interfaces.find({ featureId }).sort({ updatedAt: -1 }).exec((err, docs) => {
        if (err) return reject(err);
        resolve(docs);
      });
    });
  },

  /**
   * 获取所有启用的接口
   * @returns {Promise<Array>} 启用状态的接口列表
   */
  async getEnabledInterfaces() {
    const now = Date.now();
    
    // 如果缓存存在且未过期，直接返回缓存
    if (enabledInterfacesCache && (now - lastCacheTime < CACHE_TTL)) {
      return enabledInterfacesCache;
    }
    
    try {
      // 读取所有接口数据
      const data = await this.getInterfaces();
      this.log(`读取到接口数据: ${JSON.stringify(data.filter(item => item.enabled === true || item.active === true))}`);
      // 过滤出启用状态的接口
      const enabledInterfaces = data.filter(item => item.enabled === true || item.active === true);
      
      // 更新缓存
      enabledInterfacesCache = enabledInterfaces;
      lastCacheTime = now;
      
      return enabledInterfaces;
    } catch (err) {
      console.error('获取启用接口失败:', err);
      return [];
    }
  },

  /**
   * 使缓存失效，强制下次请求重新加载
   */
  invalidateCache() {
    enabledInterfacesCache = null;
    lastCacheTime = 0;
  },

  /**
   * 获取单个接口
   * @param {string} id 接口ID
   * @returns {Promise<object>} 接口对象
   */
  async getInterface(id) {
    return new Promise((resolve, reject) => {
      this.db.interfaces.findOne({ _id: id }, (err, doc) => {
        if (err) return reject(err);
        resolve(doc);
      });
    });
  },

  /**
   * 创建新接口
   * @param {object} interfaceObj 接口对象
   * @returns {Promise<object>} 创建后的接口对象
   */
  async createInterface(interfaceObj) {
    const now = new Date();
    const newInterface = {
      ...interfaceObj,
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      this.db.interfaces.insert(newInterface, (err, doc) => {
        if (err) return reject(err);
        resolve(doc);
      });
    });
  },

  /**
   * 更新接口
   * @param {string} id 接口ID
   * @param {object} update 要更新的字段
   * @returns {Promise<object>} 更新后的接口对象
   */
  async updateInterface(id, update) {
    const updateObj = {
      ...update,
      updatedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      this.db.interfaces.update(
        { _id: id },
        { $set: updateObj },
        { returnUpdatedDocs: true },
        (err, numAffected, affectedDocuments) => {
          if (err) return reject(err);
          resolve(affectedDocuments);
        }
      );
    });
  },

  /**
   * 删除接口
   * @param {string} id 接口ID
   * @returns {Promise<number>} 影响的行数
   */
  async deleteInterface(id) {
    return new Promise((resolve, reject) => {
      this.db.interfaces.remove({ _id: id }, {}, (err, numRemoved) => {
        if (err) return reject(err);
        resolve(numRemoved);
      });
    });
  },

  /**
   * 删除功能下的所有接口
   * @param {string} featureId 功能ID
   * @returns {Promise<number>} 影响的行数
   */
  async deleteInterfacesByFeature(featureId) {
    return new Promise((resolve, reject) => {
      this.db.interfaces.remove({ featureId }, { multi: true }, (err, numRemoved) => {
        if (err) return reject(err);
        resolve(numRemoved);
      });
    });
  },

  // 保存所有特性
  async saveFeatures(features) {
    try {
      this.log(`保存功能配置, 共 ${features.length} 个功能`);
      await fs.writeJson(this.featuresFile, { features }, { spaces: 2 });
      this.log('功能配置保存成功');
      return true;
    } catch (err) {
      this.log(`保存功能配置失败: ${err.message}`);
      console.error('保存功能配置失败:', err);
      return false;
    }
  },

  // 获取所有接口
  async getInterfaces() {
    try {
      this.log('尝试读取接口配置...');
      
      // 如果文件不存在，创建
      if (!fs.existsSync(this.interfacesFile)) {
        this.log(`接口配置文件不存在，创建空文件`);
        fs.writeJsonSync(this.interfacesFile, { interfaces: [] }, { spaces: 2 });
      }

      const data = await fs.readJson(this.interfacesFile);
      this.log(`成功读取接口配置, 发现 ${data.interfaces ? data.interfaces.length : 0} 个接口`);
      return data.interfaces || [];
    } catch (err) {
      this.log(`读取接口配置失败: ${err.message}`);
      console.error('读取接口配置失败:', err);
      return [];
    }
  },

  // 保存所有接口
  async saveInterfaces(interfaces) {
    try {
      this.log(`保存接口配置, 共 ${interfaces.length} 个接口`);
      await fs.writeJson(this.interfacesFile, { interfaces }, { spaces: 2 });
      this.log('接口配置保存成功');
      return true;
    } catch (err) {
      this.log(`保存接口配置失败: ${err.message}`);
      console.error('保存接口配置失败:', err);
      return false;
    }
  },

  /**
   * 获取所有启用的特性
   * @returns {Promise<Array>} 启用的特性列表
   */
  async getEnabledFeatures() {
    try {
      const features = await this.getFeatures();
      // 确保features是数组
      if (!Array.isArray(features)) {
        this.log(`获取启用的功能失败: features不是数组`);
        return [];
      }
      
      const enabledFeatures = features.filter(feature => feature && typeof feature === 'object' && feature.active);
      this.log(`获取启用的功能, 共 ${enabledFeatures.length} 个`);
      return enabledFeatures;
    } catch (err) {
      this.log(`获取启用的功能失败: ${err.message}`);
      console.error('获取启用的功能失败:', err);
      return [];
    }
  }
};

module.exports = dataManager; 