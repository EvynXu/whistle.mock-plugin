const fs = require('fs-extra');
const path = require('path');
const storage = require('./lib/storage');
const dataManager = require('./lib/dataManager');
const ruleManager = require('./lib/ruleManager');

module.exports = options => {
  const baseDir = process.env.WHISTLE_PLUGIN_DATA_DIR || storage.DATA_DIR;
  
  // 初始化数据目录
  if (!fs.existsSync(baseDir)) {
    fs.ensureDirSync(baseDir);
  }
  
  // 初始化数据管理器
  dataManager.init({
    baseDir,
    log: (message) => console.log(`[whistle.mock-plugin] ${message}`)
  });
  
  // 初始化规则管理器
  ruleManager.init({
    server: null, // 将在具体server创建时赋值
    config: {
      baseDir
    },
    dataManager,
    log: (message) => console.log(`[whistle.mock-plugin] ${message}`)
  });
  
  console.log('[whistle.mock-plugin] 插件初始化完成');
}; 