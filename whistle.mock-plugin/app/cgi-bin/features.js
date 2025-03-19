const fs = require('fs-extra');
const path = require('path');

module.exports = function(req, res) {
  const dataDir = this.dataDir;
  const featuresFile = path.join(dataDir, 'features.json');
  const interfacesFile = path.join(dataDir, 'interfaces.json');
  
  try {
    // 确保配置文件存在并包含有效结构
    if (!fs.existsSync(featuresFile)) {
      fs.writeJsonSync(featuresFile, { features: [] }, { spaces: 2 });
    } else {
      // 读取文件验证结构
      try {
        const fileData = fs.readJsonSync(featuresFile);
        if (!fileData || !fileData.features) {
          // 如果文件存在但结构无效，重新初始化
          fs.writeJsonSync(featuresFile, { features: [] }, { spaces: 2 });
          console.log('修复了损坏的features文件结构');
        }
      } catch (e) {
        // JSON解析错误时重新初始化文件
        fs.writeJsonSync(featuresFile, { features: [] }, { spaces: 2 });
        console.log('修复了无法解析的features文件');
      }
    }
    
    // 处理GET请求 - 获取所有功能模块
    if (req.method === 'GET') {
      let featuresData;
      try {
        featuresData = fs.readJsonSync(featuresFile);
        if (!featuresData.features) {
          featuresData.features = [];
        }
      } catch (err) {
        // 读取出错时返回空数组
        console.error('读取功能列表错误:', err);
        featuresData = { features: [] };
      }
      
      // 计算每个功能模块的接口数量
      if (fs.existsSync(interfacesFile)) {
        try {
          const interfacesData = fs.readJsonSync(interfacesFile);
          const interfaces = interfacesData.interfaces || [];
          
          // 统计接口数量
          for (const feature of featuresData.features) {
            feature.interfaceCount = interfaces.filter(item => item.featureId === feature.id).length;
          }
        } catch (err) {
          console.error('读取接口列表错误:', err);
          // 读取接口出错时不影响功能列表返回
        }
      }
      
      return res.json({
        code: 0,
        message: '成功',
        data: featuresData.features
      });
    }
    
    // 处理POST请求 - 添加或更新功能模块
    if (req.method === 'POST') {
      const featureData = req.body;
      let featuresData;
      
      try {
        featuresData = fs.readJsonSync(featuresFile);
        if (!featuresData.features) {
          featuresData = { features: [] };
        }
      } catch (err) {
        // 读取出错时初始化
        console.error('读取功能列表错误:', err);
        featuresData = { features: [] };
      }
      
      // 参数验证
      if (!featureData.name) {
        return res.status(400).json({
          code: 400,
          message: '功能名称不能为空',
          data: null
        });
      }
      
      // 如果有ID则更新，否则创建新功能
      if (featureData.id) {
        // 更新现有功能
        const index = featuresData.features.findIndex(item => item.id === featureData.id);
        
        if (index === -1) {
          return res.status(404).json({
            code: 404,
            message: '功能模块不存在',
            data: null
          });
        }
        
        // 更新功能
        featuresData.features[index] = {
          ...featuresData.features[index],
          name: featureData.name,
          description: featureData.description,
          active: featureData.active
        };
        
        fs.writeJsonSync(featuresFile, featuresData, { spaces: 2 });
        
        return res.json({
          code: 0,
          message: '功能模块更新成功',
          data: featuresData.features[index]
        });
      } else {
        // 创建新功能
        const newFeature = {
          id: Date.now().toString(),
          name: featureData.name,
          description: featureData.description || '',
          active: featureData.active !== false,
          createdAt: new Date().toISOString().split('T')[0]
        };
        
        // 确保features数组存在
        if (!Array.isArray(featuresData.features)) {
          featuresData.features = [];
        }
        
        featuresData.features.push(newFeature);
        fs.writeJsonSync(featuresFile, featuresData, { spaces: 2 });
        
        return res.json({
          code: 0,
          message: '功能模块创建成功',
          data: newFeature
        });
      }
    }
    
    // 处理DELETE请求 - 删除功能模块
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({
          code: 400,
          message: '功能ID不能为空',
          data: null
        });
      }
      
      let featuresData;
      try {
        featuresData = fs.readJsonSync(featuresFile);
        if (!featuresData.features) {
          featuresData = { features: [] };
        }
      } catch (err) {
        // 读取出错时初始化
        console.error('读取功能列表错误:', err);
        featuresData = { features: [] };
      }
      
      const index = featuresData.features.findIndex(item => item.id === id);
      
      if (index === -1) {
        return res.status(404).json({
          code: 404,
          message: '功能模块不存在',
          data: null
        });
      }
      
      // 删除功能
      const deletedFeature = featuresData.features.splice(index, 1)[0];
      fs.writeJsonSync(featuresFile, featuresData, { spaces: 2 });
      
      // 同时删除该功能的所有接口
      if (fs.existsSync(interfacesFile)) {
        try {
          const interfacesData = fs.readJsonSync(interfacesFile);
          if (interfacesData && Array.isArray(interfacesData.interfaces)) {
            interfacesData.interfaces = interfacesData.interfaces.filter(item => item.featureId !== id);
            fs.writeJsonSync(interfacesFile, interfacesData, { spaces: 2 });
          }
        } catch (err) {
          console.error('处理接口文件错误:', err);
        }
      }
      
      return res.json({
        code: 0,
        message: '功能模块删除成功',
        data: deletedFeature
      });
    }
    
    // 其他请求方法
    return res.status(405).json({
      code: 405,
      message: '不支持的请求方法',
      data: null
    });
  } catch (err) {
    console.error('处理功能模块请求出错:', err);
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误: ' + err.message,
      data: null
    });
  }
}; 