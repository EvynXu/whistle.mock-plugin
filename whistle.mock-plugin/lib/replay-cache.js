const { isIP } = require('net');

let activeIp;
let pending;

function cacheRule(ip) {
  return ip ? '* disable://cache includeFilter://clientIp:/^' + ip.replace(/\./g, '\\.') + '$/' : '';
}

function serveReplayCacheRules(req, res) {
  const change = pending;
  if (change) res.once('finish', change.published);
  res.type('text').send(cacheRule(change ? change.ip : activeIp));
}

async function replayCache(req, res) {
  const { action, ip } = req.body || {};
  if (action === 'status') return res.json({ active: activeIp ? { ip: activeIp } : null });
  if (action !== 'enable' && action !== 'disable') return res.sendStatus(400);
  if (action === 'enable' && !isIP(ip)) {
    return res.status(400).json({ message: '请先选择有效的设备 IP。' });
  }
  if (pending) return res.status(409).json({ message: 'Whistle 正在同步设置，请稍后重试。' });

  const updateRules = req.app.get('replayCacheUpdateRules');
  if (!updateRules) return res.status(503).json({ message: '请从 Whistle 插件页面打开后重试。' });
  const nextIp = action === 'enable' ? ip : undefined;
  if (nextIp === activeIp) return res.json({ active: activeIp ? { ip: activeIp } : null });

  let timer;
  try {
    await new Promise((resolve, reject) => {
      pending = { ip: nextIp, published: resolve };
      timer = setTimeout(() => reject(new Error('Whistle 未同步设备缓存规则，请检查插件是否已启用。')), 5000);
      updateRules();
    });
    activeIp = nextIp;
    return res.json({ active: activeIp ? { ip: activeIp } : null });
  } catch (error) {
    pending = undefined;
    updateRules();
    return res.status(503).json({ message: error.message });
  } finally {
    pending = undefined;
    clearTimeout(timer);
  }
}

module.exports = { replayCache, serveReplayCacheRules };
