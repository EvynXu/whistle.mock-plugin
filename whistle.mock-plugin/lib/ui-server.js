const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const fs = require('fs-extra');
const storage = require('./storage');

// 引入工具函数
const util = require('./util');

// 设置app路径
const APP_ROOT = util.formatPath(path.join(__dirname, '../app'));
const APP_CGI_ROOT = util.formatPath(path.join(APP_ROOT, 'cgi-bin'));
// 加载CGI模块
const CGI_MODULES = util.loadModulesSync(APP_CGI_ROOT);

// 数据存储目录
const DATA_DIR = storage.DATA_DIR;

// 确保数据目录存在
fs.ensureDirSync(DATA_DIR);

// 处理请求和响应错误
app.use(function(req, res, next) {
  req.on('error', util.noop);
  res.on('error', util.noop);
  next();
});

// Starting a desktop browser is only available from the local, same-origin UI.
const { isLocalReplayRequest, launchReplay, replayStatus, replayFrame, replayControl } = require('./replay-launch');
const { MAX_FILE_BYTES } = require('./replay-session');
app.post('/cgi-bin/replay-session/status', replayStatus);
app.post('/cgi-bin/replay-session/frame', replayFrame);
app.post('/cgi-bin/replay-session/control', (req, res, next) => {
  if (!isLocalReplayRequest(req)) return res.sendStatus(403);
  next();
}, express.json({ limit: '24kb' }), replayControl);
app.all('/cgi-bin/replay-session', (req, res, next) => {
  if (req.method !== 'POST') return res.sendStatus(405);
  if (!isLocalReplayRequest(req)) {
    return res.status(403).json({ message: '请在 Whistle 所在电脑通过 localhost 或 127.0.0.1 打开插件后复现。' });
  }
  if (!req.is('application/json')) return res.sendStatus(415);
  next();
}, express.text({ type: 'application/json', limit: MAX_FILE_BYTES }), launchReplay,
(error, req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(error.status || 500).json({
    message: error.status === 413 ? '会话文件超过 25 MB，请缩小抓取范围。' : '无法读取或启动复现会话。'
  });
});

// 解析请求体
app.use(bodyParser.urlencoded({ extended: true, limit: '100mb'}));
app.use(bodyParser.json({ limit: '100mb' }));

// 处理CGI请求
app.all('/cgi-bin/*', async function(req, res) {
  // CORS 预检处理
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.status(204).end();
    return;
  }

  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Credentials', true);
  }

  // 原始URL路径
  let urlPath = req.url.replace(/\?.*$/, '');
  let controller = CGI_MODULES[APP_ROOT + urlPath];
  
  // 如果直接匹配失败，尝试匹配带路径参数的路由
  if (!controller) {
    // 检查是否是接口相关的路由（带ID参数）
    const interfacesMatch = urlPath.match(/^\/cgi-bin\/interfaces(\/[^\/]+)?$/);
    if (interfacesMatch) {
      controller = CGI_MODULES[APP_ROOT + '/cgi-bin/interfaces'];
      // 将路径参数添加到请求对象中
      if (interfacesMatch[1]) {
        const id = interfacesMatch[1].substring(1); // 移除前面的'/'
        req.params = req.params || {};
        req.params.id = id;
      }
    }
  }
  
  if (!controller) {
    res.status(404).end('Not found');
    return;
  }

  try {
    // 提供数据目录给CGI处理程序（支持 async controller）
    const result = controller.call({ dataDir: DATA_DIR }, req, res);
    if (result && typeof result.then === 'function') {
      await result;
    }
  } catch(e) {
    console.error('[ui-server] CGI 执行错误:', e.message || e);
    if (!res.headersSent) {
      res.status(500).json({ code: 500, message: e.message || 'Internal Server Error' });
    }
  }
});

// 静态文件服务
app.use(express.static(path.join(__dirname, '../app/public')));

// 单页应用支持：所有非API请求返回index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/cgi-bin/')) {
    res.sendFile(path.join(__dirname, '../app/public/index.html'));
  }
});

// 导出启动UI服务器的函数
module.exports = function startUIServer(server, options) {
  server.on('request', app);
}; 