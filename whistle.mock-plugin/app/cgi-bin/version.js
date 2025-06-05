const fs = require('fs-extra');
const path = require('path');

module.exports = function(req, res) {
  try {
    const versionPath = path.join(__dirname, '../..', 'VERSION.md');
    
    if (!fs.existsSync(versionPath)) {
      return res.json({
        code: 1,
        message: '版本文件不存在',
        data: null
      });
    }
    
    const content = fs.readFileSync(versionPath, 'utf-8');
    const stats = fs.statSync(versionPath);
    
    res.json({
      code: 0,
      message: '成功',
      data: {
        path: 'VERSION.md',
        name: 'VERSION.md',
        content,
        size: stats.size,
        mtime: stats.mtime,
        isDirectory: false
      }
    });
  } catch (err) {
    console.error('获取版本信息失败:', err);
    res.json({
      code: 1,
      message: '获取版本信息失败: ' + err.message,
      data: null
    });
  }
}; 