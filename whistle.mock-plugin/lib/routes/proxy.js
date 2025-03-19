const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const Mock = require('mockjs');
const os = require('os');

/**
 * 代理路由处理程序
 * 负责处理文件和 Mock 数据相关的 API 请求
 */
const FILES_DIR = path.join(os.homedir(), '.whistle-mock-plugin', 'files');

// 确保文件目录存在
fs.ensureDirSync(FILES_DIR);

// 初始化路由器
const router = express.Router();

// 解析 JSON 请求体
router.use(express.json());

/**
 * 获取文件内容
 * GET /api/proxy/file?path=example.json
 */
router.get('/proxy/file', (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: '缺少文件路径参数' });
    }
    
    // 处理相对路径和绝对路径
    const fullPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(FILES_DIR, filePath);
    
    // 确保路径安全（防止目录遍历攻击）
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(FILES_DIR) && !path.isAbsolute(filePath)) {
      return res.status(403).json({ error: '访问被拒绝：路径超出允许范围' });
    }
    
    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    if (fs.statSync(normalizedPath).isDirectory()) {
      return res.status(400).json({ error: '不能读取目录，请指定文件' });
    }
    
    const content = fs.readFileSync(normalizedPath, 'utf-8');
    const stats = fs.statSync(normalizedPath);
    
    res.json({
      path: filePath,
      name: path.basename(filePath),
      content,
      size: stats.size,
      mtime: stats.mtime,
      isDirectory: false
    });
  } catch (err) {
    console.error('获取文件内容失败:', err);
    res.status(500).json({ error: '获取文件内容失败: ' + err.message });
  }
});

/**
 * 保存文件内容
 * POST /api/proxy/file
 * body: { path: 'example.json', content: '{"key": "value"}' }
 */
router.post('/proxy/file', (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: '缺少文件路径参数' });
    }
    
    if (content === undefined) {
      return res.status(400).json({ error: '缺少文件内容参数' });
    }
    
    // 处理相对路径和绝对路径
    const fullPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(FILES_DIR, filePath);
    
    // 确保路径安全（防止目录遍历攻击）
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(FILES_DIR) && !path.isAbsolute(filePath)) {
      return res.status(403).json({ error: '访问被拒绝：路径超出允许范围' });
    }
    
    // 确保目录存在
    fs.ensureDirSync(path.dirname(normalizedPath));
    
    // 写入文件
    fs.writeFileSync(normalizedPath, content, 'utf-8');
    const stats = fs.statSync(normalizedPath);
    
    res.json({
      path: filePath,
      name: path.basename(filePath),
      size: stats.size,
      mtime: stats.mtime,
      isDirectory: false
    });
  } catch (err) {
    console.error('保存文件内容失败:', err);
    res.status(500).json({ error: '保存文件内容失败: ' + err.message });
  }
});

/**
 * 获取文件列表
 * GET /api/proxy/files?path=directory
 */
router.get('/proxy/files', (req, res) => {
  try {
    const dirPath = req.query.path || '';
    
    // 处理相对路径和绝对路径
    const fullPath = path.isAbsolute(dirPath) 
      ? dirPath 
      : path.join(FILES_DIR, dirPath);
    
    // 确保路径安全（防止目录遍历攻击）
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(FILES_DIR) && !path.isAbsolute(dirPath)) {
      return res.status(403).json({ error: '访问被拒绝：路径超出允许范围' });
    }
    
    // 确保目录存在
    if (!fs.existsSync(normalizedPath)) {
      fs.ensureDirSync(normalizedPath);
    }
    
    if (!fs.statSync(normalizedPath).isDirectory()) {
      return res.status(400).json({ error: '指定路径不是目录' });
    }
    
    const files = fs.readdirSync(normalizedPath)
      .filter(file => !file.startsWith('.') || file === '.placeholder')
      .map(file => {
        const filePath = path.join(normalizedPath, file);
        const stats = fs.statSync(filePath);
        const isDirectory = stats.isDirectory();
        const relativePath = path.join(dirPath, file);
        
        return {
          path: relativePath,
          name: file,
          size: stats.size,
          mtime: stats.mtime,
          isDirectory
        };
      });
    
    res.json(files);
  } catch (err) {
    console.error('获取文件列表失败:', err);
    res.status(500).json({ error: '获取文件列表失败: ' + err.message });
  }
});

/**
 * 删除文件
 * DELETE /api/proxy/file?path=example.json
 */
router.delete('/proxy/file', (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: '缺少文件路径参数' });
    }
    
    // 处理相对路径和绝对路径
    const fullPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(FILES_DIR, filePath);
    
    // 确保路径安全（防止目录遍历攻击）
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(FILES_DIR) && !path.isAbsolute(filePath)) {
      return res.status(403).json({ error: '访问被拒绝：路径超出允许范围' });
    }
    
    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 删除文件或目录
    fs.removeSync(normalizedPath);
    
    res.json({ success: true, message: '文件已删除' });
  } catch (err) {
    console.error('删除文件失败:', err);
    res.status(500).json({ error: '删除文件失败: ' + err.message });
  }
});

/**
 * 测试 Mock 数据生成
 * POST /api/proxy/test
 * body: { template: '{"name": "@cname", "age|18-60": 1}' }
 */
router.post('/proxy/test', (req, res) => {
  try {
    const { template } = req.body;
    
    if (!template) {
      return res.status(400).json({ error: '缺少 template 参数' });
    }
    
    // 解析模板
    let templateObj;
    try {
      templateObj = typeof template === 'string' ? JSON.parse(template) : template;
    } catch (e) {
      return res.status(400).json({ error: 'template 不是有效的 JSON: ' + e.message });
    }
    
    // 生成 Mock 数据
    const mockData = Mock.mock(templateObj);
    
    res.json({
      template: templateObj,
      data: mockData
    });
  } catch (err) {
    console.error('生成 Mock 数据失败:', err);
    res.status(500).json({ error: '生成 Mock 数据失败: ' + err.message });
  }
});

module.exports = router; 