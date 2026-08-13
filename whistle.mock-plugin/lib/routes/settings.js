const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const storage = require('../storage');

const DATA_DIR = storage.DATA_DIR;
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

fs.ensureDirSync(DATA_DIR);

const DEFAULT_SETTINGS = {
  interfaceParamMatcherEnabled: true,
  responseParamMatcherEnabled: true,
  webDavSyncEnabled: false,
};

const getSettings = () => {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...fs.readJsonSync(SETTINGS_FILE) };
  } catch (err) {
    return { ...DEFAULT_SETTINGS };
  }
};

const saveSettings = (settings) => {
  fs.writeJsonSync(SETTINGS_FILE, settings, { spaces: 2 });
};

const initRouter = () => {
  const router = express.Router();
  router.use(express.json());

  router.get('/settings', (req, res) => {
    res.json(getSettings());
  });

  router.put('/settings', (req, res) => {
    try {
      const current = getSettings();
      const updated = { ...current, ...req.body };
      saveSettings(updated);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: '保存设置失败' });
    }
  });

  return router;
};

module.exports = { initRouter, getSettings };
