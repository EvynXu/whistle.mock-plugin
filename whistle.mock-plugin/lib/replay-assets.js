const axios = require('axios');
const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const { BlockList, isIP } = require('net');
const { randomUUID } = require('crypto');
const { replayHeaders, replayResourceType } = require('./replay-session');

const reserved = new BlockList();
for (const [address, bits] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3]
]) reserved.addSubnet(address, bits);
for (const [address, bits] of [
  ['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20]
]) reserved.addSubnet(address, bits, 'ipv6');

const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');

const syntheticAddresses = new BlockList();
syntheticAddresses.addSubnet('198.18.0.0', 15);
const publicResolver = new dns.Resolver({ timeout: 1500, tries: 1 });
publicResolver.setServers(['223.5.5.5', '1.1.1.1']);
const pendingLookups = new Map();

function isPublicAddress({ address, family }) {
  return family === 4 ? !reserved.check(address) :
    family === 6 && globalV6.check(address, 'ipv6') && !reserved.check(address, 'ipv6');
}

function resolvePublicDns(hostname) {
  if (!pendingLookups.has(hostname)) {
    const lookup = Promise.allSettled([publicResolver.resolve4(hostname), publicResolver.resolve6(hostname)])
      .then(results => results.flatMap((result, index) => result.status === 'fulfilled'
        ? result.value.map(address => ({ address, family: index === 0 ? 4 : 6 })) : []))
      .finally(() => pendingLookups.delete(hostname));
    pendingLookups.set(hostname, lookup);
  }
  return pendingLookups.get(hostname);
}

async function publicLookup(hostname) {
  const addresses = await dns.lookup(hostname, { all: true });
  const publicAddresses = addresses.filter(isPublicAddress);
  if (publicAddresses.length) return publicAddresses;
  // Some system proxies return synthetic addresses in the benchmarking range.
  if (addresses.some(({ address, family }) => syntheticAddresses.check(address, family === 6 ? 'ipv6' : 'ipv4'))) {
    const fallback = (await resolvePublicDns(hostname)).filter(isPublicAddress);
    if (fallback.length) return fallback;
  }
  throw new Error('资源域名未解析到公网地址');
}

function isReplayAssetUrl(url) {
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.port &&
    !isIP(url.hostname.replace(/^\[|\]$/g, '')) && url.href.length <= 4096;
}

function replayAssetType(url, type) {
  return isReplayAssetUrl(url) && (type === 'script' && /\.m?js$/i.test(url.pathname) ||
    type === 'stylesheet' && /\.css$/i.test(url.pathname));
}

const direct = axios.create({
  proxy: false,
  httpAgent: new http.Agent({ maxSockets: 6, maxTotalSockets: 12 }),
  httpsAgent: new https.Agent({ maxSockets: 6, maxTotalSockets: 12 }),
  maxRedirects: 0,
  timeout: 10000,
  maxContentLength: 5 * 1024 * 1024,
  responseType: 'arraybuffer',
  validateStatus: () => true
});

const retryable = new Set(['ECONNRESET', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE', 'ETIMEDOUT']);

async function requestAsset(url, origin, signal) {
  let lookupResult;
  for (let attempt = 0; ; attempt++) {
    try {
      return await direct.get(url.href, {
        signal,
        lookup(hostname, options, callback) {
          lookupResult ||= publicLookup(hostname);
          lookupResult.then(addresses => {
            const offset = attempt % addresses.length;
            callback(null, [...addresses.slice(offset), ...addresses.slice(0, offset)]);
          }, callback);
        },
        headers: { 'Cache-Control': 'no-cache', 'Accept-Encoding': 'identity', ...(origin ? { Origin: origin } : {}) }
      });
    } catch (error) {
      if (signal.aborted || attempt >= 2 || !retryable.has(error.code)) throw error;
    }
  }
}

const mimeByType = {
  png: /^image\/png$/,
  jpg: /^image\/jpeg$/,
  gif: /^image\/gif$/,
  webp: /^image\/webp$/,
  svg: /^image\/svg\+xml$/,
  js: /^(?:(?:text|application)\/(?:x-)?(?:javascript|ecmascript)(?:1\.[0-5])?|text\/jscript)$/,
  css: /^text\/css$/,
  font: /^(?:font\/[a-z0-9.+-]+|application\/(?:font-[a-z0-9-]+|x-font-[a-z0-9-]+|vnd\.ms-fontobject|octet-stream))$/
};

async function fetchReplayResource(asset, signal) {
  const url = new URL(asset.url);
  const type = replayResourceType(asset.type, url);
  if (!isReplayAssetUrl(url) || !type) throw new Error('该地址不支持静态资源直连');
  let response;
  try {
    response = await requestAsset(url, asset.origin, signal);
  } catch (error) {
    if (signal.aborted || error.code === 'ECONNABORTED') throw new Error('下载超时');
    if (error.code === 'ERR_BAD_RESPONSE') throw new Error('正文不完整或超过 5 MB');
    throw new Error(error.message === '资源域名未解析到公网地址' ? error.message : '直连下载失败');
  }
  if (response.status !== 200) throw new Error('直连返回 HTTP ' + response.status);
  const mime = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (!mimeByType[type].test(mime)) throw new Error('返回内容与请求的资源类型不符');
  return {
    status: 200, outcome: 'response',
    response: { headers: replayHeaders(response.headers), body: Buffer.from(response.data).toString('base64') }
  };
}

async function downloadReplayAsset(asset, signal) {
  const url = new URL(asset.url);
  if (!replayAssetType(url, asset.type)) throw new Error('该地址不支持直连补录');
  return {
    ...await fetchReplayResource(asset, signal),
    id: 'direct-' + randomUUID(), method: 'GET', url: url.href, requestBody: '',
    startTime: Date.now(), duration: 0, source: 'direct'
  };
}

module.exports = { replayAssetType, downloadReplayAsset, fetchReplayResource };
