const axios = require('axios');
const { summarize } = require('./model');

// Whistle reserves /whistle/ to address its own UI APIs from a plugin page.
const root = '/whistle/cgi-bin/';
const connectionError = error => {
  const status = error.response?.status;
  return new Error(status === 401 || status === 403 ? 'Whistle 需要登录：请先在同一浏览器打开 Whistle 并登录，再重试。' : error.message || '无法读取 Whistle 抓包数据');
};
async function fetchNetwork(cursor, pendingIds, signal) {
  try {
    const { data } = await axios.get(root + 'get-data', { signal, timeout: 15000, params: {
      count: 50, startTime: cursor || undefined, ids: pendingIds.join(',') || undefined,
      status: pendingIds.map(() => '--').join(',') || undefined,
      startLogTime: -3, startSvrLogTime: -3
    } });
    if (data?.ec !== 0 || !data.data || !data.data.data || typeof data.data.data !== 'object' || Array.isArray(data.data.data)) {
      throw new Error('当前页面未连接到兼容的 Whistle Network API，请从 Whistle 插件页面打开。');
    }
    const packet = data.data;
    return { rows: Object.values(packet.data).filter(item => item && typeof item === 'object').map(summarize),
      cursor: packet.lastId, endId: packet.endId, hasNew: !!packet.hasNew };
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw connectionError(error);
  }
}
async function fetchSession(id, signal) {
  try {
    const { data } = await axios.get(root + 'get-session', { signal, timeout: 15000, params: { reqList: JSON.stringify([id]), resList: JSON.stringify([id]) } });
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('无法读取 Whistle 请求详情。');
    if (data[id] === 0) throw new Error('该请求已从 Whistle 缓存中移除，无法读取原始内容。');
    if (!data[id] || typeof data[id] !== 'object' || data[id].id !== id) throw new Error('请求详情暂未就绪，请稍后刷新。');
    return data[id];
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw connectionError(error);
  }
}

module.exports = { fetchNetwork, fetchSession };
