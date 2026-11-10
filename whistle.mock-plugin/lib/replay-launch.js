const { fork } = require('child_process');
const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const { replayMatchScope } = require('./replay-match');
const { assertReplayEntry, httpUrl, parseSession, parseDirectReplayTypes, replayCookies, BODY_BUDGET, MAX_RECORDS } = require('./replay-session');
const { replayAssetType, downloadReplayAsset } = require('./replay-assets');

let activeWorker;
let lastReplay;

function isLoopback(address) {
  return /^(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/.test(address);
}

function isLocalReplayRequest(req) {
  const { host, origin } = req.headers;
  const remote = req.headers['x-whistle-remote-address'];
  const client = req.headers['x-forwarded-for'];
  return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host) &&
    (origin === 'http://' + host || origin === 'https://' + host) &&
    isLoopback(req.socket.remoteAddress) &&
    (remote === undefined || isLoopback(remote)) &&
    (client === undefined || isLoopback(client));
}

function launchReplay(req, res) {
  let session, cookies, directTypes;
  try {
    const payload = JSON.parse(req.body);
    session = parseSession(payload?.session ?? payload);
    directTypes = parseDirectReplayTypes(payload?.session ? payload.directTypes : undefined);
    assertReplayEntry(session);
    cookies = replayCookies(payload?.session ? payload.cookieHeader : undefined, session.entryUrl);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
  if (activeWorker) return res.status(409).json({ message: '请先关闭已打开的复现窗口，再开始新的复现。' });

  const localNode = path.join(__dirname, '../node_modules/node/bin/node');
  const execPath = process.env.MOCKMASTER_REPLAY_NODE ||
    (Number(process.versions.node.split('.')[0]) >= 20 ? process.execPath : fs.existsSync(localNode) ? localNode : null);
  if (!execPath) {
    return res.status(503).json({ message: '复现需要 Node.js 20 或更新版本。请用新版 Node.js 启动 Whistle。' });
  }

  const child = fork(path.join(__dirname, '../scripts/replay-session.js'), [], {
    execPath,
    execArgv: [],
    stdio: ['ignore', 'ignore', 'ignore', 'ipc']
  });
  activeWorker = child;
  const replay = lastReplay = {
    id: randomUUID(), running: true, directTypes, blocked: [], liveResources: {}, overrides: new Map(), missingAssets: new Map(), additions: [],
    entryUrl: session.entryUrl, records: session.records,
    recordCount: session.records.length,
    directCount: session.records.filter(row => row.source === 'direct').length,
    bodySize: session.records.reduce((size, row) => size + (row.requestBody?.length || 0) + (row.response?.body.length || 0), 0)
  };
  let replied = false;
  const reply = (status, message) => {
    if (replied) return;
    replied = true;
    clearTimeout(timer);
    res.status(status).json({ ok: status === 200, message, id: replay.id, supportsBatchOverrides: true });
  };
  const fail = message => {
    reply(503, message);
    child.kill();
  };
  const timer = setTimeout(() => fail('打开 Chrome 超时，请重试。'), 20000);
  child.on('message', result => {
    if (result.ready) reply(200, '独立 Chrome 窗口已打开');
    else if (result.error) reply(503, result.error);
    else if (result.reset) {
      replay.blocked = [];
      replay.liveResources = {};
      replay.missingAssets.clear();
      if (result.directTypes) replay.directTypes = result.directTypes;
      if (result.entryUrl) replay.entryUrl = result.entryUrl;
    } else if (result.liveResource && replay.directTypes.includes(result.liveResource)) {
      replay.liveResources[result.liveResource] = (replay.liveResources[result.liveResource] || 0) + 1;
    } else if (result.blocked && replay.blocked.length < 60) {
      const asset = result.asset;
      if (asset && replayAssetType(new URL(asset.url), asset.type)) replay.missingAssets.set(asset.url, asset);
      const item = result.blocked;
      if (item.candidateIds?.length) item.scope = replayMatchScope(item.method, item.url, item.type);
      if (!replay.blocked.some(previous => JSON.stringify(previous) === JSON.stringify(item))) {
        replay.blocked.push(item);
      }
    }
  });
  child.once('error', () => {
    replay.running = false;
    replay.records = null;
    if (activeWorker === child) activeWorker = null;
    reply(503, '无法启动本地复现进程，请检查 Node.js 路径。');
  });
  child.once('exit', () => {
    replay.running = false;
    replay.records = null;
    if (activeWorker === child) activeWorker = null;
    reply(503, 'Chrome 未能启动，请检查 Chrome 和回放组件是否已安装。');
  });
  child.send({ session, cookies, directTypes }, error => {
    if (error) fail('无法将会话交给本地复现进程。');
  });
}

function replayStatus(req, res) {
  if (!isLocalReplayRequest(req)) return res.sendStatus(403);
  if (!lastReplay || req.query.id !== lastReplay.id) return res.sendStatus(404);
  const { id, running, entryUrl, directTypes, blocked, liveResources, overrides } = lastReplay;
  res.set('Cache-Control', 'no-store').json({ id, running, entryUrl, directTypes, blocked, liveResources, overrides: [...overrides.values()],
    missingAssets: lastReplay.missingAssets.size, directCount: lastReplay.directCount, supportsBatchOverrides: true });
}

async function replaySupplement(req, res) {
  if (!isLocalReplayRequest(req)) return res.sendStatus(403);
  const replay = lastReplay;
  const worker = activeWorker;
  if (!replay?.running || req.query.id !== replay.id || !worker?.connected) return res.sendStatus(404);
  if (replay.supplementing) return res.status(409).json({ message: '正在补录静态资源，请稍候。' });
  res.set('Cache-Control', 'no-store');
  const limit = Math.min(12, MAX_RECORDS - replay.recordCount);
  if (limit <= 0 || replay.bodySize >= BODY_BUDGET) {
    if (replay.additions.length) return res.json({ records: replay.additions, added: 0, failures: [], notice: '会话已达到容量上限。' });
    return res.status(400).json({ message: '会话已达到容量上限。' });
  }
  const assets = [...replay.missingAssets.values()].slice(0, limit);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  replay.supplementing = true;
  try {
    const results = await Promise.allSettled(assets.map(asset => downloadReplayAsset(asset, controller.signal)));
    const records = [];
    const failures = [];
    let size = replay.bodySize;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && size + result.value.response.body.length <= BODY_BUDGET) {
        size += result.value.response.body.length;
        records.push(result.value);
      } else {
        const url = new URL(assets[index].url);
        failures.push({ url: url.origin + url.pathname,
          reason: result.status === 'rejected' ? result.reason.message : '会话正文已达到容量上限' });
      }
    });
    if (records.length) {
      if (lastReplay !== replay || !worker.connected) return res.status(409).json({ message: '复现已结束，请重新开始后补录。' });
      await new Promise((resolve, reject) => worker.send({ supplement: records }, error => error ? reject(error) : resolve()));
      replay.bodySize = size;
      replay.recordCount += records.length;
      replay.directCount += records.length;
      replay.additions.push(...records);
      for (const row of records) replay.missingAssets.delete(row.url);
    }
    res.json({ records: replay.additions, added: records.length, failures });
  } catch {
    res.status(503).json({ message: '无法把补录数据交给复现窗口，请重试。' });
  } finally {
    clearTimeout(timer);
    replay.supplementing = false;
  }
}

function replayControl(req, res) {
  if (!isLocalReplayRequest(req)) return res.sendStatus(403);
  const replay = lastReplay;
  const worker = activeWorker;
  if (!replay?.running || req.query.id !== replay.id || !worker?.connected) return res.sendStatus(404);

  const { type, scope, recordId } = req.body || {};
  if (type === 'restart' || type === 'stop') {
    const action = { type };
    if (type === 'restart') {
      try {
        if (req.body.directTypes !== undefined) action.directTypes = parseDirectReplayTypes(req.body.directTypes);
        if (req.body.entryUrl !== undefined) {
          if (typeof req.body.entryUrl !== 'string') throw new Error('请输入有效的复现地址');
          const entry = httpUrl(req.body.entryUrl);
          if (entry.origin !== httpUrl(replay.entryUrl).origin) {
            throw new Error('跨站点修改请先结束复现，再用新地址启动 Chrome。');
          }
          assertReplayEntry({ entryUrl: entry.href, records: replay.records });
          action.entryUrl = entry.href;
        }
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }
    return worker.send({ action }, error => res.sendStatus(error ? 503 : 204));
  }
  if (replay.changingOverrides) return res.status(409).json({ message: '正在应用参数例外，请稍候。' });
  let changes;
  if (type === 'override' || type === 'apply-overrides') {
    const selections = type === 'override' ? [{ scope, recordId }] : req.body.selections;
    if (!Array.isArray(selections) || !selections.length || selections.length > 60 ||
      selections.some(item => typeof item?.scope !== 'string' || typeof item.recordId !== 'string') ||
      new Set(selections.map(item => item.scope)).size !== selections.length) {
      return res.status(400).json({ message: '参数例外的选择有误，请重新选择后再应用。' });
    }

    const diagnostics = new Map(replay.blocked.filter(item => item.scope).map(item => [item.scope, item]));
    changes = [];
    for (const selection of selections) {
      const item = diagnostics.get(selection.scope);
      if (!item?.candidateIds.includes(selection.recordId)) {
        return res.status(409).json({ message: '部分诊断已变化，请检查选择后再应用。' });
      }
      changes.push({ scope: item.scope, method: item.method, url: item.url, type: item.type, recordId: selection.recordId });
    }
    const additions = changes.filter(item => !replay.overrides.has(item.scope)).length;
    if (replay.overrides.size + additions > MAX_RECORDS) {
      return res.status(409).json({ message: '本次复现的例外将超过上限，请先撤销部分例外。' });
    }
  } else if (type === 'remove-override' && typeof scope === 'string') {
    if (!replay.overrides.has(scope)) return res.status(409).json({ message: '这条例外已撤销。' });
    changes = [{ scope }];
  } else {
    return res.sendStatus(400);
  }

  replay.changingOverrides = true;
  worker.send({ overrideChanges: changes }, error => {
    replay.changingOverrides = false;
    if (error) return res.sendStatus(503);
    for (const change of changes) {
      if (change.recordId !== undefined) replay.overrides.set(change.scope, change);
      else replay.overrides.delete(change.scope);
    }
    res.sendStatus(204);
  });
}

module.exports = { isLocalReplayRequest, launchReplay, replayStatus, replaySupplement, replayControl };
