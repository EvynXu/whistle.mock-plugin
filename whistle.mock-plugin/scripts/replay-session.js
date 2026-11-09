#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { MAX_FILE_BYTES, createScriptFallback, requestKey, parseSession, assertReplayEntry, replayHeaders } = require('../lib/replay-session');
const { createReplayMatcher } = require('../lib/replay-match');
const { attachReplayPreview } = require('../lib/replay-preview');

function isTopNavigation(request) {
  if (!request.isNavigationRequest()) return false;
  try {
    return !request.frame().parentFrame();
  } catch {
    // Playwright can report the main navigation before its frame exists.
    return true;
  }
}

function isEntryNavigation(request, session) {
  return request.method() === 'GET' && !request.redirectedFrom() && isTopNavigation(request) &&
    requestKey('GET', request.url(), '') === requestKey('GET', session.entryUrl, '');
}

function refuseRequest(route, session) {
  if (!isTopNavigation(route.request())) return route.abort('blockedbyclient');
  const entry = session.entryUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return route.fulfill({
    status: 424,
    headers: { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': "default-src 'none'" },
    body: '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
      '<title>当前页面未录到</title><h1>当前页面未录到</h1>' +
      '<p>复现已停止这次跳转。请回插件查看缺失请求，或返回入口重新复现。</p>' +
      '<p><a href="' + entry + '">返回复现入口</a></p>'
  });
}

async function installReplay(context, session, report = console.log, onDiagnostic = () => {}) {
  let match = createReplayMatcher(session.records);
  const findScript = createScriptFallback(session.records);
  const reported = new Set();
  function blocked(request, url, reason) {
    const item = { method: request.method(), url: url.origin + url.pathname, type: request.resourceType(), reason };
    const key = JSON.stringify(item);
    if (!reported.has(key) && reported.size < 60) {
      reported.add(key);
      onDiagnostic({ blocked: item });
    }
  }
  await context.routeWebSocket(/.*/, socket => socket.close());
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const label = request.method() + ' ' + url.origin + url.pathname;
    const body = request.postDataBuffer()?.toString('base64') || '';
    let entry, reason;
    if (/^https?:$/.test(url.protocol)) {
      if (isEntryNavigation(request, session)) {
        match = createReplayMatcher(session.records);
        reported.clear();
        onDiagnostic({ reset: true });
      }
      ({ entry, reason } = match(request.method(), url, body, request.resourceType()));
      if (!entry && request.resourceType() === 'script' && request.method() === 'GET' && !body) {
        entry = findScript(url.href);
      }
    }
    if (!entry || (entry.outcome !== 'response' && entry.outcome !== 'network-error')) {
      report('缺少可回放记录 ' + label);
      blocked(request, url, entry ? '响应未完整录到' : reason || '会话里没有录到这条请求');
      await refuseRequest(route, session);
      return;
    }
    if (entry.duration) await new Promise(resolve => setTimeout(resolve, Math.min(entry.duration, 120000)));
    if (entry.outcome === 'network-error') {
      report('模拟传输失败 ' + label);
      await route.abort('failed');
      return;
    }
    const response = entry.response;
    if (!response) {
      blocked(request, url, '响应未完整录到');
      await refuseRequest(route, session);
      return;
    }
    report('回放 ' + entry.status + ' ' + label);
    await route.fulfill({
      status: entry.status,
      headers: replayHeaders(response.headers),
      body: Buffer.from(response.body, 'base64')
    });
  });
}

async function runReplay(session, onReady = () => {}, report = console.log, onDiagnostic = () => {}, cookies = [], embedded = false) {
  assertReplayEntry(session);
  let playwright;
  try {
    const customModule = process.env.MOCKMASTER_PLAYWRIGHT_PATH;
    playwright = require(customModule ? path.resolve(customModule) : 'playwright-core');
  } catch {
    throw new Error('回放组件 playwright-core 加载失败，请确认插件依赖已安装，并使用 Node.js 20 或更新版本。');
  }
  const browser = await playwright.chromium.launch({
    channel: 'chrome',
    headless: embedded,
    proxy: { server: 'http://127.0.0.1:1', bypass: '<-loopback>' },
    args: ['--disable-quic', '--force-webrtc-ip-handling-policy=disable_non_proxied_udp']
  });
  const closeOnDisconnect = () => browser.close().catch(() => {});
  if (process.send) process.once('disconnect', closeOnDisconnect);
  try {
    const context = await browser.newContext({
      ...playwright.devices['Pixel 7'],
      ...(embedded ? { deviceScaleFactor: 2 } : {}),
      offline: true,
      serviceWorkers: 'block'
    });
    if (cookies.length) {
      try {
        await context.addCookies(cookies);
      } catch {
        throw new Error('Chrome 无法加载复现 Cookie，请检查 Cookie 格式和入口地址。');
      }
    }
    await installReplay(context, session, report, onDiagnostic);
    const page = await context.newPage();
    if (embedded) attachReplayPreview(page, session.entryUrl);
    const closed = page.waitForEvent('close', { timeout: 0 });
    onReady();
    await page.goto(session.entryUrl, { waitUntil: 'domcontentloaded', timeout: 125000 }).catch(error => {
      if (!page.isClosed()) report('入口未完整加载。' + error.message);
    });
    if (!page.isClosed()) await closed;
  } finally {
    process.removeListener('disconnect', closeOnDisconnect);
    await browser.close();
  }
}

async function main() {
  const file = process.argv[2];
  if (!file || process.argv.includes('--help')) {
    console.log('用法: node scripts/replay-session.js <会话文件.json>');
    process.exitCode = file ? 0 : 1;
    return;
  }
  if (fs.statSync(file).size > MAX_FILE_BYTES) throw new Error('会话文件超过 25 MB');
  await runReplay(parseSession(fs.readFileSync(file, 'utf8')));
}

if (require.main === module && process.send) {
  process.once('message', async ({ session, cookies, embedded }) => {
    try {
      await runReplay(session, () => {
        if (!process.connected) throw new Error('Whistle 已断开');
        process.send({ ready: true });
      }, () => {}, event => {
        if (process.connected) process.send(event);
      }, cookies, embedded);
    } catch (error) {
      if (process.connected) process.send({ error: error.message.split('\n')[0] });
    } finally {
      if (process.connected) process.disconnect();
    }
  });
} else if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { installReplay };
