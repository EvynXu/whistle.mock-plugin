const fs = require('fs-extra');
const path = require('path');

module.exports = function(req, res) {
  const dataDir = this.dataDir;
  const featuresFile = path.join(dataDir, 'features.json');
  const interfacesFile = path.join(dataDir, 'interfaces.json');
  
  // 确保配置文件存在
  if (!fs.existsSync(featuresFile)) {
    fs.writeJsonSync(featuresFile, { features: [] }, { spaces: 2 });
  }
  if (!fs.existsSync(interfacesFile)) {
    fs.writeJsonSync(interfacesFile, { interfaces: [] }, { spaces: 2 });
  }
  
  res.json({
    code: 0,
    message: '成功',
    data: {
      version: '0.2.0',
      name: 'whistle.mock-plugin',
      features: [
        '支持Mock.js语法',
        '支持自定义响应头',
        '支持延迟响应',
        '支持条件匹配'
      ]
    }
  });
}; 