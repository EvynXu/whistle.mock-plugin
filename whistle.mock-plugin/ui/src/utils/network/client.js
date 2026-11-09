const axios = require('axios');
const { summarize } = require('./model');

// Whistle reserves /whistle/ to address its own UI APIs from a plugin page.
const root = '/whistle/cgi-bin/';
const connectionError = error => {
  const status = error.response?.status;
  return new Error(status === 401 || status === 403 ? 'Whistle 需要登录：请先在同一浏览器打开 Whistle 并登录，再重试。' : error.message || '无法读取 Whistle 抓包数据');
};
async function readNetwork(params, signal) {
  try {
    const { data } = await axios.get(root + 'get-data', { signal, timeout: 15000, params: {
      startLogTime: -3, startSvrLogTime: -3, ...params
    } });
    const packet = data?.data;
    if (data?.ec !== 0 || !packet?.data || typeof packet.data !== 'object' || Array.isArray(packet.data)) {
      throw new Error('当前页面未连接到兼容的 Whistle Network API，请从 Whistle 插件页面打开。');
    }
    return { items: Object.values(packet.data).filter(item => item && typeof item === 'object'),
      cursor: packet.lastId, endId: packet.endId, hasNew: !!packet.hasNew };
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw connectionError(error);
  }
}

async function fetchNetwork(cursor, pendingIds, signal) {
  const { items, ...batch } = await readNetwork({
    count: 50, startTime: cursor || undefined, ids: pendingIds.join(',') || undefined,
    status: pendingIds.map(() => '--').join(',') || undefined
  }, signal);
  return { ...batch, rows: items.map(summarize) };
}

async function fetchSessions(ids, signal, timeout = 15000) {
  try {
    const list = JSON.stringify(ids);
    const { data } = await axios.get(root + 'get-session', { signal, timeout, params: { reqList: list, resList: list } });
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('无法读取 Whistle 请求详情。');
    return data;
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw connectionError(error);
  }
}

async function fetchSession(id, signal) {
  const data = await fetchSessions([id], signal);
  if (data[id] === 0) throw new Error('该请求已从 Whistle 缓存中移除，无法读取原始内容。');
  if (!data[id] || typeof data[id] !== 'object' || data[id].id !== id) throw new Error('请求详情暂未就绪，请稍后刷新。');
  return data[id];
}

module.exports = { fetchNetwork, fetchSession, fetchSessions, readNetwork };
