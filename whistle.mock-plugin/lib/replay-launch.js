const { fork } = require('child_process');
const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const { validPreviewAction } = require('./replay-preview');
const { assertReplayEntry, parseSession, replayCookies } = require('./replay-session');

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
  let session, cookies, embedded;
  try {
    const payload = JSON.parse(req.body);
    session = parseSession(payload?.session ?? payload);
    embedded = payload?.embedded === true;
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
  const replay = lastReplay = { id: randomUUID(), running: true, blocked: [], embedded, frameId: 0 };
  if (embedded) {
    replay.expiry = setTimeout(() => child.kill(), 45000);
  }
  let replied = false;
  const reply = (status, message) => {
    if (replied) return;
    replied = true;
    clearTimeout(timer);
    res.status(status).json({ ok: status === 200, message, id: replay.id });
  };
  const fail = message => {
    reply(503, message);
    child.kill();
  };
  const timer = setTimeout(() => fail('打开 Chrome 超时，请重试。'), 20000);
  child.on('message', result => {
    if (result.ready) reply(200, embedded ? '浮层复现已启动' : '复现窗口已打开');
    else if (result.error) reply(503, result.error);
    else if (embedded && typeof result.frame === 'string' && result.frame.length <= 2000000) {
      replay.frame = Buffer.from(result.frame, 'base64');
      replay.frameId++;
      replay.sendFrame?.();
    } else if (result.reset) replay.blocked = [];
    else if (result.blocked && replay.blocked.length < 60) replay.blocked.push(result.blocked);
  });
  child.once('error', () => {
    clearTimeout(replay.expiry);
    replay.running = false;
    delete replay.frame;
    replay.sendFrame?.();
    if (activeWorker === child) activeWorker = null;
    reply(503, '无法启动本地复现进程，请检查 Node.js 路径。');
  });
  child.once('exit', () => {
    clearTimeout(replay.expiry);
    replay.running = false;
    delete replay.frame;
    replay.sendFrame?.();
    if (activeWorker === child) activeWorker = null;
    reply(503, 'Chrome 未能启动，请检查 Chrome 和回放组件是否已安装。');
  });
  child.send({ session, cookies, embedded }, error => {
    if (error) fail('无法将会话交给本地复现进程。');
  });
}

function replayStatus(req, res) {
  if (!isLocalReplayRequest(req)) return res.sendStatus(403);
  if (!lastReplay || req.query.id !== lastReplay.id) return res.sendStatus(404);
  const { id, running, blocked, embedded } = lastReplay;
  if (embedded && running) lastReplay.expiry.refresh();
  res.set('Cache-Control', 'no-store').json({ id, running, blocked, embedded });
}

function replayFrame(req, res) {
  if (!isLocalReplayRequest(req)) return res.sendStatus(403);
  const replay = lastReplay;
  if (!replay?.embedded || req.query.id !== replay.id) return res.sendStatus(404);
  const after = Number(req.query.after ?? 0);
  if (!Number.isSafeInteger(after) || after < 0) return res.sendStatus(400);
  res.set('Cache-Control', 'no-store');
  if (!replay.running || !activeWorker?.connected) return res.sendStatus(410);
  replay.expiry.refresh();
  activeWorker.send({ preview: true }, () => {});
  const hasNewFrame = () => replay.frame && replay.frameId > after;
  function writeFrame() {
    res.set('X-Replay-Frame', String(replay.frameId)).type('jpeg').send(replay.frame);
  }
  if (hasNewFrame()) return writeFrame();

  // One waiting response per replay. A reconnect replaces the previous wait.
  replay.sendFrame?.();
  function cleanup() {
    clearTimeout(timer);
    res.removeListener('close', cleanup);
    if (replay.sendFrame === respond) delete replay.sendFrame;
  }
  function respond() {
    cleanup();
    if (res.destroyed) return;
    if (hasNewFrame()) writeFrame();
    else res.sendStatus(204);
  }
  const timer = setTimeout(respond, 4000);
  replay.sendFrame = respond;
  res.once('close', cleanup);
}

function replayControl(req, res) {
  if (!isLocalReplayRequest(req)) return res.sendStatus(403);
  if (!lastReplay?.embedded || req.query.id !== lastReplay.id || !activeWorker?.connected) {
    return res.sendStatus(404);
  }
  if (!validPreviewAction(req.body)) return res.sendStatus(400);
  activeWorker.send({ action: req.body }, error => res.sendStatus(error ? 503 : 204));
}

module.exports = { isLocalReplayRequest, launchReplay, replayStatus, replayFrame, replayControl };
