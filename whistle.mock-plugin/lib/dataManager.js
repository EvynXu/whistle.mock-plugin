/**
 * 数据管理模块，负责功能和接口数据的存储和检索
 */
const fs = require('fs-extra');
const path = require('path');
const storage = require('./storage');

const dataManager = {
  /**
   * 初始化数据管理器
   * @param {object} options 配置选项，包含 baseDir 和 log
   */
  init(options = {}) {
    this.baseDir = options.baseDir || storage.DATA_DIR;
    this.featuresFile = path.join(this.baseDir, 'features.json');
    this.interfacesFile = path.join(this.baseDir, 'interfaces.json');
    this.log = options.log || console.log;
    
    this.log(`数据管理器初始化, 基础目录: ${this.baseDir}`);
    this.log(`功能配置文件: ${this.featuresFile}`);
    this.log(`接口配置文件: ${this.interfacesFile}`);
    
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
    } catch (err) {
      this.log(`确保文件存在失败: ${err.message}`);
      console.error('确保文件存在失败:', err);
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
   * @returns {Promise<Array>} 接口列表
   */
  async getEnabledInterfaces() {
    try {
      this.log('获取所有启用的接口...');
      
      // 获取所有接口
      const interfaces = await this.getInterfaces();
      
      // 获取启用的功能
      const features = await this.getFeatures();
      const enabledFeatureIds = features
        .filter(feature => feature.active)
        .map(feature => feature.id);
      
      this.log(`发现 ${enabledFeatureIds.length} 个启用的功能`);
      
      // 过滤出启用功能中的启用接口
      const enabledInterfaces = interfaces.filter(
        intf => enabledFeatureIds.includes(intf.featureId) && intf.active
      );
      
      this.log(`找到 ${enabledInterfaces.length} 个启用的接口`);
      return enabledInterfaces;
    } catch (err) {
      this.log(`获取启用的接口失败: ${err.message}`);
      console.error('获取启用的接口失败:', err);
      return [];
    }
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

  // 获取所有启用的特性
  async getEnabledFeatures() {
    try {
      const features = await this.getFeatures();
      const enabledFeatures = features.filter(feature => feature.active);
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