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

// 初始化路由
const initRouter = () => {
  const router = express.Router();
  
  // 解析 JSON 请求体
  router.use(express.json());
  
  // 获取所有接口
  router.get('/interfaces', (req, res) => {
    try {
      // 读取所有功能
      const featuresFile = path.join(DATA_DIR, 'features.json');
      if (!fs.existsSync(featuresFile)) {
        return res.json([]);
      }
      
      const features = fs.readJsonSync(featuresFile);
      let allInterfaces = [];
      
      // 读取每个功能的接口
      features.forEach(feature => {
        const interfacesFile = path.join(DATA_DIR, `interfaces-${feature.id}.json`);
        if (fs.existsSync(interfacesFile)) {
          const interfaces = fs.readJsonSync(interfacesFile);
          // 添加功能名称到接口数据中
          const interfacesWithFeature = interfaces.map(item => ({
            ...item,
            featureName: feature.name
          }));
          allInterfaces = allInterfaces.concat(interfacesWithFeature);
        }
      });
      
      res.json(allInterfaces);
    } catch (err) {
      console.error('获取接口列表失败:', err);
      res.status(500).json({ error: '获取接口列表失败' });
    }
  });
  
  // 获取单个接口
  router.get('/interfaces/:id', (req, res) => {
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
            foundInterface = {
              ...found,
              featureName: feature.name
            };
            break;
          }
        }
      }
      
      if (!foundInterface) {
        return res.status(404).json({ error: '接口不存在' });
      }
      
      res.json(foundInterface);
    } catch (err) {
      console.error('获取接口详情失败:', err);
      res.status(500).json({ error: '获取接口详情失败' });
    }
  });
  
  // 创建接口
  router.post('/interfaces', (req, res) => {
    try {
      const { featureId, path: interfacePath, method, status, delay, description, headers, responseBody } = req.body;
      
      if (!featureId || !interfacePath || !method) {
        return res.status(400).json({ error: '功能ID、路径和请求方法为必填项' });
      }
      
      // 检查功能是否存在
      const featuresFile = path.join(DATA_DIR, 'features.json');
      if (!fs.existsSync(featuresFile)) {
        return res.status(404).json({ error: '功能不存在' });
      }
      
      const features = fs.readJsonSync(featuresFile);
      const feature = features.find(f => f.id === featureId);
      if (!feature) {
        return res.status(404).json({ error: '功能不存在' });
      }
      
      // 读取接口列表
      const interfacesFile = path.join(DATA_DIR, `interfaces-${featureId}.json`);
      const interfaces = fs.existsSync(interfacesFile) 
        ? fs.readJsonSync(interfacesFile) 
        : [];
      
      // 创建新接口
      const newInterface = {
        id: uuidv4(),
        featureId,
        path: interfacePath,
        method,
        status: status || 200,
        delay: delay || 0,
        description: description || '',
        headers: headers || { 'Content-Type': 'application/json' },
        responseBody: responseBody || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      interfaces.push(newInterface);
      
      // 保存接口列表
      fs.writeJsonSync(interfacesFile, interfaces, { spaces: 2 });
      
      res.status(201).json(newInterface);
    } catch (err) {
      console.error('创建接口失败:', err);
      res.status(500).json({ error: '创建接口失败' });
    }
  });
  
  // 更新接口
  router.put('/interfaces/:id', (req, res) => {
    try {
      const { featureId, path: interfacePath, method, status, delay, description, headers, responseBody } = req.body;
      
      if (!featureId) {
        return res.status(400).json({ error: '功能ID为必填项' });
      }
      
      // 检查功能是否存在
      const featuresFile = path.join(DATA_DIR, 'features.json');
      if (!fs.existsSync(featuresFile)) {
        return res.status(404).json({ error: '功能不存在' });
      }
      
      const features = fs.readJsonSync(featuresFile);
      const feature = features.find(f => f.id === featureId);
      if (!feature) {
        return res.status(404).json({ error: '功能不存在' });
      }
      
      // 读取接口列表
      const interfacesFile = path.join(DATA_DIR, `interfaces-${featureId}.json`);
      if (!fs.existsSync(interfacesFile)) {
        return res.status(404).json({ error: '接口不存在' });
      }
      
      const interfaces = fs.readJsonSync(interfacesFile);
      const index = interfaces.findIndex(item => item.id === req.params.id);
      
      if (index === -1) {
        return res.status(404).json({ error: '接口不存在' });
      }
      
      // 更新接口
      const updatedInterface = {
        ...interfaces[index],
        featureId,
        path: interfacePath !== undefined ? interfacePath : interfaces[index].path,
        method: method !== undefined ? method : interfaces[index].method,
        status: status !== undefined ? status : interfaces[index].status,
        delay: delay !== undefined ? delay : interfaces[index].delay,
        description: description !== undefined ? description : interfaces[index].description,
        headers: headers !== undefined ? headers : interfaces[index].headers,
        responseBody: responseBody !== undefined ? responseBody : interfaces[index].responseBody,
        updatedAt: new Date().toISOString()
      };
      
      interfaces[index] = updatedInterface;
      
      // 保存接口列表
      fs.writeJsonSync(interfacesFile, interfaces, { spaces: 2 });
      
      res.json(updatedInterface);
    } catch (err) {
      console.error('更新接口失败:', err);
      res.status(500).json({ error: '更新接口失败' });
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