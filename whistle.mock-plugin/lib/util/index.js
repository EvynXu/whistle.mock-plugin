const fs = require('fs');
const path = require('path');

exports.noop = function() {};

// 格式化路径
exports.formatPath = function(filePath) {
  return filePath && filePath.replace(/\\/g, '/');
};

// 加载指定目录下的模块
exports.loadModulesSync = function(dir) {
  const modules = {};
  try {
    fs.readdirSync(dir).forEach(function(name) {
      if (!/^\./.test(name) && /\.js$/.test(name)) {
        const moduleName = exports.formatPath(path.join(dir, name));
        modules[moduleName.replace(/\.js$/, '')] = require(moduleName);
      }
    });
  } catch (e) {}
  
  return modules;
}; 