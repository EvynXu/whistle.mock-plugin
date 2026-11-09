const clone = value => JSON.parse(JSON.stringify(value));
const createId = () => `resp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const normalizeInterface = (item = {}, featureId) => {
  const responses = Array.isArray(item.responses) && item.responses.length ? clone(item.responses).map((r,i) => ({...r,id:r.id || createId(),name:r.name || `响应 ${i+1}`,content:typeof r.content === 'string' ? r.content : JSON.stringify(r.content ?? {}),paramMatchers:r.paramMatchers || []})) : [{ id: createId(), name: '默认响应', content: item.responseContent ?? '{\n  "code": 0,\n  "data": {}\n}', paramMatchers: [] }];
  return { ...clone(item), featureId: item.featureId || featureId, name: item.name || '', group: typeof item.group === 'string' ? item.group : '', urlPattern: item.urlPattern || '', httpMethod: item.httpMethod || item.method || 'ALL', proxyType: item.proxyType || 'response', active: item.active !== false, responses, activeResponseId: responses.some(r => r.id === item.activeResponseId) ? item.activeResponseId : responses[0].id, httpStatus: item.httpStatus || 200, responseDelay: item.responseDelay ?? 0, contentType: item.contentType || 'application/json; charset=utf-8', headers: item.headers || {}, customHeaders: item.customHeaders || {}, paramMatchers: item.paramMatchers || [], filePath: item.filePath || '', targetUrl: item.targetUrl || '' };
};
const duplicateInterface = (item, featureId) => {
  const draft = normalizeInterface(item, featureId);
  const mapping = new Map();
  draft.responses = draft.responses.map(r => { const id = createId(); mapping.set(r.id, id); return { ...r, id }; });
  draft.activeResponseId = mapping.get(draft.activeResponseId);
  draft.paramMatchers = draft.paramMatchers.map(m => ({ ...m, ...(m.targetResponseId ? { targetResponseId: mapping.get(m.targetResponseId) || '' } : {}) }));
  delete draft.id;
  draft.name = `${draft.name} - 副本`;
  return draft;
};
const filterInterfaces = (items, search = '', group = null) => items.filter(i => (!group || i.group === group) && `${i.name} ${i.urlPattern}`.toLowerCase().includes(search.toLowerCase()));
const visibleSelection = (selected, items) => selected.filter(id => items.some(i => i.id === id));
const validateDraft = draft => {
  if (!draft.name.trim()) return '请输入接口名称';
  if (!draft.urlPattern.trim()) return '请输入 URL 匹配规则';
  if (draft.urlPattern.length > 2 && draft.urlPattern.startsWith('/') && draft.urlPattern.endsWith('/')) {
    try { new RegExp(draft.urlPattern.slice(1, -1)); } catch (e) { return `URL 正则表达式无效：${e.message}`; }
  }
  if (!Number.isInteger(Number(draft.httpStatus)) || draft.httpStatus < 100 || draft.httpStatus > 599) return 'HTTP 状态码须为 100～599 的整数';
  if (!Number.isFinite(Number(draft.responseDelay)) || draft.responseDelay < 0) return '延迟须为非负数';
  if (['redirect','url_redirect'].includes(draft.proxyType)) { try { const u = new URL(draft.targetUrl); if (!['http:','https:'].includes(u.protocol)) return '目标地址仅支持 HTTP / HTTPS'; } catch(e) { return '请输入完整有效的目标 URL'; } }
  if (draft.proxyType === 'file' && !draft.filePath.trim()) return '请输入本地文件路径';
  if (draft.proxyType === 'response' && draft.contentType.includes('json')) {
    for (const r of draft.responses) { try { JSON.parse(r.content); } catch(e) { return `响应「${r.name}」JSON 格式有误：${e.message}`; } }
  }
  if (draft.paramMatchers.some(m => m.targetResponseId && !draft.responses.some(r => r.id === m.targetResponseId))) return '接口匹配条件引用了已删除的响应，请修改目标响应';
  if (draft.responses.length && !draft.responses.some(r => r.id === draft.activeResponseId)) return '请选择有效的默认响应';
  for (const m of [...draft.paramMatchers, ...draft.responses.flatMap(r => r.paramMatchers || [])]) {
    if (!m.paramPath || m.paramValue === undefined || m.paramValue === '') return '请补全参数匹配规则或删除空行';
    if (m.matchType === 'regex') { try { new RegExp(m.paramValue); } catch(e) { return '参数匹配规则中的正则表达式无效'; } }
  }
  return null;
};
module.exports = { clone, createId, normalizeInterface, duplicateInterface, filterInterfaces, visibleSelection, validateDraft };
