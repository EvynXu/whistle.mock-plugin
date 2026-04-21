import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import {
  Input, Select, Button, Tabs, Tag, Space, Divider, message,
  Table, Popconfirm, Drawer, Form, Row, Col, Card, Tooltip, Empty
} from 'antd';
import {
  SendOutlined, SaveOutlined, HistoryOutlined, DeleteOutlined,
  PlusOutlined, CopyOutlined, ApiOutlined, ClearOutlined,
  ThunderboltOutlined, CodeOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
const BODY_TYPES = [
  { key: 'none', label: 'None' },
  { key: 'json', label: 'JSON' },
  { key: 'form', label: 'x-www-form-urlencoded' },
  { key: 'text', label: 'Raw Text' },
];

const INITIAL_HISTORY = () => {
  try {
    const raw = localStorage.getItem('sniffer-history');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const Sniffer = () => {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [bodyType, setBodyType] = useState('none');
  const [bodyContent, setBodyContent] = useState('');
  const [queryParams, setQueryParams] = useState([{ key: '', value: '', id: Date.now() }]);
  const [headers, setHeaders] = useState([{ key: '', value: '', id: Date.now() + 1 }]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [saveDrawerVisible, setSaveDrawerVisible] = useState(false);
  const [saveForm] = Form.useForm();
  const [features, setFeatures] = useState([]);

  // 加载功能模块列表（用于保存时选择归属）
  useEffect(() => {
    axios.get('/cgi-bin/features').then(res => {
      if (res.data.code === 0) {
        setFeatures(res.data.data || []);
      }
    }).catch(() => {});
  }, []);

  // 持久化历史记录
  useEffect(() => {
    localStorage.setItem('sniffer-history', JSON.stringify(history.slice(0, 100)));
  }, [history]);

  const addParam = (list, setList) => {
    setList([...list, { key: '', value: '', id: Date.now() + Math.random() }]);
  };

  const removeParam = (list, setList, idx) => {
    const next = [...list];
    next.splice(idx, 1);
    if (next.length === 0) next.push({ key: '', value: '', id: Date.now() });
    setList(next);
  };

  const updateParam = (list, setList, idx, field, value) => {
    const next = [...list];
    next[idx][field] = value;
    setList(next);
  };

  const buildParamsObject = (list) => {
    const obj = {};
    list.forEach(item => {
      if (item.key && item.value !== undefined) {
        obj[item.key] = item.value;
      }
    });
    return obj;
  };

  const handleSend = async () => {
    if (!url.trim()) {
      message.warning('请输入请求 URL');
      return;
    }
    setLoading(true);
    setResponse(null);
    try {
      const payload = {
        url: url.trim(),
        method,
        headers: buildParamsObject(headers),
        queryParams: buildParamsObject(queryParams),
        body: bodyType === 'none' ? undefined : bodyContent,
        bodyType
      };

      const res = await axios.post('/cgi-bin/proxy-fetch', payload);
      if (res.data.code === 0) {
        const resp = res.data.data;
        setResponse(resp);

        // 添加到历史记录
        const record = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          url: payload.url,
          method: payload.method,
          status: resp.status,
          statusText: resp.statusText,
          preview: resp.body?.slice(0, 200) || '',
          request: payload
        };
        setHistory(prev => [record, ...prev].slice(0, 100));

        message.success(`请求成功 ${resp.status}`);
      } else {
        throw new Error(res.data.message);
      }
    } catch (err) {
      message.error(err.response?.data?.message || err.message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (response?.body) {
      navigator.clipboard.writeText(response.body);
      message.success('响应内容已复制');
    }
  };

  const loadFromHistory = (record) => {
    const req = record.request || {};
    setUrl(req.url || record.url || '');
    setMethod(req.method || 'GET');
    setBodyType(req.bodyType || 'none');
    setBodyContent(req.body || '');

    const qs = Object.entries(req.queryParams || {}).map(([k, v], i) => ({
      key: k, value: v, id: Date.now() + i
    }));
    setQueryParams(qs.length ? qs : [{ key: '', value: '', id: Date.now() }]);

    const hs = Object.entries(req.headers || {}).map(([k, v], i) => ({
      key: k, value: v, id: Date.now() + i + 1000
    }));
    setHeaders(hs.length ? hs : [{ key: '', value: '', id: Date.now() + 1000 }]);

    setResponse({
      status: record.status,
      statusText: record.statusText,
      body: record.preview,
      headers: {}
    });
    setHistoryVisible(false);
  };

  const clearHistory = () => {
    setHistory([]);
    message.success('历史记录已清空');
  };

  const handleSaveAsMock = async () => {
    try {
      const values = await saveForm.validateFields();
      const mockContent = response?.body || '';

      // 构造接口数据
      const interfaceData = {
        name: values.name,
        urlPattern: values.urlPattern || url,
        proxyType: 'response',
        httpMethod: method,
        httpStatus: response?.status || 200,
        contentType: 'application/json; charset=utf-8',
        responseContent: mockContent,
        responses: [
          {
            id: Date.now().toString(),
            name: '默认响应',
            description: '从接口嗅探导入',
            content: mockContent,
            paramMatchers: []
          }
        ],
        activeResponseId: Date.now().toString(),
        active: true
      };

      const res = await axios.post('/cgi-bin/interfaces', interfaceData);
      if (res.data.code === 0) {
        message.success('Mock 接口创建成功');
        setSaveDrawerVisible(false);
        saveForm.resetFields();
      } else {
        throw new Error(res.data.message);
      }
    } catch (err) {
      if (err.errorFields) return;
      message.error('创建失败: ' + (err.response?.data?.message || err.message));
    }
  };

  const historyColumns = [
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (m) => <Tag color={m === 'GET' ? 'blue' : m === 'POST' ? 'green' : 'default'}>{m}</Tag>
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (u) => <span style={{ fontSize: 12 }}>{u}</span>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (s) => <Tag color={s >= 200 && s < 300 ? 'success' : s >= 400 ? 'error' : 'default'}>{s}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => loadFromHistory(record)}>加载</Button>
          <Popconfirm title="确定删除？" onConfirm={() => setHistory(prev => prev.filter(h => h.id !== record.id))}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const formatBody = (body) => {
    try {
      const json = JSON.parse(body);
      return JSON.stringify(json, null, 2);
    } catch {
      return body;
    }
  };

  return (
    <AppLayout>
      <div className="page-container">
        <div className="page-title-bar">
          <div>
            <h1 className="page-title"><ApiOutlined /> 接口嗅探</h1>
            <div className="page-description">
              像 Postman 一样发送真实请求，抓取响应后一键保存为 Mock 接口
            </div>
          </div>
          <Space>
            <Button icon={<HistoryOutlined />} onClick={() => setHistoryVisible(true)}>
              历史记录 ({history.length})
            </Button>
          </Space>
        </div>

        {/* 请求构建器 */}
        <Card style={{ marginBottom: 24 }}>
          {/* URL + Method + Send */}
          <Row gutter={8} style={{ marginBottom: 16 }}>
            <Col flex="120px">
              <Select value={method} onChange={setMethod} style={{ width: '100%' }}>
                {HTTP_METHODS.map(m => <Option key={m} value={m}>{m}</Option>)}
              </Select>
            </Col>
            <Col flex="auto">
              <Input
                placeholder="https://api.example.com/users"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPressEnter={handleSend}
                style={{ fontFamily: 'monospace' }}
                prefix={<ThunderboltOutlined />}
              />
            </Col>
            <Col flex="120px">
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={loading}
                onClick={handleSend}
                block
              >
                发送
              </Button>
            </Col>
          </Row>

          {/* Tabs: Params / Headers / Body */}
          <Tabs defaultActiveKey="params">
            <Tabs.TabPane tab={<span><CodeOutlined /> Query 参数</span>} key="params">
              <Space direction="vertical" style={{ width: '100%' }}>
                {queryParams.map((item, idx) => (
                  <Row gutter={8} key={item.id}>
                    <Col span={8}>
                      <Input
                        placeholder="参数名"
                        value={item.key}
                        onChange={(e) => updateParam(queryParams, setQueryParams, idx, 'key', e.target.value)}
                      />
                    </Col>
                    <Col span={14}>
                      <Input
                        placeholder="参数值"
                        value={item.value}
                        onChange={(e) => updateParam(queryParams, setQueryParams, idx, 'value', e.target.value)}
                      />
                    </Col>
                    <Col span={2}>
                      <Button
                        icon={<DeleteOutlined />}
                        onClick={() => removeParam(queryParams, setQueryParams, idx)}
                        disabled={queryParams.length === 1 && !item.key}
                      />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => addParam(queryParams, setQueryParams)}>
                  添加参数
                </Button>
              </Space>
            </Tabs.TabPane>

            <Tabs.TabPane tab={<span><CodeOutlined /> Headers</span>} key="headers">
              <Space direction="vertical" style={{ width: '100%' }}>
                {headers.map((item, idx) => (
                  <Row gutter={8} key={item.id}>
                    <Col span={8}>
                      <Input
                        placeholder="Header 名"
                        value={item.key}
                        onChange={(e) => updateParam(headers, setHeaders, idx, 'key', e.target.value)}
                      />
                    </Col>
                    <Col span={14}>
                      <Input
                        placeholder="Header 值"
                        value={item.value}
                        onChange={(e) => updateParam(headers, setHeaders, idx, 'value', e.target.value)}
                      />
                    </Col>
                    <Col span={2}>
                      <Button
                        icon={<DeleteOutlined />}
                        onClick={() => removeParam(headers, setHeaders, idx)}
                        disabled={headers.length === 1 && !item.key}
                      />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => addParam(headers, setHeaders)}>
                  添加 Header
                </Button>
              </Space>
            </Tabs.TabPane>

            <Tabs.TabPane tab={<span><CodeOutlined /> Body</span>} key="body">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Select value={bodyType} onChange={setBodyType} style={{ width: 200 }}>
                  {BODY_TYPES.map(t => <Option key={t.key} value={t.key}>{t.label}</Option>)}
                </Select>
                {bodyType !== 'none' && (
                  <TextArea
                    rows={8}
                    placeholder={bodyType === 'json' ? '{\n  "name": "test"\n}' : bodyType === 'form' ? 'name=test&age=18' : 'raw text...'}
                    value={bodyContent}
                    onChange={(e) => setBodyContent(e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: 13 }}
                  />
                )}
              </Space>
            </Tabs.TabPane>
          </Tabs>
        </Card>

        {/* 响应区域 */}
        {response && (
          <Card
            title={
              <Space>
                <span>响应结果</span>
                <Tag color={response.status >= 200 && response.status < 300 ? 'success' : response.status >= 400 ? 'error' : 'default'}>
                  {response.status} {response.statusText}
                </Tag>
              </Space>
            }
            extra={
              <Space>
                <Button size="small" icon={<CopyOutlined />} onClick={handleCopyResponse}>复制响应</Button>
                <Button size="small" icon={<SaveOutlined />} type="primary" onClick={() => {
                  saveForm.setFieldsValue({ name: '', urlPattern: url });
                  setSaveDrawerVisible(true);
                }}>
                  保存为 Mock 接口
                </Button>
              </Space>
            }
          >
            <Tabs defaultActiveKey="body">
              <Tabs.TabPane tab="Body" key="body">
                <TextArea
                  value={formatBody(response.body)}
                  readOnly
                  rows={16}
                  style={{ fontFamily: 'monospace', fontSize: 12, background: '#fafafa' }}
                />
              </Tabs.TabPane>
              <Tabs.TabPane tab="Headers" key="headers">
                <pre style={{ background: '#fafafa', padding: 16, borderRadius: 4, fontSize: 12 }}>
                  {JSON.stringify(response.headers, null, 2)}
                </pre>
              </Tabs.TabPane>
            </Tabs>
          </Card>
        )}

        {!response && !loading && (
          <Empty description="输入 URL 并点击「发送」开始嗅探真实接口" />
        )}
      </div>

      {/* 历史记录 Drawer */}
      <Drawer
        title="历史记录"
        open={historyVisible}
        onClose={() => setHistoryVisible(false)}
        width={600}
        extra={
          <Popconfirm title="确定清空全部历史？" onConfirm={clearHistory}>
            <Button icon={<ClearOutlined />} danger>清空</Button>
          </Popconfirm>
        }
      >
        <Table
          dataSource={history}
          columns={historyColumns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Drawer>

      {/* 保存为 Mock Drawer */}
      <Drawer
        title="保存为 Mock 接口"
        open={saveDrawerVisible}
        onClose={() => setSaveDrawerVisible(false)}
        width={480}
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={() => setSaveDrawerVisible(false)}>取消</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveAsMock}>创建接口</Button>
          </Space>
        }
      >
        <Form form={saveForm} layout="vertical">
          <Form.Item
            name="name"
            label="接口名称"
            rules={[{ required: true, message: '请输入接口名称' }]}
          >
            <Input placeholder="例如：获取用户列表" />
          </Form.Item>
          <Form.Item
            name="featureId"
            label="所属功能模块"
            rules={[{ required: true, message: '请选择功能模块' }]}
          >
            <Select placeholder="选择功能模块">
              {features.map(f => (
                <Option key={f.id} value={f.id}>{f.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="urlPattern"
            label="URL 匹配规则"
            rules={[{ required: true, message: '请输入匹配规则' }]}
          >
            <Input placeholder="例如：/api/users 或 /api/users/*" />
          </Form.Item>
          <Form.Item label="请求方法">
            <Tag>{method}</Tag>
          </Form.Item>
          <Form.Item label="响应状态码">
            <Tag>{response?.status}</Tag>
          </Form.Item>
          <Form.Item label="响应预览">
            <TextArea
              value={response?.body?.slice(0, 500)}
              readOnly
              rows={6}
              style={{ fontFamily: 'monospace', fontSize: 11, background: '#fafafa' }}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </AppLayout>
  );
};

export default Sniffer;
