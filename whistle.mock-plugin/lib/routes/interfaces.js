/**
 * 接口路由处理程序
 * 负责处理接口相关的 API 请求
 */
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Mock = require('mockjs');
const storage = require('../storage');

// 使用存储模块定义的数据目录
const DATA_DIR = storage.DATA_DIR;

// 确保数据目录存在
fs.ensureDirSync(DATA_DIR);

// 处理接口数据，确保兼容多响应格式
const processInterfaceData = (data) => {
  const result = { ...data };
  
  // 调试日志
  console.log('=== 开始处理接口数据 ===');
  console.log('原始数据:', JSON.stringify({
    name: result.name,
    hasResponses: !!result.responses,
    responsesType: typeof result.responses,
    responsesLength: result.responses ? result.responses.length : 0,
    responses: result.responses,
    responseContent: !!result.responseContent,
    activeResponseId: result.activeResponseId
  }, null, 2));
  
  // 处理 responses 数组
  if (result.responses && Array.isArray(result.responses) && result.responses.length > 0) {
    console.log('发现 responses 数组，直接处理多响应数据');
    
    // 确保每个响应都有合法的 id, name 和 content
    result.responses = result.responses.map((resp, index) => {
      console.log(`处理响应 ${index}:`, resp);
      
      if (!resp.id) {
        resp.id = Math.random().toString(36).substring(2, 15);
        console.log(`为响应 ${index} 添加 ID:`, resp.id);
      }
      if (!resp.name) {
        resp.name = `响应 ${index + 1}`;
        console.log(`为响应 ${index} 添加默认名称:`, resp.name);
      }
      
      const processedResp = {
        id: resp.id,
        name: resp.name,
        description: resp.description || '',
        content: resp.content || '{}'
      };
      
      console.log(`处理后的响应 ${index}:`, processedResp);
      return processedResp;
    });
    
    console.log('处理后的响应数组长度:', result.responses.length);
    console.log('所有处理后的响应:', result.responses);
    
    // 如果有响应但没有设置 activeResponseId，默认使用第一个
    if (!result.activeResponseId) {
      result.activeResponseId = result.responses[0].id;
      console.log('设置默认激活响应:', result.activeResponseId);
    }
    
    // 确保 responseContent 字段始终存在（向后兼容）
    const activeResponse = result.activeResponseId
      ? result.responses.find(r => r.id === result.activeResponseId)
      : result.responses[0];
      
    if (activeResponse) {
      result.responseContent = activeResponse.content;
      console.log('设置 responseContent 为当前激活响应内容');
    }
    
  } else if (result.responseContent) {
    // 如果没有提供 responses 但有 responseContent，创建默认响应（向后兼容）
    console.log('创建默认响应，因为没有 responses 数组但有 responseContent');
    result.responses = [{
      id: Math.random().toString(36).substring(2, 15),
      name: '默认响应',
      description: '',
      content: result.responseContent
    }];
    result.activeResponseId = result.responses[0].id;
    console.log('创建的默认响应:', result.responses[0]);
    
  } else {
    // 如果既没有 responses 也没有 responseContent，创建一个空的默认响应
    console.log('创建空的默认响应');
    result.responses = [{
      id: Math.random().toString(36).substring(2, 15),
      name: '默认响应',
      description: '',
      content: '{}'
    }];
    result.activeResponseId = result.responses[0].id;
    result.responseContent = '{}';
    console.log('创建的空默认响应:', result.responses[0]);
  }
  
  // 最终日志
  console.log('=== 处理后的最终接口数据 ===');
  console.log('最终数据:', JSON.stringify({
    name: result.name,
    responsesLength: result.responses.length,
    responses: result.responses,
    activeResponseId: result.activeResponseId,
    hasResponseContent: !!result.responseContent
  }, null, 2));
  console.log('=== 接口数据处理完成 ===\n');
  
  return result;
};

// 初始化路由
const initRouter = () => {
  const router = express.Router();
  
  // 解析 JSON 请求体
  router.use(express.json({ limit: '100mb' }));
  
  // 获取所有接口
  router.get('/interfaces', (req, res) => {
    try {
      const { featureId } = req.query;
      
      // 读取所有功能
      const featuresFile = path.join(DATA_DIR, 'features.json');
      if (!fs.existsSync(featuresFile)) {
        return res.json({ code: 0, data: [] });
      }
      
      const features = fs.readJsonSync(featuresFile);
      let allInterfaces = [];
      
      if (featureId) {
        // 获取特定功能的接口
        const interfacesFile = path.join(DATA_DIR, `interfaces-${featureId}.json`);
        if (fs.existsSync(interfacesFile)) {
          const interfaces = fs.readJsonSync(interfacesFile);
          console.log('=== 获取接口：从文件读取的原始数据 ===');
          console.log(`文件路径: ${interfacesFile}`);
          console.log('原始接口数据:', JSON.stringify(interfaces, null, 2));
          
          const processedInterfaces = interfaces.map((item, index) => {
            console.log(`=== 处理接口 ${index}: ${item.name} ===`);
            console.log('处理前的接口数据:', JSON.stringify(item, null, 2));
            
            // 确保每个接口都经过数据处理
            const processed = processInterfaceData(item);
            console.log('处理后的接口数据:', JSON.stringify(processed, null, 2));
            
            const feature = features.find(f => f.id === featureId);
            const result = {
              ...processed,
              featureName: feature ? feature.name : '未知功能'
            };
            
            console.log('最终接口数据:', JSON.stringify(result, null, 2));
            return result;
          });
          allInterfaces = processedInterfaces;
        }
      } else {
        // 读取每个功能的接口
        features.forEach(feature => {
          const interfacesFile = path.join(DATA_DIR, `interfaces-${feature.id}.json`);
          if (fs.existsSync(interfacesFile)) {
            const interfaces = fs.readJsonSync(interfacesFile);
            // 确保每个接口都经过数据处理
            const processedInterfaces = interfaces.map(item => {
              const processed = processInterfaceData(item);
              return {
                ...processed,
                featureName: feature.name
              };
            });
            allInterfaces = allInterfaces.concat(processedInterfaces);
          }
        });
      }
      
      console.log(`获取接口列表成功，共 ${allInterfaces.length} 个接口`);
      res.json({ code: 0, data: allInterfaces });
    } catch (err) {
      console.error('获取接口列表失败:', err);
      res.status(500).json({ code: 1, message: '获取接口列表失败: ' + err.message });
    }
  });
  
  // 获取单个接口
  router.get('/interfaces/:id', (req, res) => {
    try {
      // 读取所有功能
      const featuresFile = path.join(DATA_DIR, 'features.json');
      if (!fs.existsSync(featuresFile)) {
        return res.status(404).json({ code: 1, message: '接口不存在' });
      }
      
      const features = fs.readJsonSync(featuresFile);
      let foundInterface = null;
      
      // 在每个功能的接口中查找
      for (const feature of features) {
        const interfacesFile = path.join(DATA_DIR, `interfaces-${feature.id}.json`);
        if (fs.existsSync(interfacesFile)) {
          const interfaces = fs.readJsonSync(interfacesFile);
          const found = interfaces.find(item => item.id === req.params.id);
          if (found) {
            // 确保数据经过处理
            const processed = processInterfaceData(found);
            foundInterface = {
              ...processed,
              featureName: feature.name
            };
            break;
          }
        }
      }
      
      if (!foundInterface) {
        return res.status(404).json({ code: 1, message: '接口不存在' });
      }
      
      console.log(`获取接口详情成功: ${foundInterface.name}，响应数量: ${foundInterface.responses ? foundInterface.responses.length : 0}`);
      res.json({ code: 0, data: foundInterface });
    } catch (err) {
      console.error('获取接口详情失败:', err);
      res.status(500).json({ code: 1, message: '获取接口详情失败: ' + err.message });
    }
  });
  
  // 创建接口
  router.post('/interfaces', (req, res) => {
    try {
      const interfaceData = req.body;
      
      if (!interfaceData.featureId || !interfaceData.urlPattern) {
        return res.status(400).json({ 
          code: 1,
          message: '功能ID和URL匹配规则为必填项' 
        });
      }
      
      // 检查功能是否存在
      const featuresFile = path.join(DATA_DIR, 'features.json');
      if (!fs.existsSync(featuresFile)) {
        return res.status(404).json({ 
          code: 1,
          message: '功能不存在' 
        });
      }
      
      const features = fs.readJsonSync(featuresFile);
      const feature = features.find(f => f.id === interfaceData.featureId);
      if (!feature) {
        return res.status(404).json({ 
          code: 1,
          message: '功能不存在' 
        });
      }
      
      // 读取接口列表
      const interfacesFile = path.join(DATA_DIR, `interfaces-${interfaceData.featureId}.json`);
      const interfaces = fs.existsSync(interfacesFile) 
        ? fs.readJsonSync(interfacesFile) 
        : [];
      
      // 处理接口数据，确保兼容多响应格式
      console.log('=== 创建接口：开始处理数据 ===');
      console.log('接收到的接口数据:', JSON.stringify(interfaceData, null, 2));
      const processedData = processInterfaceData(interfaceData);
      console.log('处理后的接口数据:', JSON.stringify(processedData, null, 2));
      
      // 创建新接口
      const newInterface = {
        id: uuidv4(),
        ...processedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('=== 创建接口：准备保存的完整接口数据 ===');
      console.log('完整的新接口数据:', JSON.stringify(newInterface, null, 2));
      
      interfaces.push(newInterface);
      
      // 保存接口列表
      fs.writeJsonSync(interfacesFile, interfaces, { spaces: 2 });
      console.log('接口数据已保存到文件:', interfacesFile);
      
      // 验证保存后从文件读取的数据
      const savedInterfaces = fs.readJsonSync(interfacesFile);
      const savedInterface = savedInterfaces.find(item => item.id === newInterface.id);
      console.log('=== 创建接口：验证保存后的数据 ===');
      console.log('从文件读取的保存后数据:', JSON.stringify(savedInterface, null, 2));
      
      // 更新功能模块的接口数量
      const featureIndex = features.findIndex(f => f.id === interfaceData.featureId);
      features[featureIndex].interfaceCount = interfaces.length;
      features[featureIndex].updatedAt = new Date().toISOString();
      fs.writeJsonSync(featuresFile, features, { spaces: 2 });
      
      console.log('=== 创建接口：准备返回的数据 ===');
      console.log('返回给前端的数据:', JSON.stringify(newInterface, null, 2));
      
      res.json({
        code: 0,
        message: '接口创建成功',
        data: newInterface
      });
    } catch (err) {
      console.error('创建接口失败:', err);
      res.status(500).json({ 
        code: 1,
        message: '创建接口失败: ' + err.message 
      });
    }
  });
  
  // 更新接口
  router.put('/interfaces', (req, res) => {
    try {
      const { id } = req.query;
      const interfaceData = req.body;
      
      if (!id) {
        return res.status(400).json({ 
          code: 1,
          message: '接口ID为必填项' 
        });
      }
      
      if (!interfaceData.featureId) {
        return res.status(400).json({ 
          code: 1,
          message: '功能ID为必填项' 
        });
      }
      
      // 检查功能是否存在
      const featuresFile = path.join(DATA_DIR, 'features.json');
      if (!fs.existsSync(featuresFile)) {
        return res.status(404).json({ 
          code: 1,
          message: '功能不存在' 
        });
      }
      
      const features = fs.readJsonSync(featuresFile);
      const feature = features.find(f => f.id === interfaceData.featureId);
      if (!feature) {
        return res.status(404).json({ 
          code: 1,
          message: '功能不存在' 
        });
      }
      
      // 读取接口列表
      const interfacesFile = path.join(DATA_DIR, `interfaces-${interfaceData.featureId}.json`);
      if (!fs.existsSync(interfacesFile)) {
        return res.status(404).json({ 
          code: 1,
          message: '接口不存在' 
        });
      }
      
      const interfaces = fs.readJsonSync(interfacesFile);
      const index = interfaces.findIndex(item => item.id === id);
      
      if (index === -1) {
        return res.status(404).json({ 
          code: 1,
          message: '接口不存在' 
        });
      }
      
      // 处理接口数据，确保兼容多响应格式
      console.log('=== 更新接口：开始处理数据 ===');
      console.log('接收到的接口数据:', JSON.stringify(interfaceData, null, 2));
      const processedData = processInterfaceData(interfaceData);
      console.log('处理后的接口数据:', JSON.stringify(processedData, null, 2));
      
      // 更新接口
      const updatedInterface = {
        ...interfaces[index],
        ...processedData,
        updatedAt: new Date().toISOString()
      };
      
      console.log('=== 更新接口：准备保存的完整接口数据 ===');
      console.log('完整的更新接口数据:', JSON.stringify(updatedInterface, null, 2));
      
      interfaces[index] = updatedInterface;
      
      // 保存接口列表
      fs.writeJsonSync(interfacesFile, interfaces, { spaces: 2 });
      console.log('接口数据已保存到文件:', interfacesFile);
      
      // 验证保存后从文件读取的数据
      const savedInterfaces = fs.readJsonSync(interfacesFile);
      const savedInterface = savedInterfaces.find(item => item.id === id);
      console.log('=== 更新接口：验证保存后的数据 ===');
      console.log('从文件读取的保存后数据:', JSON.stringify(savedInterface, null, 2));
      
      console.log('=== 更新接口：准备返回的数据 ===');
      console.log('返回给前端的数据:', JSON.stringify(updatedInterface, null, 2));
      
      res.json({
        code: 0,
        message: '接口更新成功',
        data: updatedInterface
      });
    } catch (err) {
      console.error('更新接口失败:', err);
      res.status(500).json({ 
        code: 1,
        message: '更新接口失败: ' + err.message 
      });
    }
  });
  
  // 删除接口
  router.delete('/interfaces/:id', (req, res) => {
    try {
      // 读取所有功能
      const featuresFile = path.join(DATA_DIR, 'features.json');
      if (!fs.existsSync(featuresFile)) {
        return res.status(404).json({ error: '接口不存在' });
      }
      
      const features = fs.readJsonSync(featuresFile);
      let found = false;
      
      // 在每个功能的接口中查找并删除
      for (const feature of features) {
        const interfacesFile = path.join(DATA_DIR, `interfaces-${feature.id}.json`);
        if (fs.existsSync(interfacesFile)) {
          const interfaces = fs.readJsonSync(interfacesFile);
          const index = interfaces.findIndex(item => item.id === req.params.id);
          
          if (index !== -1) {
            interfaces.splice(index, 1);
            fs.writeJsonSync(interfacesFile, interfaces, { spaces: 2 });
            found = true;
            break;
          }
        }
      }
      
      if (!found) {
        return res.status(404).json({ error: '接口不存在' });
      }
      
      res.json({ success: true, message: '接口已删除' });
    } catch (err) {
      console.error('删除接口失败:', err);
      res.status(500).json({ error: '删除接口失败' });
    }
  });
  
  // 测试接口
  router.post('/interfaces/:id/test', (req, res) => {
    try {
      // 读取所有功能
      const featuresFile = path.join(DATA_DIR, 'features.json');
      if (!fs.existsSync(featuresFile)) {
        return res.status(404).json({ error: '接口不存在' });
      }
      
      const features = fs.readJsonSync(featuresFile);
      let foundInterface = null;
      
      // 在每个功能的接口中查找
      for (const feature of features) {
        const interfacesFile = path.join(DATA_DIR, `interfaces-${feature.id}.json`);
        if (fs.existsSync(interfacesFile)) {
          const interfaces = fs.readJsonSync(interfacesFile);
          const found = interfaces.find(item => item.id === req.params.id);
          if (found) {
            foundInterface = found;
            break;
          }
        }
      }
      
      if (!foundInterface) {
        return res.status(404).json({ error: '接口不存在' });
      }
      
      // 使用 Mock.js 生成响应数据
      let responseBody = foundInterface.responseBody;
      if (typeof responseBody === 'string') {
        try {
          responseBody = JSON.parse(responseBody);
        } catch (e) {
          return res.status(400).json({ error: '响应体JSON格式错误' });
        }
      }
      
      const mockData = Mock.mock(responseBody);
      
      res.json({
        original: foundInterface.responseBody,
        mocked: mockData
      });
    } catch (err) {
      console.error('测试接口失败:', err);
      res.status(500).json({ error: '测试接口失败' });
    }
  });
  
  return router;
};

module.exports = initRouter;