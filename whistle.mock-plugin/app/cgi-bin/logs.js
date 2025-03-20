const fs = require('fs-extra');
const path = require('path');

module.exports = function(req, res) {
  const dataDir = this.dataDir;
  const logsFile = path.join(dataDir, 'logs.json');
  
  // 处理GET请求 - 获取日志
  if (req.method === 'GET') {
    try {
      // 解析查询参数
      const limit = parseInt(req.query.limit) || 100;
      const type = req.query.type || '';
      const keyword = req.query.keyword || '';
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;
      
      // 确保日志文件存在
      if (!fs.existsSync(logsFile)) {
        fs.writeJsonSync(logsFile, { logs: [] }, { spaces: 2 });
        return res.json({
          code: 0,
          message: '成功',
          data: {
            logs: [],
            total: 0,
            page: 1,
            pageSize: pageSize,
            totalPages: 0
          }
        });
      }
      
      // 读取日志
      const logsData = fs.readJsonSync(logsFile);
      
      // 确保日志结构正确
      if (!logsData || !logsData.logs || !Array.isArray(logsData.logs)) {
        logsData.logs = [];
      }
      
      // 标准化日志格式，确保每个日志项都有正确的字段
      let logs = logsData.logs.map(log => {
        if (!log) return null;
        
        // 标准化事件类型字段，确保兼容前端过滤
        // 将type转换为eventType确保前端能够正确过滤
        return {
          id: log.id || Date.now().toString(),
          timestamp: log.timestamp || new Date().toISOString(),
          eventType: log.eventType || log.type || 'unknown',
          type: log.type || log.eventType || 'unknown',
          method: log.method || '',
          url: log.url || '',
          status: log.status || '',
          message: log.message || '',
          pattern: log.pattern || '',
          ...log // 保留原有其他字段
        };
      }).filter(Boolean); // 过滤掉null
      
      // 根据类型过滤
      if (type && type !== 'all') {
        try {
          logs = logs.filter(log => 
            log && (log.eventType === type || log.type === type)
          );
        } catch (err) {
          console.error('按类型过滤日志失败:', err);
          // 出错时不过滤
        }
      }
      
      // 根据关键词过滤
      if (keyword) {
        try {
          logs = logs.filter(log => {
            if (!log) return false;
            
            // 检查关键字段是否包含关键词
            const url = (log.url || '').toLowerCase();
            const pattern = (log.pattern || '').toLowerCase();
            const message = (log.message || '').toLowerCase();
            const lowercaseKeyword = keyword.toLowerCase();
            
            return url.includes(lowercaseKeyword) || 
                   pattern.includes(lowercaseKeyword) || 
                   message.includes(lowercaseKeyword);
          });
        } catch (err) {
          console.error('按关键词过滤日志失败:', err);
          // 出错时不过滤
        }
      }
      
      // 计算总记录数和总页数
      const total = logs.length;
      const totalPages = Math.ceil(total / pageSize);
      
      // 分页
      const startIndex = (page - 1) * pageSize;
      const pagedLogs = logs.slice(startIndex, startIndex + pageSize);
      
      return res.json({
        code: 0,
        message: '成功',
        data: {
          logs: pagedLogs,
          total: total,
          page: page,
          pageSize: pageSize,
          totalPages: totalPages
        }
      });
    } catch (err) {
      console.error('获取日志失败:', err);
      return res.status(500).json({
        code: 500,
        message: '获取日志失败: ' + err.message,
        data: null
      });
    }
  }
  
  // 处理DELETE请求 - 清空日志
  if (req.method === 'DELETE') {
    try {
      fs.writeJsonSync(logsFile, { logs: [] }, { spaces: 2 });
      
      return res.json({
        code: 0,
        message: '日志已清空',
        data: null
      });
    } catch (err) {
      console.error('清空日志失败:', err);
      return res.status(500).json({
        code: 500,
        message: '清空日志失败: ' + err.message,
        data: null
      });
    }
  }
  
  // 其他请求方法
  return res.status(405).json({
    code: 405,
    message: '不支持的请求方法',
    data: null
  });
}; 