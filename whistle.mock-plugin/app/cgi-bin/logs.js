const fs = require('fs-extra');
const path = require('path');

module.exports = function(req, res) {
  const dataDir = this.dataDir;
  const logsFile = path.join(dataDir, 'logs.json');
  
  try {
    // 确保日志文件存在
    if (!fs.existsSync(logsFile)) {
      fs.writeJsonSync(logsFile, { logs: [] }, { spaces: 2 });
    }
    
    // 处理GET请求 - 获取所有日志
    if (req.method === 'GET') {
      let logsData;
      try {
        logsData = fs.readJsonSync(logsFile);
        if (!logsData.logs) {
          logsData = { logs: [] };
        }
      } catch (err) {
        console.error('读取日志文件错误:', err);
        logsData = { logs: [] };
      }
      
      // 查询参数处理
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 1000;
      const type = req.query.type || null;
      const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
      
      // 筛选日志
      let filteredLogs = logsData.logs;
      
      if (type) {
        filteredLogs = filteredLogs.filter(log => log.eventType === type);
      }
      
      if (startDate) {
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= startDate);
      }
      
      if (endDate) {
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= endDate);
      }
      
      // 限制数量并按时间倒序排序
      filteredLogs = filteredLogs
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
      
      return res.json({
        code: 0,
        message: '成功',
        data: filteredLogs
      });
    }
    
    // 处理DELETE请求 - 清空日志
    if (req.method === 'DELETE') {
      fs.writeJsonSync(logsFile, { logs: [] }, { spaces: 2 });
      
      return res.json({
        code: 0,
        message: '日志已清空',
        data: null
      });
    }
    
    // 处理POST请求 - 添加日志（内部使用）
    if (req.method === 'POST') {
      const logEntry = req.body;
      
      if (!logEntry) {
        return res.status(400).json({
          code: 400,
          message: '日志数据不能为空',
          data: null
        });
      }
      
      let logsData;
      try {
        logsData = fs.readJsonSync(logsFile);
        if (!logsData.logs) {
          logsData = { logs: [] };
        }
      } catch (err) {
        console.error('读取日志文件错误:', err);
        logsData = { logs: [] };
      }
      
      // 添加时间戳和ID
      const newLog = {
        ...logEntry,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      };
      
      // 添加新日志
      logsData.logs.unshift(newLog);
      
      // 限制日志数量，最多保留10000条
      if (logsData.logs.length > 10000) {
        logsData.logs = logsData.logs.slice(0, 10000);
      }
      
      fs.writeJsonSync(logsFile, logsData, { spaces: 2 });
      
      return res.json({
        code: 0,
        message: '日志添加成功',
        data: newLog
      });
    }
    
    // 其他请求方法
    return res.status(405).json({
      code: 405,
      message: '不支持的请求方法',
      data: null
    });
  } catch (err) {
    console.error('处理日志请求出错:', err);
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误: ' + err.message,
      data: null
    });
  }
}; 