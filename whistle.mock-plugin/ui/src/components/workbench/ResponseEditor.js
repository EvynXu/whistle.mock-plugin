import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Alert, Button, Collapse, Input, Modal, Popconfirm, Select, Space, Typography, message } from 'antd';
import { CopyOutlined, DeleteOutlined, PlusOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import Mock from 'mockjs';
import Matchers from './Matchers';
import { createId } from './model';

const ResponseCodeEditor = lazy(() => import('./ResponseCodeEditor'));
export default function ResponseEditor({
  responses,
  activeResponseId,
  onChange,
  onDefaultChange,
  onActivateResponse,
  savedResponseIds = [],
  contentType = 'application/json',
  disabled = false,
  matchersEnabled = true
}) {
  const [editingId, setEditingId] = useState(activeResponseId);
  useEffect(() => {
    setEditingId(activeResponseId);
  }, [activeResponseId]);
  const [preview, setPreview] = useState(null);
  const current = responses.find(r => r.id === editingId) || responses.find(r => r.id === activeResponseId) || responses[0];
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    setSettingsOpen(!!current && !savedResponseIds.includes(current.id));
    setPreview(null);
  }, [current?.id]);
  const index = current ? responses.findIndex(r => r.id === current.id) : -1;
  const update = patch => onChange(responses.map(r => r.id === current.id ? {
    ...r,
    ...patch
  } : r));
  let error = null;
  if (current && contentType.includes('json')) {
    try {
      JSON.parse(current.content);
    } catch (e) {
      error = e.message;
    }
  }
  const add = source => {
    const r = {
      ...(source || {}),
      id: createId(),
      name: source ? `${source.name} - 副本` : `响应 ${responses.length + 1}`,
      content: source?.content ?? '{\n  "code": 0,\n  "data": {}\n}',
      paramMatchers: source?.paramMatchers ? JSON.parse(JSON.stringify(source.paramMatchers)) : []
    };
    onChange([...responses, r]);
    setEditingId(r.id);
    if (!responses.length) onDefaultChange(r.id);
  };
  const remove = () => {
    const next = responses.filter(r => r.id !== current.id);
    onChange(next);
    if (current.id === activeResponseId) onDefaultChange(next[0].id);
    setEditingId(next[0].id);
  };
  const move = delta => {
    const next = [...responses];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  };
  const format = () => {
    try {
      update({
        content: JSON.stringify(JSON.parse(current.content), null, 2)
      });
    } catch (e) {
      message.error(`JSON 格式有误：${e.message}`);
    }
  };
  const showPreview = () => {
    try {
      setPreview(contentType.includes('json') ? JSON.stringify(Mock.mock(JSON.parse(current.content)), null, 2) : current.content);
    } catch (e) {
      message.error(e.message);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.content);
      message.success('已复制');
    } catch (e) {
      message.error('复制失败，请手动选择内容复制');
    }
  };
  return <div className="mm-response-editor">
    <div className="mm-editor-toolbar"><Select aria-label="切换响应并启用" value={current?.id} onChange={id => {
        if (savedResponseIds.includes(id) && onActivateResponse) onActivateResponse(id);else {
          setEditingId(id);
          onDefaultChange(id);
        }
      }} options={responses.map(r => ({
        value: r.id,
        label: `${r.name}${r.id === activeResponseId ? ' · 默认' : ''}${savedResponseIds.includes(r.id) ? '' : ' · 未保存'}`
      }))} /><Space wrap><Button icon={<PlusOutlined />} onClick={() => add()}>新增</Button><Button icon={<CopyOutlined />} disabled={!current} onClick={() => add(current)}>复制</Button></Space></div>
    <Typography.Text type="secondary">选择已保存响应即切换默认并生效；新增响应需保存。条件匹配可能选择其他响应。</Typography.Text>
    {current ? <>
      <div className="mm-response-settings"><Collapse className="mm-config-sections" activeKey={settingsOpen ? ['settings'] : []} onChange={keys => setSettingsOpen(keys.includes('settings'))} items={[{
        key: 'settings',
        label: <span className="mm-section-label"><strong>响应设置</strong><span>名称、说明、排序 · {current.paramMatchers?.length || 0} 个匹配条件{!matchersEnabled ? '（条件匹配已关闭）' : ''}</span></span>,
        children: <>      <div className="mm-editor-toolbar"><Input aria-label="响应名称" value={current.name} onChange={e => update({
              name: e.target.value
            })} /><Space wrap><Button disabled={index <= 0} aria-label="响应上移" icon={<ArrowUpOutlined />} onClick={() => move(-1)} /><Button disabled={index >= responses.length - 1} aria-label="响应下移" icon={<ArrowDownOutlined />} onClick={() => move(1)} /><Popconfirm title={current.id === activeResponseId ? '删除后第一个响应将作为默认响应，保存后生效。' : '删除此响应？保存后生效。'} onConfirm={remove}><Button danger disabled={responses.length <= 1} aria-label="删除响应" icon={<DeleteOutlined />} /></Popconfirm></Space></div>
      <Input aria-label="响应说明" placeholder="响应说明（可选）" value={current.description || ''} onChange={e => update({
            description: e.target.value
          })} />
      {matchersEnabled && <section className="mm-editor-section"><h3>响应入参匹配</h3><p>全部条件满足时返回此响应；按响应顺序检查。</p><Matchers value={current.paramMatchers || []} onChange={paramMatchers => update({
              paramMatchers
            })} /></section>}
        </>
      }]} /></div>
      <div className="mm-editor-toolbar"><Typography.Text type="secondary">{contentType.includes('json') ? 'JSON / Mock.js 模板' : '纯文本内容'}</Typography.Text><Space wrap>{contentType.includes('json') && <Button size="small" onClick={format}>格式化</Button>}<Button size="small" onClick={copy}>复制内容</Button><Button size="small" aria-label="预览响应" onClick={showPreview}>预览</Button></Space></div>
      <Suspense fallback={<div role="status" style={{ minHeight: 180, padding: 16 }}>正在加载代码编辑器…</div>}><ResponseCodeEditor key={current.id} value={current.content} onChange={content => update({content})} isJSON={contentType.includes('json')} disabled={disabled} /></Suspense>
      {error && <Alert className="mm-error" type="error" showIcon message="JSON 语法错误" description={error} />}
    </> : <Button onClick={() => add()}>创建第一个响应</Button>}
    <Modal title="响应预览" width={800} open={preview !== null} onCancel={() => setPreview(null)} footer={null}><pre className="mm-preview-code">{preview}</pre></Modal>
  </div>;
}
