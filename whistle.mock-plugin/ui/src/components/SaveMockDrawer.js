import React, { useEffect, useState } from 'react';
import { Alert, App, Button, Drawer, Form, Input, Select, Switch, Typography } from 'antd';
import axios from 'axios';
import { createId } from './workbench/model';
import { refreshCacheAfterUpdate } from './interface-management/utils';
export default function SaveMockDrawer({
  open,
  onClose,
  response,
  initialActive = true,
  source = '真实接口录制'
}) {
  const {
    message
  } = App.useApp();
  const [form] = Form.useForm();
  const [features, setFeatures] = useState([]),
    [interfaces, setInterfaces] = useState([]);
  const [mode, setMode] = useState('new'),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  const featureId = Form.useWatch('featureId', form);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setMode('new');
    setError('');
    setFeatures([]);
    setInterfaces([]);
    form.resetFields();
    let pattern = response?.request?.url || '';
    try {
      pattern = new URL(pattern).pathname;
    } catch (e) {/* Keep manually supplied paths. */}
    form.setFieldsValue({
      urlPattern: pattern,
      name: pattern ? `${response?.request?.method || 'GET'} ${pattern}` : '',
      active: initialActive,
      contentType: String(Object.entries(response?.headers || {}).find(([key]) => key.toLowerCase() === 'content-type')?.[1] || 'text/plain; charset=utf-8').replace(/charset\s*=\s*["']?[^;\s"']+["']?/i, 'charset=utf-8')
    });
    axios.get('/cgi-bin/features').then(({
      data
    }) => {
      if (!live) return;
      if (data.code !== 0) throw new Error(data.message);
      setFeatures(data.data || []);
      form.setFieldValue('featureId', data.data?.[0]?.id);
    }).catch(e => {
      if (live) setError(e.message || '获取模块失败');
    });
    return () => {
      live = false;
    };
  }, [open, retry]);
  useEffect(() => {
    if (!open || !featureId) return;
    let live = true;
    setInterfaces([]);
    form.setFieldValue('interfaceId', undefined);
    axios.get('/cgi-bin/interfaces', {
      params: {
        featureId
      }
    }).then(({
      data
    }) => {
      if (!live) return;
      if (data.code !== 0) throw new Error(data.message);
      setInterfaces((data.data || []).filter(item => item.proxyType === 'response' || !item.proxyType));
    }).catch(e => {
      if (live) message.error(e.message || '读取接口失败');
    });
    return () => {
      live = false;
    };
  }, [featureId, open]);
  const save = async () => {
    if (saving) return;
    try {
      const values = await form.validateFields();
      if (!response || response.incomplete || typeof response.body !== 'string') throw new Error('没有完整的文本响应，无法保存');
      setSaving(true);
      const id = createId();
      const recorded = {
        id,
        name: mode === 'append' ? values.name : '默认响应',
        description: `来自${source}`,
        content: response.body,
        paramMatchers: []
      };
      let data;
      if (mode === 'append') {
        const result = await axios.get('/cgi-bin/interfaces', {
          params: {
            featureId: values.featureId
          }
        });
        if (result.data.code !== 0) throw new Error(result.data.message);
        const item = result.data.data.find(item => item.id === values.interfaceId);
        if (!item || item.proxyType && item.proxyType !== 'response') throw new Error('目标接口不存在或不是模拟响应模式');
        if (item.contentType?.toLowerCase().includes('json')) {
          try {
            JSON.parse(recorded.content);
          } catch (e) {
            throw new Error('目标接口使用 JSON，但当前响应不是有效 JSON，请改为创建纯文本 Mock。');
          }
        }
        const responses = item.responses?.length ? item.responses : [{
          id: createId(),
          name: '默认响应',
          content: item.responseContent || '{}',
          paramMatchers: []
        }];
        ({
          data
        } = await axios.patch(`/cgi-bin/interfaces/${item.id}`, {
          responses: [...responses, recorded],
          activeResponseId: item.activeResponseId || responses[0].id
        }));
      } else {
        const contentType = values.contentType || 'text/plain; charset=utf-8';
        if (contentType.toLowerCase().includes('json')) {
          try { JSON.parse(recorded.content); } catch (e) { throw new Error('响应不是有效 JSON，可将 Content-Type 改为 text/plain 后保存。'); }
        }
        ({
          data
        } = await axios.post('/cgi-bin/interfaces', {
          name: values.name,
          featureId: values.featureId,
          urlPattern: values.urlPattern,
          httpMethod: response.request?.method || 'GET',
          proxyType: 'response',
          httpStatus: Number(response.status) || 200,
          contentType,
          active: values.active,
          responseContent: recorded.content,
          responses: [recorded],
          activeResponseId: id
        }));
      }
      if (data.code !== 0) throw new Error(data.message);
      await refreshCacheAfterUpdate();
      message.success(mode === 'append' ? '已追加响应（默认响应未切换）' : '已创建 Mock 接口');
      onClose();
    } catch (e) {
      if (!e.errorFields) message.error(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };
  return <Drawer title="保存为 Mock" open={open} onClose={() => !saving && onClose()} width="min(480px, 100vw)" footer={<div className="mm-save-footer"><Button disabled={saving} onClick={onClose}>取消</Button><Button type="primary" loading={saving} disabled={!features.length || !!error} onClick={save}>{mode === 'append' ? '追加响应' : '创建接口'}</Button></div>}>
    {error && <Alert type="error" message={error} action={<Button onClick={() => setRetry(v => v + 1)}>重试</Button>} />}
    <Form form={form} layout="vertical"><Form.Item label="保存方式"><Select aria-label="Mock 保存方式" value={mode} onChange={setMode} options={[{
          value: 'new',
          label: '创建 Mock 接口'
        }, {
          value: 'append',
          label: '追加到已有接口'
        }]} /></Form.Item>
      <Form.Item name="featureId" label="功能模块" rules={[{
        required: true,
        message: '请选择功能模块'
      }]}><Select options={features.map(item => ({
          value: item.id,
          label: item.name
        }))} /></Form.Item>
      {mode === 'append' ? <Form.Item name="interfaceId" label="接口" rules={[{
        required: true,
        message: '请选择接口'
      }]}><Select options={interfaces.map(item => ({
          value: item.id,
          label: item.name
        }))} /></Form.Item> : <Form.Item name="urlPattern" label="URL 匹配路径" rules={[{
        required: true,
        whitespace: true,
        message: '请输入匹配规则'
      }]}><Input /></Form.Item>}
      <Form.Item name="name" label={mode === 'append' ? '响应名称' : '接口名称'} rules={[{
        required: true,
        whitespace: true,
        message: '请输入名称'
      }]}><Input /></Form.Item>
      {mode === 'new' && <Form.Item name="contentType" label="Content-Type"><Input /></Form.Item>}
      {mode === 'new' && <Form.Item name="active" label="创建后启用" valuePropName="checked"><Switch /></Form.Item>}
    </Form><Typography.Paragraph type="secondary">创建接口保存响应体、状态码与 Content-Type，文本默认使用 UTF-8；请求头和 Cookie 不会写入配置。追加响应保留目标接口的默认响应、状态码和响应头。</Typography.Paragraph>
  </Drawer>;
}
