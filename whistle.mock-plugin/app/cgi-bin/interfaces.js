const fs = require('fs-extra');
const path = require('path');

module.exports = function(req, res) {
  const dataDir = this.dataDir;
  const interfacesFile = path.join(dataDir, 'interfaces.json');
  const featuresFile = path.join(dataDir, 'features.json');
  
  try {
    // 确保配置文件存在并包含有效结构
    if (!fs.existsSync(interfacesFile)) {
      fs.writeJsonSync(interfacesFile, { interfaces: [] }, { spaces: 2 });
    } else {
      // 验证文件结构
      try {
        const fileData = fs.readJsonSync(interfacesFile);
        if (!fileData || !fileData.interfaces) {
          // 如果文件存在但结构无效，重新初始化
          fs.writeJsonSync(interfacesFile, { interfaces: [] }, { spaces: 2 });
          console.log('修复了损坏的interfaces文件结构');
        }
      } catch (e) {
        // JSON解析错误时重新初始化文件
        fs.writeJsonSync(interfacesFile, { interfaces: [] }, { spaces: 2 });
        console.log('修复了无法解析的interfaces文件');
      }
    }
    
    // 处理GET请求 - 获取接口列表
    if (req.method === 'GET') {
      const { featureId } = req.query;
      
      if (!featureId) {
        return res.status(400).json({
          code: 400,
          message: '功能ID不能为空',
          data: null
        });
      }
      
      // 检查功能是否存在
      let featureExists = false;
      if (fs.existsSync(featuresFile)) {
        try {
          const featuresData = fs.readJsonSync(featuresFile);
          if (featuresData && featuresData.features) {
            const feature = featuresData.features.find(item => item.id === featureId);
            featureExists = !!feature;
          }
          
          if (!featureExists) {
            return res.status(404).json({
              code: 404,
              message: '功能模块不存在',
              data: null
            });
          }
        } catch (err) {
          console.error('读取功能文件错误:', err);
          // 出错时继续处理
        }
      }
      
      // 读取接口数据
      let interfacesData;
      try {
        interfacesData = fs.readJsonSync(interfacesFile);
        if (!interfacesData || !interfacesData.interfaces) {
          interfacesData = { interfaces: [] };
        }
      } catch (err) {
        console.error('读取接口列表错误:', err);
        interfacesData = { interfaces: [] };
      }
      
      const filteredInterfaces = interfacesData.interfaces.filter(item => item.featureId === featureId);
      
      console.log('GET获取接口列表:', {
        featureId,
        totalCount: filteredInterfaces.length,
        interfacesWithResponses: filteredInterfaces.map(item => ({
          name: item.name,
          hasResponses: !!item.responses,
          responsesCount: item.responses ? item.responses.length : 0,
          activeResponseId: item.activeResponseId
        }))
      });
      
      return res.json({
        code: 0,
        message: '成功',
        data: filteredInterfaces
      });
    }
    
    // 处理POST请求 - 添加或更新接口
    if (req.method === 'POST') {
      const interfaceData = req.body;
      
      // 参数验证
      if (!interfaceData.featureId) {
        return res.status(400).json({
          code: 400,
          message: '功能ID不能为空',
          data: null
        });
      }
      
      if (!interfaceData.name) {
        return res.status(400).json({
          code: 400,
          message: '接口名称不能为空',
          data: null
        });
      }
      
      if (!interfaceData.urlPattern) {
        return res.status(400).json({
          code: 400,
          message: 'URL匹配规则不能为空',
          data: null
        });
      }
      
      // 检查是否响应内容过大，超过100MB时给予特殊处理
      if (interfaceData.responseContent && Buffer.byteLength(interfaceData.responseContent, 'utf8') > 100 * 1024 * 1024) {
        return res.status(413).json({
          code: 413,
          message: '响应内容过大，超过100MB限制',
          data: null
        });
      }
      
      // 检查功能是否存在
      let featureExists = false;
      if (fs.existsSync(featuresFile)) {
        try {
          const featuresData = fs.readJsonSync(featuresFile);
          if (featuresData && featuresData.features) {
            const feature = featuresData.features.find(item => item.id === interfaceData.featureId);
            featureExists = !!feature;
          }
          
          if (!featureExists) {
            return res.status(404).json({
              code: 404,
              message: '功能模块不存在',
              data: null
            });
          }
        } catch (err) {
          console.error('读取功能文件错误:', err);
          // 忽略错误继续处理
        }
      }
      
      // 读取接口数据
      let interfacesData;
      try {
        interfacesData = fs.readJsonSync(interfacesFile);
        if (!interfacesData || !interfacesData.interfaces) {
          interfacesData = { interfaces: [] };
        }
      } catch (err) {
        console.error('读取接口列表错误:', err);
        interfacesData = { interfaces: [] };
      }
      
      // 如果有ID则更新，否则创建新接口
      if (interfaceData.id) {
        // 更新现有接口
        const index = interfacesData.interfaces.findIndex(item => item.id === interfaceData.id);
        
        if (index === -1) {
          return res.status(404).json({
            code: 404,
            message: '接口不存在',
            data: null
          });
        }
        
        // 更新接口
        interfacesData.interfaces[index] = {
          ...interfacesData.interfaces[index],
          name: interfaceData.name,
          urlPattern: interfaceData.urlPattern,
          proxyType: interfaceData.proxyType,
          responseContent: interfaceData.responseContent,
          responses: interfaceData.responses || interfacesData.interfaces[index].responses || [],
          activeResponseId: interfaceData.activeResponseId !== undefined ? interfaceData.activeResponseId : interfacesData.interfaces[index].activeResponseId,
          targetUrl: interfaceData.targetUrl,
          customHeaders: interfaceData.customHeaders || {},
          filePath: interfaceData.filePath,
          httpStatus: interfaceData.httpStatus || 200,
          responseDelay: interfaceData.responseDelay || 0,
          httpMethod: interfaceData.httpMethod || 'ALL',
          active: interfaceData.active !== false
        };
        
        console.log('更新接口，包含多响应数据:', {
          name: interfacesData.interfaces[index].name,
          responsesCount: interfacesData.interfaces[index].responses.length,
          activeResponseId: interfacesData.interfaces[index].activeResponseId
        });
        
        fs.writeJsonSync(interfacesFile, interfacesData, { spaces: 2 });
        
        return res.json({
          code: 0,
          message: '接口更新成功',
          data: interfacesData.interfaces[index]
        });
      } else {
        // 创建新接口
        const newInterface = {
          id: Date.now().toString(),
          featureId: interfaceData.featureId,
          name: interfaceData.name,
          urlPattern: interfaceData.urlPattern,
          proxyType: interfaceData.proxyType || 'response',
          responseContent: interfaceData.responseContent || '',
          responses: interfaceData.responses || [],
          activeResponseId: interfaceData.activeResponseId || null,
          targetUrl: interfaceData.targetUrl || '',
          customHeaders: interfaceData.customHeaders || {},
          filePath: interfaceData.filePath || '',
          httpStatus: interfaceData.httpStatus || 200,
          responseDelay: interfaceData.responseDelay || 0,
          httpMethod: interfaceData.httpMethod || 'ALL',
          active: interfaceData.active !== false,
          contentType: interfaceData.contentType || 'text/plain'
        };
        
        console.log('创建新接口，包含多响应数据:', {
          name: newInterface.name,
          responsesCount: newInterface.responses.length,
          activeResponseId: newInterface.activeResponseId
        });
        
        // 确保interfaces数组存在
        if (!Array.isArray(interfacesData.interfaces)) {
          interfacesData.interfaces = [];
        }
        
        interfacesData.interfaces.push(newInterface);
        fs.writeJsonSync(interfacesFile, interfacesData, { spaces: 2 });
        
        return res.json({
          code: 0,
          message: '接口创建成功',
          data: newInterface
        });
      }
    }
    
    // 处理DELETE请求 - 删除接口
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({
          code: 400,
          message: '接口ID不能为空',
          data: null
        });
      }
      
      let interfacesData;
      try {
        interfacesData = fs.readJsonSync(interfacesFile);
        if (!interfacesData || !interfacesData.interfaces) {
          interfacesData = { interfaces: [] };
        }
      } catch (err) {
        console.error('读取接口列表错误:', err);
        interfacesData = { interfaces: [] };
      }
      
      const index = interfacesData.interfaces.findIndex(item => item.id === id);
      
      if (index === -1) {
        return res.status(404).json({
          code: 404,
          message: '接口不存在',
          data: null
        });
      }
      
      // 删除接口
      const deletedInterface = interfacesData.interfaces.splice(index, 1)[0];
      fs.writeJsonSync(interfacesFile, interfacesData, { spaces: 2 });
      
      return res.json({
        code: 0,
        message: '接口删除成功',
        data: deletedInterface
      });
    }
    
    // 处理 PUT 请求 - 更新接口
    if (req.method === 'PUT') {
      const { id } = req.query;
      const interfaceData = req.body;
      
      if (!id) {
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
          interfacesData = { interfaces: [] };
        }
      } catch (err) {
        console.error('读取接口列表错误:', err);
        return res.status(500).json({
          code: 500, 
          message: '读取接口数据失败',
          data: null
        });
      }
      
      // 查找并更新接口
      const index = interfacesData.interfaces.findIndex(item => item.id === id);
      
      if (index === -1) {
        return res.status(404).json({
          code: 404,
          message: '接口不存在',
          data: null
        });
      }
      
      // 更新接口数据
      const updatedInterface = {
        ...interfacesData.interfaces[index],
        name: interfaceData.name || interfacesData.interfaces[index].name,
        urlPattern: interfaceData.urlPattern || interfacesData.interfaces[index].urlPattern,
        proxyType: interfaceData.proxyType || interfacesData.interfaces[index].proxyType,
        responseContent: interfaceData.responseContent !== undefined ? interfaceData.responseContent : interfacesData.interfaces[index].responseContent,
        responses: interfaceData.responses !== undefined ? interfaceData.responses : (interfacesData.interfaces[index].responses || []),
        activeResponseId: interfaceData.activeResponseId !== undefined ? interfaceData.activeResponseId : interfacesData.interfaces[index].activeResponseId,
        targetUrl: interfaceData.targetUrl !== undefined ? interfaceData.targetUrl : interfacesData.interfaces[index].targetUrl,
        customHeaders: interfaceData.customHeaders !== undefined ? interfaceData.customHeaders : interfacesData.interfaces[index].customHeaders || {},
        filePath: interfaceData.filePath !== undefined ? interfaceData.filePath : interfacesData.interfaces[index].filePath,
        httpStatus: interfaceData.httpStatus || interfacesData.interfaces[index].httpStatus,
        responseDelay: interfaceData.responseDelay !== undefined ? interfaceData.responseDelay : interfacesData.interfaces[index].responseDelay,
        httpMethod: interfaceData.httpMethod || interfacesData.interfaces[index].httpMethod,
        active: interfaceData.active !== undefined ? interfaceData.active : interfacesData.interfaces[index].active,
        contentType: interfaceData.contentType || interfacesData.interfaces[index].contentType,
        updatedAt: new Date().toISOString()
      };
      
      console.log('PUT更新接口，包含多响应数据:', {
        name: updatedInterface.name,
        responsesCount: updatedInterface.responses.length,
        activeResponseId: updatedInterface.activeResponseId
      });
      
      interfacesData.interfaces[index] = updatedInterface;
      fs.writeJsonSync(interfacesFile, interfacesData, { spaces: 2 });
      
      return res.json({
        code: 0,
        message: '接口更新成功',
        data: updatedInterface
      });
    }
    
    // 处理 PATCH 请求 - 部分更新接口（如启用/禁用状态）
    if (req.method === 'PATCH') {
      const { id } = req.query;
      const patchData = req.body;
      
      if (!id) {
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
          interfacesData = { interfaces: [] };
        }
      } catch (err) {
        console.error('读取接口列表错误:', err);
        return res.status(500).json({
          code: 500, 
          message: '读取接口数据失败',
          data: null
        });
      }
      
      // 查找接口
      const index = interfacesData.interfaces.findIndex(item => item.id === id);
      
      if (index === -1) {
        return res.status(404).json({
          code: 404,
          message: '接口不存在',
          data: null
        });
      }
      
      // 部分更新接口数据
      const updatedInterface = {
        ...interfacesData.interfaces[index],
        ...patchData,
        updatedAt: new Date().toISOString()
      };
      
      interfacesData.interfaces[index] = updatedInterface;
      fs.writeJsonSync(interfacesFile, interfacesData, { spaces: 2 });
      
      return res.json({
        code: 0,
        message: '接口更新成功',
        data: updatedInterface
      });
    }
    
    // 其他请求方法
    return res.status(405).json({
      code: 405,
      message: '不支持的请求方法',
      data: null
    });
  } catch (err) {
    console.error('处理接口请求出错:', err);
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误: ' + err.message,
      data: null
    });
  }
}; 