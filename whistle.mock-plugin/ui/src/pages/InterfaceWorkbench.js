import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Alert, App, Button, Checkbox, Collapse, Dropdown, Empty, Form, Input, InputNumber, Popconfirm, Popover, Select, Space, Spin, Switch, Table, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, CopyOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, SettingOutlined, TableOutlined, AppstoreOutlined } from '@ant-design/icons';
import axios from 'axios';
import PageHeader from '../components/PageHeader';
import ResponseEditor from '../components/workbench/ResponseEditor';
import Matchers from '../components/workbench/Matchers';
import { contentTypes, httpMethods, proxyTypes } from '../components/interface-management/constants';
import { refreshCacheAfterUpdate } from '../components/interface-management/utils';
import { normalizeInterface, duplicateInterface, filterInterfaces, visibleSelection, validateDraft } from '../components/workbench/model';
import '../styles/workbench.css';
const readWidths = () => {
  try {
    const p = JSON.parse(localStorage.getItem('mm-panel-widths'));
    return {
      tree: Math.max(160, Math.min(300, p?.tree || 210)),
      list: Math.max(240, Math.min(520, p?.list || 320))
    };
  } catch (e) {
    return {
      tree: 210,
      list: 320
    };
  }
};
function HeaderFields({
  value = {},
  onChange
}) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState('');
  return <><Input.TextArea aria-label="自定义 Headers JSON" className="mm-code" value={text} autoSize={{
      minRows: 3,
      maxRows: 9
    }} onChange={e => {
      setText(e.target.value);
      try {
        const p = JSON.parse(e.target.value || '{}');
        if (!p || Array.isArray(p) || typeof p !== 'object' || Object.values(p).some(v => typeof v !== 'string')) throw new Error('Headers 必须是字符串值的 JSON 对象');
        setError('');
        onChange(p, false);
      } catch (err) {
        setError(err.message);
        onChange(value, true);
      }
    }} />{error && <Alert type="error" message={error} />}</>;
}
export default function InterfaceWorkbench() {
  const {
    featureId
  } = useParams();
  const history = useHistory();
  const {
    message,
    modal
  } = App.useApp();
  const [features, setFeatures] = useState([]),
    [items, setItems] = useState([]),
    [moduleId, setModuleId] = useState(null);
  const [loading, setLoading] = useState(true),
    [listLoading, setListLoading] = useState(false),
    [error, setError] = useState('');
  const [search, setSearch] = useState(''),
    [group, setGroup] = useState(null),
    [selected, setSelected] = useState([]);
  const [draft, setDraft] = useState(null),
    [baseline, setBaseline] = useState(''),
    [saving, setSaving] = useState(false),
    [busy, setBusy] = useState(false);
  const [headerInvalid, setHeaderInvalid] = useState(false),
    [headerRevision, setHeaderRevision] = useState(0);
  const [sections, setSections] = useState([]),
    [mobileDetail, setMobileDetail] = useState(false);
  const [tableMode, setTableMode] = useState(() => localStorage.getItem('mm-interface-view') === 'table');
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mm-hidden-columns') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('mm-tree-collapsed') === 'true');
  const [widths, setWidths] = useState(readWidths),
    [dense, setDense] = useState(() => localStorage.getItem('mm-list-density') === 'compact');
  const [settings, setSettings] = useState({
    interfaceParamMatcherEnabled: true,
    responseParamMatcherEnabled: true
  });
  const searchRef = useRef(null),
    fetchVersion = useRef(0),
    confirmOpen = useRef(false),
    saveRef = useRef(null);
  const dirty = draft !== null && (JSON.stringify(draft) !== baseline || headerInvalid);
  const activeFeature = features.find(f => f.id === moduleId);
  const filtered = useMemo(() => filterInterfaces(items, search, group), [items, search, group]);
  const groups = [...new Set(items.map(i => i.group).filter(Boolean))].sort();
  useEffect(() => {
    if (!featureId || featureId === moduleId || !features.some(f => f.id === featureId)) return;
    setModuleId(featureId);
    setDraft(null);
    setGroup(null);
    setSearch('');
  }, [featureId]);
  useEffect(() => {
    const id = new URLSearchParams(history.location.search).get('interfaceId');
    if (id && !draft && items.some(i => i.id === id)) loadDraft(items.find(i => i.id === id));
  }, [items]);
  const update = patch => setDraft(d => ({
    ...d,
    ...patch
  }));
  const loadDraft = item => {
    const d = normalizeInterface(item, moduleId);
    setDraft(d);
    setBaseline(JSON.stringify(d));
    setHeaderInvalid(false);
    setHeaderRevision(v => v + 1);
    setSections(!d.id || d.proxyType !== 'response' ? ['request'] : []);
    setMobileDetail(true);
  };
  const guard = action => {
    if (saving || busy) return;
    if (!dirty) {
      action();
      return;
    }
    if (confirmOpen.current) return;
    confirmOpen.current = true;
    modal.confirm({
      title: '有未保存的修改',
      content: '离开将丢弃当前草稿。也可以取消并先保存。',
      okText: '丢弃修改',
      cancelText: '继续编辑',
      onOk: () => {
        confirmOpen.current = false;
        if (draft) {
          setDraft(JSON.parse(baseline));
          setHeaderInvalid(false);
          setHeaderRevision(v => v + 1);
        }
        action();
      },
      onCancel: () => {
        confirmOpen.current = false;
      }
    });
  };
  const fetchModules = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const {
        data
      } = await axios.get('/cgi-bin/features');
      if (data.code !== 0) throw new Error(data.message);
      setFeatures(data.data || []);
      const list = data.data || [];
      const saved = featureId || localStorage.getItem('selectedFeatureId');
      setModuleId(list.some(f => f.id === saved) ? saved : list[0]?.id || null);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  const fetchItems = useCallback(async id => {
    if (!id) {
      setItems([]);
      return;
    }
    const version = ++fetchVersion.current;
    setListLoading(true);
    setError('');
    try {
      const {
        data
      } = await axios.get('/cgi-bin/interfaces', {
        params: {
          featureId: id
        }
      });
      if (data.code !== 0) throw new Error(data.message);
      if (version === fetchVersion.current) {
        setItems(data.data || []);
        setFeatures(prev => prev.map(f => f.id === id ? {
          ...f,
          interfaceCount: (data.data || []).length
        } : f));
      }
    } catch (e) {
      if (version === fetchVersion.current) setError(e.response?.data?.message || e.message);
    } finally {
      if (version === fetchVersion.current) setListLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchModules();
    axios.get('/cgi-bin/settings').then(({
      data
    }) => setSettings(data)).catch(() => {});
  }, [fetchModules]);
  useEffect(() => {
    fetchItems(moduleId);
  }, [moduleId, fetchItems]);
  useEffect(() => {
    setSelected(ids => visibleSelection(ids, filtered));
  }, [filtered]);
  useEffect(() => {
    if (!dirty && !saving) return;
    const unload = e => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', unload);
    const unblock = history.block((location, action) => {
      if (saving) return false;
      if (confirmOpen.current) return false;
      confirmOpen.current = true;
      modal.confirm({
        title: '有未保存的修改',
        content: '离开页面将丢弃草稿。',
        okText: '丢弃并离开',
        cancelText: '继续编辑',
        onOk: () => {
          confirmOpen.current = false;
          unblock();
          history[action === 'REPLACE' ? 'replace' : 'push'](location);
        },
        onCancel: () => {
          confirmOpen.current = false;
        }
      });
      return false;
    });
    return () => {
      unblock();
      window.removeEventListener('beforeunload', unload);
    };
  }, [dirty, saving, history, modal]);
  const selectModule = id => {
    // Re-selecting the current module must preserve its list and draft.
    // Its unchanged ID will not trigger the list-loading effect again.
    if (id === moduleId) return;
    guard(() => {
      setModuleId(id);
      localStorage.setItem('selectedFeatureId', id);
      setGroup(null);
      setSearch('');
      setDraft(null);
      setSelected([]);
      setItems([]);
      setMobileDetail(false);
    });
  };
  const add = () => guard(() => {
    if (!moduleId) {
      message.warning('请先创建功能模块');
      return;
    }
    loadDraft({});
  });
  const save = async () => {
    if (!draft || saving || busy) return;
    const validation = validateDraft(draft);
    if (validation || headerInvalid) {
      message.error(validation || '请修正 Headers 格式');
      return;
    }
    const payload = {
      ...draft,
      httpStatus: Number(draft.httpStatus),
      responseDelay: Number(draft.responseDelay)
    };
    setSaving(true);
    try {
      const {
        data
      } = payload.id ? await axios.patch(`/cgi-bin/interfaces/${payload.id}`, payload) : await axios.post('/cgi-bin/interfaces', payload);
      if (data.code !== 0) throw new Error(data.message);
      const saved = normalizeInterface({
        ...payload,
        ...data.data
      }, moduleId);
      setDraft(saved);
      setBaseline(JSON.stringify(saved));
      message.success('接口已保存');
      await fetchItems(moduleId);
      await refreshCacheAfterUpdate();
    } catch (e) {
      message.error(e.response?.data?.message || e.message || '保存失败，草稿已保留');
    } finally {
      setSaving(false);
    }
  };
  saveRef.current = save;
  useEffect(() => {
    const saveKey = () => saveRef.current?.();
    const focus = () => searchRef.current?.focus();
    const create = () => add();
    window.addEventListener('shortcut-save', saveKey);
    window.addEventListener('shortcut-focus-search', focus);
    window.addEventListener('shortcut-new-interface', create);
    return () => {
      window.removeEventListener('shortcut-save', saveKey);
      window.removeEventListener('shortcut-focus-search', focus);
      window.removeEventListener('shortcut-new-interface', create);
    };
  }, [dirty, saving, moduleId]);
  const patchItem = async (item, patch) => {
    setBusy(true);
    try {
      const {
        data
      } = await axios.patch(`/cgi-bin/interfaces/${item.id}`, patch);
      if (data.code !== 0) throw new Error(data.message);
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i,
        ...patch
      } : i));
      if (draft?.id === item.id) {
        const next = normalizeInterface({
          ...item,
          ...patch
        }, moduleId);
        setDraft(next);
        setBaseline(JSON.stringify(next));
        setHeaderRevision(v => v + 1);
      }
      await refreshCacheAfterUpdate();
      return true;
    } catch (e) {
      message.error(e.response?.data?.message || e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const activateResponse = responseId => guard(async () => {
    const saved = items.find(item => item.id === draft?.id);
    if (!saved || !saved.responses?.some(response => response.id === responseId)) return;
    if (await patchItem(saved, {
      activeResponseId: responseId
    })) message.success('默认响应已切换并生效');
  });
  const batch = async active => {
    const ids = visibleSelection(selected, filtered);
    if (!ids.length) return;
    setBusy(true);
    const results = await Promise.allSettled(ids.map(id => axios.patch(`/cgi-bin/interfaces/${id}`, {
      active
    }).then(({
      data
    }) => {
      if (data.code !== 0) throw new Error(data.message);
      return id;
    })));
    const failed = ids.filter((id, i) => results[i].status === 'rejected');
    await fetchItems(moduleId);
    if (draft?.id && ids.includes(draft.id) && !failed.includes(draft.id)) {
      const next = normalizeInterface({
        ...JSON.parse(baseline),
        active
      }, moduleId);
      setDraft(next);
      setBaseline(JSON.stringify(next));
    }
    setSelected(failed);
    setBusy(false);
    await refreshCacheAfterUpdate();
    if (failed.length) message.warning(`${ids.length - failed.length} 项成功，${failed.length} 项失败，请重试`);else message.success(`已${active ? '启用' : '禁用'} ${ids.length} 个接口`);
  };
  const remove = async item => {
    setBusy(true);
    try {
      const {
        data
      } = await axios.delete('/cgi-bin/interfaces', {
        params: {
          id: item.id
        }
      });
      if (data.code !== 0) throw new Error(data.message);
      if (draft?.id === item.id) setDraft(null);
      await fetchItems(moduleId);
      await refreshCacheAfterUpdate();
      message.success('已删除接口');
    } catch (e) {
      message.error(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };
  const toggleModule = feature => guard(async () => {
    setBusy(true);
    try {
      const {
        data
      } = await axios.patch('/cgi-bin/features', {
        active: feature.active === false
      }, {
        params: {
          id: feature.id
        }
      });
      if (data.code !== 0) throw new Error(data.message);
      setFeatures(prev => prev.map(f => f.id === feature.id ? {
        ...f,
        active: feature.active === false
      } : f));
      await refreshCacheAfterUpdate();
    } catch (e) {
      message.error(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  });
  const resize = (panel, event) => {
    event.preventDefault();
    const start = event.clientX,
      initial = widths[panel];
    const move = e => setWidths(w => ({
      ...w,
      [panel]: Math.max(panel === 'tree' ? 160 : 240, Math.min(panel === 'tree' ? 300 : 520, initial + e.clientX - start))
    }));
    const end = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
  };
  useEffect(() => {
    localStorage.setItem('mm-panel-widths', JSON.stringify(widths));
  }, [widths]);
  const separator = panel => <div className="mm-separator" role="separator" aria-label={panel === 'tree' ? '调整模块栏宽度' : '调整接口列表宽度'} aria-orientation="vertical" aria-valuenow={widths[panel]} aria-valuemin={panel === 'tree' ? 160 : 240} aria-valuemax={panel === 'tree' ? 300 : 520} tabIndex={0} onPointerDown={e => resize(panel, e)} onKeyDown={e => {
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      setWidths(w => ({
        ...w,
        [panel]: Math.max(panel === 'tree' ? 160 : 240, Math.min(panel === 'tree' ? 300 : 520, w[panel] + (e.key === 'ArrowRight' ? 16 : -16)))
      }));
    }
  }} />;
  const requestFields = <div className="mm-rule-fields"><Form layout="vertical"><Form.Item label="接口名称" required><Input aria-label="接口名称" value={draft?.name} onChange={e => update({
          name: e.target.value
        })} /></Form.Item><div className="mm-field-grid"><Form.Item label="HTTP 方法"><Select aria-label="HTTP 方法" value={draft?.httpMethod} options={httpMethods} onChange={v => update({
            httpMethod: v
          })} /></Form.Item><Form.Item label="处理方式"><Select aria-label="处理方式" value={draft?.proxyType} options={[...proxyTypes, {
            value: 'file',
            label: '本地文件'
          }]} onChange={v => update({
            proxyType: v
          })} /></Form.Item></div><Form.Item label="URL 匹配规则" required><Input className="mm-code" aria-label="URL 匹配规则" value={draft?.urlPattern} onChange={e => update({
          urlPattern: e.target.value
        })} placeholder="/api/users 或 /api/*" /></Form.Item><Form.Item label="分组"><Select mode="tags" aria-label="接口分组" value={draft?.group ? [draft.group] : []} options={groups.map(g => ({
          value: g,
          label: g
        }))} onChange={v => update({
          group: v[v.length - 1] || ''
        })} /></Form.Item>
    {['redirect', 'url_redirect'].includes(draft?.proxyType) && <><Form.Item label="目标 URL" required><Input aria-label="目标 URL" value={draft.targetUrl} onChange={e => update({
            targetUrl: e.target.value
          })} placeholder="https://example.com" /></Form.Item><Form.Item label="自定义请求头（JSON）"><HeaderFields key={`req-${headerRevision}`} value={draft.customHeaders} onChange={(value, invalid) => {
            update({
              customHeaders: value
            });
            setHeaderInvalid(invalid);
          }} /></Form.Item></>}
    {draft?.proxyType === 'file' && <Form.Item label="本地文件路径" required><Input aria-label="本地文件路径" value={draft.filePath} onChange={e => update({
          filePath: e.target.value
        })} /></Form.Item>}
    {draft && settings.interfaceParamMatcherEnabled !== false && <Form.Item label="接口入参匹配"><Matchers value={draft.paramMatchers} responses={draft.responses} onChange={v => update({
          paramMatchers: v
        })} /></Form.Item>}</Form></div>;
  const responseFields = <div className="mm-rule-fields"><Form layout="vertical">    <div className="mm-field-grid"><Form.Item label="HTTP 状态码"><InputNumber min={100} max={599} precision={0} aria-label="HTTP 状态码" value={draft?.httpStatus} onChange={v => update({
            httpStatus: v
          })} /></Form.Item><Form.Item label="延迟（毫秒）"><InputNumber min={0} aria-label="响应延迟" value={draft?.responseDelay} onChange={v => update({
            responseDelay: v
          })} /></Form.Item></div><Form.Item label="Content-Type"><Select showSearch aria-label="Content-Type" value={draft?.contentType} options={contentTypes} onChange={v => update({
          contentType: v
        })} /></Form.Item><Form.Item label="接口启用状态"><Switch aria-label="接口启用状态" checked={draft?.active} onChange={v => update({
          active: v
        })} /></Form.Item>
    {draft && !['redirect', 'url_redirect'].includes(draft.proxyType) && <Form.Item label="自定义响应头（JSON）"><HeaderFields key={`res-${headerRevision}`} value={draft.headers} onChange={(value, invalid) => {
          update({
            headers: value
          });
          setHeaderInvalid(invalid);
        }} /></Form.Item>}
    </Form></div>;
  const resetLayout = () => {
    const alreadyDefault = widths.tree === 210 && widths.list === 320 && !collapsed && !dense && hiddenColumns.length === 0;
    setWidths({
      tree: 210,
      list: 320
    });
    setCollapsed(false);
    setDense(false);
    setHiddenColumns([]);
    localStorage.setItem('mm-tree-collapsed', 'false');
    localStorage.setItem('mm-list-density', 'comfortable');
    localStorage.removeItem('mm-hidden-columns');
    if (alreadyDefault) message.info('当前已是默认布局，无需恢复');else message.success('已恢复默认布局：面板宽度、模块树、列表密度和显示列');
  };
  if (loading) return <div className="mm-workbench-loading"><Spin tip="加载工作空间…"><div /></Spin></div>;
  return <div className={`mm-workbench ${collapsed ? 'is-tree-collapsed' : ''} ${mobileDetail ? 'is-mobile-detail' : ''} ${dense ? 'is-compact' : ''}`} style={{
    '--tree-width': `${widths.tree}px`,
    '--list-width': `${widths.list}px`
  }}>
    <div className="mm-workbench-heading"><PageHeader kicker="API WORKSPACE" title={activeFeature?.name || '接口工作台'} description="配置规则、管理响应，让调试保持连贯。" actions={<><Dropdown trigger={['click']} menu={{
          items: [{
            key: 'tree',
            label: collapsed ? '展开模块树' : '收起模块树'
          }, {
            key: 'density',
            label: dense ? '切换为舒适密度' : '切换为紧凑密度'
          }, {
            type: 'divider'
          }, {
            key: 'reset',
            label: '恢复默认布局'
          }],
          onClick: ({
            key
          }) => {
            if (key === 'reset') resetLayout();
            if (key === 'tree') setCollapsed(v => {
              localStorage.setItem('mm-tree-collapsed', String(!v));
              return !v;
            });
            if (key === 'density') setDense(v => {
              localStorage.setItem('mm-list-density', !v ? 'compact' : 'comfortable');
              return !v;
            });
          }
        }}><Button aria-label="工作台布局" icon={<SettingOutlined />}>布局</Button></Dropdown><Button icon={tableMode ? <AppstoreOutlined /> : <TableOutlined />} onClick={() => {
          guard(() => {
            setTableMode(v => {
              localStorage.setItem('mm-interface-view', !v ? 'table' : 'list');
              return !v;
            });
          });
        }}>{tableMode ? '工作台' : '批量表格'}</Button>{tableMode && <Popover title="显示列" trigger="click" content={<Checkbox.Group value={['状态', '名称', '方法', '路径', '分组', '处理方式', '状态码', '延迟', '当前默认响应', '操作'].filter(c => !hiddenColumns.includes(c))} options={['状态', '名称', '方法', '路径', '分组', '处理方式', '状态码', '延迟', '当前默认响应', '操作']} onChange={values => {
          const hidden = ['状态', '名称', '方法', '路径', '分组', '处理方式', '状态码', '延迟', '当前默认响应', '操作'].filter(c => !values.includes(c));
          setHiddenColumns(hidden);
          localStorage.setItem('mm-hidden-columns', JSON.stringify(hidden));
        }} />}><Button icon={<SettingOutlined />}>显示列</Button></Popover>}<Button aria-label="刷新接口" icon={<ReloadOutlined />} disabled={saving || busy} onClick={() => guard(() => fetchItems(moduleId))} /><Button type="primary" icon={<PlusOutlined />} disabled={!moduleId || saving} onClick={add}>新建接口</Button></>} /></div>
    {error && <Alert className="mm-workbench-alert" type="error" showIcon message="加载失败" description={error} action={<Button onClick={() => moduleId ? fetchItems(moduleId) : fetchModules()}>重试</Button>} />}
    {activeFeature?.active === false && <Alert className="mm-workbench-alert" type="warning" showIcon message="模块已禁用：关联接口不会生效，仍可编辑配置。" />}
    <div className="mm-workbench-grid">
      <aside className="mm-module-tree"><div className="mm-panel-label">功能模块 <Button type="text" size="small" aria-label="管理模块" icon={<SettingOutlined />} onClick={() => history.push('/')} /></div>{features.map(f => <div className="mm-module-row" key={f.id}><button className={`mm-module-button ${f.id === moduleId ? 'is-active' : ''}`} onClick={() => selectModule(f.id)}><span>{f.name}<small>{f.active === false ? '已禁用' : '已启用'}</small></span><span className="mm-count">{f.interfaceCount || 0}</span></button><Switch aria-label={`启用模块 ${f.name}`} size="small" disabled={busy || saving} checked={f.active !== false} onChange={() => toggleModule(f)} /></div>)}<div className="mm-panel-label mm-group-label">接口分组</div><button className={`mm-group-button ${!group ? 'is-active' : ''}`} onClick={() => setGroup(null)}>全部接口 <span>{items.length}</span></button>{groups.map(g => <button key={g} className={`mm-group-button ${group === g ? 'is-active' : ''}`} onClick={() => setGroup(g)}>{g}<span>{items.filter(i => i.group === g).length}</span></button>)}</aside>
      {separator('tree')}
      <section className={`mm-interface-panel ${tableMode ? 'mm-table-panel' : ''}`} aria-label="接口列表"><div className="mm-list-toolbar"><Select className="mm-mobile-module" aria-label="功能模块" value={moduleId} options={features.map(f => ({
            value: f.id,
            label: f.name
          }))} onChange={selectModule} /><Input.Search ref={searchRef} placeholder="搜索接口名称或 URL" aria-label="搜索接口" allowClear value={search} onChange={e => setSearch(e.target.value)} /><div className="mm-list-meta"><span>{filtered.length} 个接口{group ? ` · ${group}` : ''}</span><Button size="small" type="text" onClick={() => setDense(v => {
              localStorage.setItem('mm-list-density', !v ? 'compact' : 'comfortable');
              return !v;
            })}>{dense ? '舒适' : '紧凑'}</Button></div><Select className="mm-mobile-module" aria-label="接口分组" allowClear placeholder="全部分组" value={group || undefined} onChange={v => setGroup(v || null)} options={groups.map(g => ({
            value: g,
            label: g
          }))} />
        <div className="mm-selection"><Checkbox checked={filtered.length > 0 && selected.length === filtered.length} indeterminate={selected.length > 0 && selected.length < filtered.length} onChange={e => setSelected(e.target.checked ? filtered.map(i => i.id) : [])}>全选</Checkbox>{selected.length > 0 && <Space wrap><span>{selected.length} 项</span><Button size="small" disabled={busy || saving} onClick={() => guard(() => batch(true))}>启用</Button><Button size="small" disabled={busy || saving} onClick={() => guard(() => batch(false))}>禁用</Button></Space>}</div>
      </div>
      {listLoading ? <div className="mm-panel-empty"><Spin /></div> : filtered.length === 0 ? <div className="mm-panel-empty"><Empty description={features.length ? '暂无接口或没有匹配结果' : '请先创建功能模块'} /><Button onClick={() => features.length ? add() : history.push('/')}>{features.length ? '新建接口' : '创建模块'}</Button></div> : tableMode ? <Table rowKey="id" size="small" scroll={{
          x: 900
        }} pagination={{
          pageSize: 20,
          showSizeChanger: true
        }} rowSelection={{
          selectedRowKeys: selected,
          onChange: setSelected
        }} dataSource={filtered} columns={[{
          title: '状态',
          dataIndex: 'active',
          render: (v, i) => <Switch size="small" checked={v !== false} disabled={busy || saving} onChange={active => guard(() => patchItem(i, {
            active
          }))} />
        }, {
          title: '名称',
          dataIndex: 'name',
          render: (v, i) => <Button type="link" onClick={() => guard(() => {
            setTableMode(false);
            loadDraft(i);
          })}>{v}</Button>
        }, {
          title: '方法',
          dataIndex: 'httpMethod'
        }, {
          title: '路径',
          dataIndex: 'urlPattern',
          ellipsis: true
        }, {
          title: '分组',
          dataIndex: 'group'
        }, {
          title: '处理方式',
          dataIndex: 'proxyType'
        }, {
          title: '状态码',
          dataIndex: 'httpStatus'
        }, {
          title: '延迟',
          dataIndex: 'responseDelay'
        }, {
          title: '当前默认响应',
          render: (_, i) => <Select value={i.activeResponseId} disabled={busy || saving || i.proxyType !== 'response'} options={(i.responses || []).map(r => ({
            value: r.id,
            label: r.name
          }))} onChange={id => guard(() => patchItem(i, {
            activeResponseId: id
          }))} />
        }, {
          title: '操作',
          render: (_, i) => <Space><Button onClick={() => guard(() => {
              setTableMode(false);
              loadDraft(duplicateInterface(i, moduleId));
            })}>复制</Button><Popconfirm title="删除此接口？" onConfirm={() => guard(() => remove(i))}><Button danger>删除</Button></Popconfirm></Space>
        }].filter(column => !hiddenColumns.includes(column.title))} /> : <div className="mm-request-list">{filtered.map(i => <div key={i.id} className={`mm-request-row ${draft?.id === i.id ? 'is-active' : ''}`}><Checkbox aria-label={`选择 ${i.name}`} checked={selected.includes(i.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, i.id] : prev.filter(id => id !== i.id))} /><button className="mm-request-button" onClick={() => guard(() => loadDraft(i))}><div><span className={`mm-method mm-method-${i.httpMethod}`}>{i.httpMethod || 'ALL'}</span><strong>{i.name}</strong></div><code title={i.urlPattern}>{i.urlPattern}</code><small>{i.proxyType === 'response' ? (i.responses || []).find(r => r.id === i.activeResponseId)?.name || '默认响应' : i.proxyType}</small></button><Switch aria-label={`启用 ${i.name}`} size="small" checked={i.active !== false} disabled={busy || saving} onChange={active => guard(() => patchItem(i, {
              active
            }))} /></div>)}</div>}
      </section>
      {!tableMode && separator('list')}
      {!tableMode && <section className="mm-detail-panel" aria-label="接口编辑">{draft ? <><div className="mm-detail-heading"><Button className="mm-back-list" icon={<ArrowLeftOutlined />} onClick={() => guard(() => setMobileDetail(false))}>返回列表</Button><div><Tag>{draft.httpMethod}</Tag><h2>{draft.id ? draft.name || '未命名接口' : '新建接口'}</h2><Typography.Text type="secondary">{draft.urlPattern || '先设置接口名称和匹配规则'}</Typography.Text></div><Space><Button aria-label="复制当前接口" icon={<CopyOutlined />} disabled={saving} onClick={() => guard(() => loadDraft(duplicateInterface(draft, moduleId)))} />{draft.id && <Popconfirm title="删除此接口？" onConfirm={() => guard(() => remove(draft))}><Button danger aria-label="删除当前接口" icon={<DeleteOutlined />} disabled={saving || busy} /></Popconfirm>}</Space></div>
      <div className="mm-detail-body" inert={saving || busy ? '' : undefined}><Collapse className="mm-config-sections" activeKey={sections} onChange={setSections} items={[{
              key: 'request',
              label: <span className="mm-section-label"><strong>接口与匹配规则</strong><span>{draft.httpMethod} · {draft.proxyType === 'response' ? '模拟响应' : draft.proxyType} · {draft.paramMatchers?.length || 0} 个条件{settings.interfaceParamMatcherEnabled === false ? '（条件匹配已关闭）' : ''}</span></span>,
              children: requestFields
            }, {
              key: 'response-options',
              label: <span className="mm-section-label"><strong>响应选项</strong><span>HTTP {draft.httpStatus} · {draft.responseDelay || 0} ms{Object.keys(draft.headers || {}).length ? ' · 自定义响应头' : ''}</span></span>,
              children: responseFields
            }]} />
      {draft.proxyType === 'response' ? <section className="mm-response-main" aria-label="响应编辑区"><h3>响应内容</h3><ResponseEditor key={draft.id || headerRevision} responses={draft.responses} activeResponseId={draft.activeResponseId} savedResponseIds={(items.find(item => item.id === draft.id)?.responses || []).map(response => response.id)} onActivateResponse={activateResponse} contentType={draft.contentType} disabled={saving || busy} matchersEnabled={settings.responseParamMatcherEnabled !== false} onChange={responses => update({
                responses
              })} onDefaultChange={activeResponseId => update({
                activeResponseId
              })} /></section> : <Alert className="mm-error" type="info" message={draft.proxyType === 'file' ? '此接口返回本地文件，请在接口与匹配规则中配置文件路径。' : '此接口转发到目标地址，请在接口与匹配规则中配置目标 URL。'} />}
      <div className="mm-sniffer-hint"><Typography.Text type="secondary">需要从真实接口获取响应？</Typography.Text><Button type="link" size="small" onClick={() => history.push('/sniffer')}>打开接口嗅探</Button></div></div>
      <footer className="mm-save-bar"><span aria-live="polite">{saving ? '保存中…' : dirty ? '● 有未保存修改' : '修改后保存生效'}</span><Space><Button disabled={!dirty || saving || busy} onClick={() => guard(() => loadDraft(JSON.parse(baseline)))}>还原</Button><Button type="primary" loading={saving} disabled={busy} onClick={save}>保存接口</Button></Space></footer></> : <div className="mm-panel-empty"><Empty description="选择接口，开始编辑规则和响应" /><Button type="primary" disabled={!moduleId} onClick={add}>新建接口</Button></div>}</section>}
    </div>
  </div>;
}
