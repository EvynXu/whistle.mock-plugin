const fs = require('fs-extra');
const path = require('path');

const DEFAULT_SETTINGS = {
  interfaceParamMatcherEnabled: true,
  responseParamMatcherEnabled: true,
  webDavSyncEnabled: false,
};

module.exports = function(req, res) {
  const dataDir = this.dataDir;
  const settingsFile = path.join(dataDir, 'settings.json');

  const getSettings = () => {
    try {
      if (!fs.existsSync(settingsFile)) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...fs.readJsonSync(settingsFile) };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  };

  try {
    if (req.method === 'GET') {
      res.json(getSettings());
    } else if (req.method === 'PUT' || req.method === 'POST') {
      const current = getSettings();
      const updated = { ...current, ...req.body };
      fs.writeJsonSync(settingsFile, updated, { spaces: 2 });
      res.json(updated);
    } else {
      res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (err) {
    console.error('settings cgi error:', err);
    res.status(500).json({ error: '操作失败' });
  }
};
