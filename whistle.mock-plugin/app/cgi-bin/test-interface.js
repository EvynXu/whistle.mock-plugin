const fs = require('fs-extra');
const path = require('path');
const Mock = require('mockjs');

module.exports = async function(req, res) {
  const dataDir = this.dataDir;
  const interfacesFile = path.join(dataDir, 'interfaces.json');
  const featuresFile = path.join(dataDir, 'features.json');
  
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
          return res.status(404).json({
            code: 404,
            message: '未找到接口数据',
            data: null
          });
        }
      } catch (err) {
        return res.status(500).json({
          code: 500,
          message: '读取接口数据失败',
          data: null
        });
      }
      
      // 查找指定接口
      const targetInterface = interfacesData.interfaces.find(item => item.id === interfaceId);
      
      if (!targetInterface) {
        return res.status(404).json({
          code: 404,
          message: '指定的接口不存在',
          data: null
        });
      }
      
      // 检查接口是否已禁用
      if (targetInterface.active === false) {
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
            return res.status(400).json({
              code: 400,
              message: '所属功能模块已禁用，接口无法使用',
              data: null
            });
          }
        }
      } catch (err) {
        // 忽略读取错误，继续处理
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
      
      return res.json({
        code: 0,
        message: '成功',
        data: responseData
      });
    } else {
      // 不支持的请求方法
      return res.status(405).json({
        code: 405,
        message: '不支持的请求方法',
        data: null
      });
    }
  } catch (err) {
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误: ' + err.message,
      data: null
    });
  }
}; 