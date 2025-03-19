const path = require('path');
const os = require('os');

/**
 * 存储路径配置
 */
module.exports = {
  // 数据存储目录
  DATA_DIR: path.join(os.homedir(), '.whistle-mock-plugin', 'data'),
  
  // 文件存储目录
  FILES_DIR: path.join(os.homedir(), '.whistle-mock-plugin', 'files'),
  
  // 日志存储目录
  LOGS_DIR: path.join(os.homedir(), '.whistle-mock-plugin', 'logs')
}; 