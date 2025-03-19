const fs = require('fs-extra');
const path = require('path');
const Mock = require('mockjs');

module.exports = async function(req, res) {
  const dataDir = this.dataDir;
  const interfacesFile = path.join(dataDir, 'interfaces.json');
  const featuresFile = path.join(dataDir, 'features.json');
  
  // 添加日志记录函数
  const recordLog = async (logData) => {
    try {
      const logsFile = path.join(dataDir, 'logs.json');
      
      // 确保日志文件存在
      if (!fs.existsSync(logsFile)) {
        fs.writeJsonSync(logsFile, { logs: [] }, { spaces: 2 });
      }
      
      // 读取现有日志
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
        ...logData,
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
    } catch (err) {
      console.error('记录日志失败:', err);
    }
  };
  
  try {
    // 只处理 POST 请求
    if (req.method === 'POST') {
      const { url, interfaceId } = req.body;
      
      // 参数验证
      if (!url) {
        return res.status(400).json({
          code: 400,
          message: '测试URL不能为空',
          data: null
        });
      }
      
      if (!interfaceId) {
        return res.status(400).json({
          code: 400,
          message: '接口ID不能为空',
          data: null
        });
      }
      
      // 读取接口数据
      let interfacesData;
      try {
        interfacesData = fs.readJsonSync(interfacesFile);
        if (!interfacesData || !interfacesData.interfaces) {
          // 记录错误日志
          recordLog({
            eventType: 'error',
            status: 'error',
            url,
            message: '未找到接口数据文件或接口数据为空',
            errorType: 'DATA_NOT_FOUND'
          });
          
          return res.status(404).json({
            code: 404,
            message: '未找到接口数据',
            data: null
          });
        }
      } catch (err) {
        console.error('读取接口列表错误:', err);
        
        // 记录错误日志
        recordLog({
          eventType: 'error',
          status: 'error',
          url,
          message: '读取接口数据失败: ' + err.message,
          errorType: 'READ_ERROR'
        });
        
        return res.status(500).json({
          code: 500,
          message: '读取接口数据失败',
          data: null
        });
      }
      
      // 查找指定接口
      const targetInterface = interfacesData.interfaces.find(item => item.id === interfaceId);
      
      if (!targetInterface) {
        // 记录错误日志
        recordLog({
          eventType: 'error',
          status: 'error',
          url,
          message: '指定的接口不存在',
          interfaceId,
          errorType: 'INTERFACE_NOT_FOUND'
        });
        
        return res.status(404).json({
          code: 404,
          message: '指定的接口不存在',
          data: null
        });
      }
      
      // 检查接口是否已禁用
      if (targetInterface.active === false) {
        // 记录警告日志
        recordLog({
          eventType: 'match',
          status: 'disabled',
          url,
          pattern: targetInterface.urlPattern,
          interfaceId: targetInterface.id,
          interfaceName: targetInterface.name,
          message: '接口已禁用，无法测试'
        });
        
        return res.status(400).json({
          code: 400,
          message: '接口已禁用，无法测试',
          data: null
        });
      }
      
      // 检查功能模块是否已禁用
      try {
        const featuresData = fs.readJsonSync(featuresFile);
        
        if (featuresData && featuresData.features) {
          const featureItem = featuresData.features.find(item => item.id === targetInterface.featureId);
          
          if (featureItem && featureItem.active === false) {
            // 记录警告日志
            recordLog({
              eventType: 'match',
              status: 'disabled',
              url,
              pattern: targetInterface.urlPattern,
              interfaceId: targetInterface.id,
              interfaceName: targetInterface.name,
              featureId: featureItem.id,
              featureName: featureItem.name,
              message: '所属功能模块已禁用，接口无法使用'
            });
            
            return res.status(400).json({
              code: 400,
              message: '所属功能模块已禁用，接口无法使用',
              data: null
            });
          }
        }
      } catch (err) {
        console.error('读取功能模块数据失败:', err);
      }
      
      const startTime = Date.now();
      
      // 处理内容，支持 Mock.js 模板语法
      let responseBody = targetInterface.responseContent;
      
      try {
        // 如果响应内容是JSON，则尝试应用Mock.js模板
        if (targetInterface.contentType && targetInterface.contentType.includes('json')) {
          // 尝试解析JSON
          const jsonTemplate = JSON.parse(responseBody);
          // 使用Mock.js生成随机数据
          const mockData = Mock.mock(jsonTemplate);
          // 将结果转换回字符串
          responseBody = JSON.stringify(mockData);
        }
      } catch (err) {
        console.error('处理Mock数据失败:', err);
        // 如果Mock失败，使用原始内容
      }
      
      // 模拟接口处理延迟
      const delay = targetInterface.responseDelay || 0;
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 模拟接口处理
      const responseData = {
        statusCode: targetInterface.httpStatus || 200,
        contentType: targetInterface.contentType || 'application/json; charset=utf-8',
        responseBody: responseBody,
        mockInfo: {
          matchedPattern: targetInterface.urlPattern,
          requestMethod: targetInterface.httpMethod,
          delay: delay,
          duration: duration,
          timestamp: new Date().toISOString()
        }
      };
      
      // 记录成功日志
      recordLog({
        eventType: 'response',
        status: 'matched',
        url,
        pattern: targetInterface.urlPattern,
        interfaceId: targetInterface.id,
        interfaceName: targetInterface.name,
        featureId: targetInterface.featureId,
        statusCode: targetInterface.httpStatus,
        httpMethod: targetInterface.httpMethod,
        duration: duration,
        delay: delay,
        contentType: targetInterface.contentType
      });
      
      return res.json({
        code: 0,
        message: '成功',
        data: responseData
      });
    } else {
      // 记录错误日志
      recordLog({
        eventType: 'error',
        status: 'error',
        message: '不支持的请求方法: ' + req.method,
        errorType: 'METHOD_NOT_ALLOWED'
      });
      
      return res.status(405).json({
        code: 405,
        message: '不支持的请求方法',
        data: null
      });
    }
  } catch (error) {
    console.error('测试接口处理异常:', error);
    
    // 记录错误日志
    recordLog({
      eventType: 'error',
      status: 'error',
      url: req.body?.url,
      message: '内部服务器错误: ' + error.message,
      errorType: 'INTERNAL_ERROR',
      stack: error.stack
    });
    
    return res.status(500).json({
      code: 500,
      message: '内部服务器错误',
      data: null
    });
  }
}; 