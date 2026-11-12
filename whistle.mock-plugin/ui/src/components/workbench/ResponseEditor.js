import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert, App, Button, Collapse, Input, Modal, Select, Space, Typography } from 'antd';
import { CopyOutlined, DeleteOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons';
import Mock from 'mockjs';
import Matchers from './Matchers';
import { createId } from './model';

const ResponseCodeEditor = lazy(() => import('./ResponseCodeEditor'));
const ghostPosition = (x, y) => `translate(${Math.max(8, Math.min(x + 14, window.innerWidth - 288))}px, ${Math.max(8, Math.min(y + 12, window.innerHeight - 48))}px)`;
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
  const { message, modal } = App.useApp();
  const [editingId, setEditingId] = useState(activeResponseId);
  const [search, setSearch] = useState('');
  const drag = useRef(null);
  const ghost = useRef(null);
  const [dragged, setDragged] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  useEffect(() => () => drag.current?.dispose(), []);
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
  const conditionCount = current?.paramMatchers?.length || 0;
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
  const confirmRemove = () => {
    if (!current || responses.length <= 1) return;
    const next = responses.filter(r => r.id !== current.id);
    const removesDefault = current.id === activeResponseId;
    modal.confirm({
      title: '删除响应？',
      content: <div className="mm-response-delete-confirm">
        <p>将从当前草稿移除「{current.name || '未命名响应'}」，点击「保存接口」后生效。</p>
        {removesDefault && <p>「{next[0].name || '未命名响应'}」将成为默认响应。</p>}
      </div>,
      okText: '移除响应',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        onChange(next);
        if (removesDefault) onDefaultChange(next[0].id);
        setEditingId(next[0].id);
      }
    });
  };
  const moveWithKeyboard = event => {
    if (!canDrag || drag.current || !event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const target = index + (event.key === 'ArrowUp' ? -1 : 1);
    if (index < 0 || target < 0 || target >= responses.length) return;
    const next = [...responses];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const canDrag = !disabled && responses.length > 1 && !search.trim();
  const endDrag = () => {
    drag.current?.dispose();
    drag.current = null;
    setDragged(null);
    setDropTarget(null);
  };
  const targetAt = (x, y) => {
    const option = document.elementFromPoint(x, y)?.closest('.ant-select-item-option');
    if (!option || !drag.current?.viewport?.contains(option)) return null;
    const id = option.querySelector('[data-response-option]')?.dataset.responseOption;
    if (!id || id === drag.current.id) return null;
    const bounds = option.getBoundingClientRect();
    return { id, edge: y >= bounds.top + bounds.height / 2 ? 'after' : 'before' };
  };
  const updateTarget = (x, y) => {
    const next = targetAt(x, y);
    setDropTarget(target => target?.id === next?.id && target?.edge === next?.edge ? target : next);
  };
  const startDrag = (event, option) => {
    if (event.button !== 0 || drag.current) return;
    event.preventDefault();
    const handle = event.currentTarget;
    const viewport = handle.closest('.rc-virtual-list-holder');
    if (!viewport) return;
    // The virtual list can unmount the source option while scrolling.
    viewport.setPointerCapture(event.pointerId);
    const gesture = {
      id: String(option.value), label: option.label, pointerId: event.pointerId,
      viewport, x: event.clientX, y: event.clientY, moved: false
    };
    viewport.addEventListener('pointermove', dragMove);
    viewport.addEventListener('pointerup', dropResponse);
    viewport.addEventListener('lostpointercapture', endDrag);
    gesture.dispose = () => {
      cancelAnimationFrame(gesture.frame);
      viewport.removeEventListener('pointermove', dragMove);
      viewport.removeEventListener('pointerup', dropResponse);
      viewport.removeEventListener('lostpointercapture', endDrag);
    };
    drag.current = gesture;
    const scroll = () => {
      if (drag.current !== gesture) return;
      const { left, right, top, bottom } = viewport.getBoundingClientRect();
      if (gesture.x >= left && gesture.x <= right && gesture.y >= top && gesture.y <= bottom) {
        const direction = gesture.y < top + 20 ? -1 : gesture.y > bottom - 20 ? 1 : 0;
        const previous = viewport.scrollTop;
        viewport.scrollTop += direction * 8;
        if (viewport.scrollTop !== previous) updateTarget(gesture.x, gesture.y);
      }
      gesture.frame = requestAnimationFrame(scroll);
    };
    gesture.scroll = scroll;
  };
  const dragMove = event => {
    const gesture = drag.current;
    if (gesture?.pointerId !== event.pointerId) return;
    const { clientX: x, clientY: y } = event;
    if (!gesture.moved) {
      if (Math.hypot(x - gesture.x, y - gesture.y) < 5) return;
      gesture.moved = true;
      setDragged({ id: gesture.id, label: gesture.label, x, y });
      gesture.frame = requestAnimationFrame(gesture.scroll);
    }
    gesture.x = x;
    gesture.y = y;
    if (ghost.current) ghost.current.style.transform = ghostPosition(x, y);
    updateTarget(x, y);
  };
  const dropResponse = event => {
    if (drag.current?.pointerId !== event.pointerId) return;
    const sourceId = drag.current?.id;
    const target = drag.current.moved ? targetAt(event.clientX, event.clientY) : null;
    endDrag();
    if (!target) return;
    const from = responses.findIndex(response => String(response.id) === sourceId);
    const to = responses.findIndex(response => String(response.id) === target.id);
    if (from < 0 || to < 0) return;
    const insertionIndex = to + Number(target.edge === 'after') - Number(from < to);
    if (insertionIndex === from) return;
    const next = [...responses];
    next.splice(from, 1);
    next.splice(insertionIndex, 0, responses[from]);
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
    <div className="mm-editor-toolbar mm-response-switcher">
      <Select aria-label="搜索或切换响应" placeholder="搜索响应名称或说明" value={current?.id} disabled={disabled} showSearch
        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown" onInputKeyDown={moveWithKeyboard}
        searchValue={search} onSearch={setSearch} onOpenChange={open => {
          if (!open) {
            setSearch('');
            endDrag();
          }
        }}
        filterOption={(input, option) => option.searchText.includes(input.trim().toLowerCase())}
        notFoundContent="没有匹配的响应"
        dropdownRender={list => <>{list}{responses.length > 1 && <div className="mm-response-sort-note">
          {search.trim() ? '清空搜索后可拖拽排序' : '拖动手柄或按 Alt + ↑ / ↓ 排序，保存接口后生效'}
        </div>}</>}
        optionRender={({ data }) => <div className="mm-response-option" data-response-option={data.value}
          data-dragging={dragged?.id === String(data.value) || undefined}
          data-drop={dropTarget?.id === String(data.value) ? dropTarget.edge : undefined}>
          {canDrag && <span className="mm-response-drag-handle" title="拖动排序"
            onClick={event => event.stopPropagation()} onPointerDown={event => startDrag(event, data)}><HolderOutlined /></span>}
          <span>{data.label}</span>
          {data.description && <span className="mm-response-option-description" title={data.description}>{data.description}</span>}
        </div>}
        onChange={id => {
          if (savedResponseIds.includes(id) && onActivateResponse) {
            onActivateResponse(id);
            return;
          }
          setEditingId(id);
          onDefaultChange(id);
        }}
        options={responses.map(r => ({
          value: r.id,
          label: `${r.name || '未命名响应'}${r.id === activeResponseId ? ' · 默认' : ''}${savedResponseIds.includes(r.id) ? '' : ' · 未保存'}`,
          description: r.description,
          searchText: `${r.name || '未命名响应'} ${r.description || ''}`.toLowerCase()
        }))} />
      <Space wrap>
        <Button icon={<PlusOutlined />} disabled={disabled} onClick={() => add()}>新增</Button>
        <Button icon={<CopyOutlined />} disabled={disabled || !current} onClick={() => add(current)}>复制</Button>
        <Button danger aria-label="删除当前响应" icon={<DeleteOutlined />} disabled={disabled || responses.length <= 1} onClick={confirmRemove}>删除</Button>
      </Space>
    </div>
    {dragged && createPortal(<div ref={ghost} aria-hidden="true" className="mm-response-drag-preview"
      style={{ transform: ghostPosition(dragged.x, dragged.y) }}><HolderOutlined /><span>{dragged.label}</span></div>, document.body)}
    <Typography.Text type="secondary" className="mm-response-switch-note">可按名称或说明搜索。选择已保存的响应会立即切换默认响应。</Typography.Text>
    {current ? <>
      <Collapse className="mm-config-sections mm-response-settings" activeKey={settingsOpen ? ['settings'] : []} onChange={keys => setSettingsOpen(keys.includes('settings'))} items={[{
        key: 'settings',
        label: <span className="mm-section-label">
          <strong>名称、说明与匹配条件</strong>
          <span>{conditionCount} 个条件{!matchersEnabled ? ' · 条件匹配已关闭' : ''}</span>
        </span>,
        children: <>
          <div className="mm-response-fields">
            <label>响应名称<Input value={current.name} onChange={e => update({ name: e.target.value })} /></label>
            <label>响应说明<Input placeholder="可选" value={current.description || ''} onChange={e => update({ description: e.target.value })} /></label>
          </div>
          {matchersEnabled && <section className="mm-editor-section">
            <h3>响应入参匹配</h3>
            <p>按响应顺序检查，优先返回第一个满足全部条件的响应。</p>
            <Matchers value={current.paramMatchers || []} onChange={paramMatchers => update({ paramMatchers })} />
          </section>}
        </>
      }]} />
      <div className="mm-editor-toolbar"><Typography.Text type="secondary">{contentType.includes('json') ? 'JSON / Mock.js 模板' : '纯文本内容'}</Typography.Text><Space wrap>{contentType.includes('json') && <Button size="small" onClick={format}>格式化</Button>}<Button size="small" onClick={copy}>复制内容</Button><Button size="small" aria-label="预览响应" onClick={showPreview}>预览</Button></Space></div>
      <Suspense fallback={<div role="status" style={{ minHeight: 180, padding: 16 }}>正在加载代码编辑器…</div>}><ResponseCodeEditor key={current.id} value={current.content} onChange={content => update({content})} isJSON={contentType.includes('json')} disabled={disabled} /></Suspense>
      {error && <Alert className="mm-error" type="error" showIcon message="JSON 语法错误" description={error} />}
    </> : <Button onClick={() => add()}>创建第一个响应</Button>}
    <Modal title="响应预览" width={800} open={preview !== null} onCancel={() => setPreview(null)} footer={null}><pre className="mm-preview-code">{preview}</pre></Modal>
  </div>;
}
