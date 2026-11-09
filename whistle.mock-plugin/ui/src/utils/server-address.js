const ipv4 = value => typeof value === 'string' && /^\d{1,3}(\.\d{1,3}){3}$/.test(value) && value.split('.').every(part => Number(part) <= 255);
const usable4 = value => ipv4(value) && !value.startsWith('127.') && value !== '0.0.0.0';
const usable6 = value => {
  if (typeof value !== 'string' || value === '::1' || value === '::' || /^::ffff:127\./i.test(value)) return false;
  try { return !!new URL(`http://[${value.split('%')[0]}]/`).hostname; } catch (e) { return false; }
};
const normalizeServerAddress = result => {
  if (result?.ec !== 0 || !result.server || typeof result.server !== 'object') throw new Error('无法读取 Whistle 服务信息');
  const server = result.server;
  const address = value => typeof value === 'string' ? value.trim() : value?.address;
  const v4 = (Array.isArray(server.ipv4) ? server.ipv4 : []).map(address).filter(usable4);
  const v6 = (Array.isArray(server.ipv6) ? server.ipv6 : []).map(address).filter(usable6);
  const addresses = [...new Set([...v4, ...v6])];
  if (addresses.includes(server.bip)) addresses.splice(0, addresses.length, server.bip, ...addresses.filter(ip => ip !== server.bip));
  return { addresses };
};
module.exports = { normalizeServerAddress };
