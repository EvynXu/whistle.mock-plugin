/**
 * 数据管理模块，负责功能和接口数据的存储和检索
 */
const dataManager = {
  /**
   * 初始化数据管理器
   * @param {object} db 数据库对象，包含 features 和 interfaces 两个集合
   */
  init(db) {
    this.db = db;
  },

  /**
   * 获取所有功能列表
   * @returns {Promise<Array>} 功能列表
   */
  async getFeatures() {
    return new Promise((resolve, reject) => {
      this.db.features.find({}).sort({ updatedAt: -1 }).exec((err, docs) => {
        if (err) return reject(err);
        resolve(docs);
      });
    });
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
    return new Promise((resolve, reject) => {
      // 查找所有启用的功能
      this.db.features.find({ enabled: true }, (err, features) => {
        if (err) return reject(err);

        if (!features || features.length === 0) {
          return resolve([]);
        }

        const featureIds = features.map(f => f._id);

        // 查找这些功能下启用的接口
        this.db.interfaces.find({ 
          featureId: { $in: featureIds },
          enabled: true
        }, (err, interfaces) => {
          if (err) return reject(err);
          resolve(interfaces);
        });
      });
    });
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
  }
};

module.exports = dataManager; 