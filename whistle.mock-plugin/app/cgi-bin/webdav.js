const { createWebDavSync } = require('../../lib/webdav-sync');

module.exports = async function(req, res) {
  const webDavSync = createWebDavSync(this.dataDir);

  try {
    if (req.method == 'GET') {
      return res.json({ code: 0, message: '成功', data: webDavSync.getStatus() });
    }

    if (req.method != 'POST') {
      return res.status(405).json({ code: 405, message: 'Method Not Allowed', data: null });
    }

    const { action, force, featureIds, endpoint, username, password } = req.body || {};
    const input = { endpoint, username, password };
    let data;

    switch (action) {
      case 'test':
        data = await webDavSync.test(input);
        break;
      case 'connect':
        data = await webDavSync.connect(input);
        break;
      case 'refresh':
        data = await webDavSync.refresh();
        break;
      case 'push':
        data = await webDavSync.push({ force: force == true, featureIds });
        break;
      case 'pull':
        data = await webDavSync.pull({ force: force == true, featureIds });
        break;
      case 'disconnect':
        data = webDavSync.disconnect();
        break;
      default:
        return res.status(400).json({ code: 400, message: '不支持的 WebDAV 操作', data: null });
    }

    return res.json({ code: 0, message: '成功', data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    console.error(
      `[webdav] ${req.body && req.body.action ? req.body.action : req.method} 失败:`,
      error.message || error.code || error
    );
    return res.status(statusCode).json({
      code: statusCode,
      message: error.message || 'WebDAV 操作失败',
      conflict: error.conflict || null,
      data: null,
    });
  }
};
