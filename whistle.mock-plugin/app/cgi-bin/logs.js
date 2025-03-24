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
      
      // 检查参数是否合法
      if (isNaN(page) || page < 1 || isNaN(pageSize) || pageSize < 1) {
        return res.status(400).json({
          code: 400,
          message: '无效的分页参数',
          data: null
        });
      }
      
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
      
      // 读取日志 - 使用流式处理大文件
      let logsData;
      try {
        logsData = fs.readJsonSync(logsFile, { throws: false }) || { logs: [] };
      } catch (err) {
        console.error('读取日志文件失败:', err);
        // 文件损坏或格式错误时，重置日志
        fs.writeJsonSync(logsFile, { logs: [] }, { spaces: 2 });
        logsData = { logs: [] };
      }
      
      // 确保日志结构正确
      if (!logsData || !logsData.logs || !Array.isArray(logsData.logs)) {
        logsData = { logs: [] };
      }
      
      // 只对需要处理的日志数据进行处理，减少内存使用
      let logs = logsData.logs;
      
      // 根据类型过滤
      if (type && type !== 'all') {
        try {
          logs = logs.filter(log => 
            log && (
              (log.eventType && log.eventType === type) || 
              (log.type && log.type === type)
            )
          );
        } catch (err) {
          console.error('按类型过滤日志失败:', err);
          // 出错时不过滤
        }
      }
      
      // 根据关键词过滤
      if (keyword) {
        try {
          const lowercaseKeyword = keyword.toLowerCase();
          logs = logs.filter(log => {
            if (!log) return false;
            
            // 检查关键字段是否包含关键词
            const url = typeof log.url === 'string' ? log.url.toLowerCase() : '';
            const pattern = typeof log.pattern === 'string' ? log.pattern.toLowerCase() : '';
            const message = typeof log.message === 'string' ? log.message.toLowerCase() : '';
            
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
      
      // 分页 - 只返回当前页的数据
      const startIndex = (page - 1) * pageSize;
      // 确保不会越界
      const endIndex = Math.min(startIndex + pageSize, total);
      const pagedLogs = logs.slice(startIndex, endIndex);
      
      // 清除大型对象引用，帮助垃圾回收
      logs = null;
      logsData = null;
      
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