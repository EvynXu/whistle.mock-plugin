const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const storage = require('../storage');

// 使用存储模块定义的数据目录
const DATA_DIR = storage.DATA_DIR;
const FEATURES_FILE = path.join(DATA_DIR, 'features.json');

// 确保数据目录存在
fs.ensureDirSync(DATA_DIR);

// 初始化数据文件
if (!fs.existsSync(FEATURES_FILE)) {
  fs.writeJsonSync(FEATURES_FILE, []);
}

// 读取功能数据
const getFeatures = () => {
  try {
    return fs.readJsonSync(FEATURES_FILE);
  } catch (err) {
    console.error('读取功能数据失败:', err);
    return [];
  }
};

// 保存功能数据
const saveFeatures = (features) => {
  try {
    fs.writeJsonSync(FEATURES_FILE, features, { spaces: 2 });
    return true;
  } catch (err) {
    console.error('保存功能数据失败:', err);
    return false;
  }
};

// 初始化路由
const initRouter = () => {
  const router = express.Router();
  
  // 解析 JSON 请求体
  router.use(express.json());
  
  // 获取所有功能
  router.get('/features', (req, res) => {
    try {
      const features = getFeatures();
      
      // 获取每个功能的接口数量
      const featuresWithCount = features.map(feature => {
        try {
          const interfacesFile = path.join(DATA_DIR, `interfaces-${feature.id}.json`);
          const interfaces = fs.existsSync(interfacesFile) 
            ? fs.readJsonSync(interfacesFile) 
            : [];
          
          return {
            ...feature,
            interfaceCount: interfaces.length
          };
        } catch (err) {
          console.error(`获取功能 ${feature.id} 的接口数量失败:`, err);
          return {
            ...feature,
            interfaceCount: 0
          };
        }
      });
      
      res.json(featuresWithCount);
    } catch (err) {
      console.error('获取功能列表失败:', err);
      res.status(500).json({ error: '获取功能列表失败' });
    }
  });
  
  // 获取单个功能
  router.get('/features/:id', (req, res) => {
    try {
      const features = getFeatures();
      const feature = features.find(f => f.id === req.params.id);
      
      if (!feature) {
        return res.status(404).json({ error: '功能不存在' });
      }
      
      res.json(feature);
    } catch (err) {
      console.error('获取功能详情失败:', err);
      res.status(500).json({ error: '获取功能详情失败' });
    }
  });
  
  // 创建功能
  router.post('/features', (req, res) => {
    try {
      const features = getFeatures();
      const newFeature = {
        id: uuidv4(),
        name: req.body.name,
        description: req.body.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      features.push(newFeature);
      
      if (!saveFeatures(features)) {
        return res.status(500).json({ error: '保存功能失败' });
      }
      
      // 初始化接口文件
      const interfacesFile = path.join(DATA_DIR, `interfaces-${newFeature.id}.json`);
      fs.writeJsonSync(interfacesFile, [], { spaces: 2 });
      
      res.status(201).json(newFeature);
    } catch (err) {
      console.error('创建功能失败:', err);
      res.status(500).json({ error: '创建功能失败' });
    }
  });
  
  // 更新功能
  router.put('/features/:id', (req, res) => {
    try {
      const features = getFeatures();
      const index = features.findIndex(f => f.id === req.params.id);
      
      if (index === -1) {
        return res.status(404).json({ error: '功能不存在' });
      }
      
      const updatedFeature = {
        ...features[index],
        name: req.body.name || features[index].name,
        description: req.body.description !== undefined ? req.body.description : features[index].description,
        updatedAt: new Date().toISOString()
      };
      
      features[index] = updatedFeature;
      
      if (!saveFeatures(features)) {
        return res.status(500).json({ error: '更新功能失败' });
      }
      
      res.json(updatedFeature);
    } catch (err) {
      console.error('更新功能失败:', err);
      res.status(500).json({ error: '更新功能失败' });
    }
  });
  
  // 删除功能
  router.delete('/features/:id', (req, res) => {
    try {
      const features = getFeatures();
      const index = features.findIndex(f => f.id === req.params.id);
      
      if (index === -1) {
        return res.status(404).json({ error: '功能不存在' });
      }
      
      features.splice(index, 1);
      
      if (!saveFeatures(features)) {
        return res.status(500).json({ error: '删除功能失败' });
      }
      
      // 删除关联的接口文件
      const interfacesFile = path.join(DATA_DIR, `interfaces-${req.params.id}.json`);
      if (fs.existsSync(interfacesFile)) {
        fs.removeSync(interfacesFile);
      }
      
      res.json({ success: true, message: '功能已删除' });
    } catch (err) {
      console.error('删除功能失败:', err);
      res.status(500).json({ error: '删除功能失败' });
    }
  });
  
  // 获取功能的所有接口
  router.get('/features/:id/interfaces', (req, res) => {
    try {
      const features = getFeatures();
      const feature = features.find(f => f.id === req.params.id);
      
      if (!feature) {
        return res.status(404).json({ error: '功能不存在' });
      }
      
      const interfacesFile = path.join(DATA_DIR, `interfaces-${req.params.id}.json`);
      
      if (!fs.existsSync(interfacesFile)) {
        fs.writeJsonSync(interfacesFile, [], { spaces: 2 });
        return res.json([]);
      }
      
      const interfaces = fs.readJsonSync(interfacesFile);
      res.json(interfaces);
    } catch (err) {
      console.error('获取功能接口列表失败:', err);
      res.status(500).json({ error: '获取功能接口列表失败' });
    }
  });
  
  return router;
};

module.exports = initRouter;