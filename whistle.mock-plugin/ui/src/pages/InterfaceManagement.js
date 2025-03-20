import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { Table, Button, Modal, Form, Input, Select, message, Switch, Popconfirm, Alert, Space, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, PlayCircleOutlined, FormatPainterOutlined, EyeOutlined } from '@ant-design/icons';
import '../styles/interface-management.css';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const InterfaceManagement = () => {
  const { featureId } = useParams();
  const history = useHistory();
  const [features, setFeatures] = useState([]);
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [interfacesLoading, setInterfacesLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingInterface, setEditingInterface] = useState(null);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();
  const [previewContent, setPreviewContent] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const contentTypes = [
    { value: 'application/json; charset=utf-8', label: 'JSON' },
    { value: 'text/plain; charset=utf-8', label: '纯文本' },
    { value: 'text/html; charset=utf-8', label: 'HTML' },
    { value: 'application/xml; charset=utf-8', label: 'XML' },
    { value: 'application/javascript; charset=utf-8', label: 'JavaScript' },
  ];

  const statusCodes = [
    { value: '200', label: '200 OK' },
    { value: '201', label: '201 Created' },
    { value: '204', label: '204 No Content' },
    { value: '400', label: '400 Bad Request' },
    { value: '401', label: '401 Unauthorized' },
    { value: '403', label: '403 Forbidden' },
    { value: '404', label: '404 Not Found' },
    { value: '500', label: '500 Internal Server Error' },
  ];

  const httpMethods = [
    { value: 'ALL', label: '所有方法' },
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'DELETE', label: 'DELETE' },
    { value: 'PATCH', label: 'PATCH' },
    { value: 'HEAD', label: 'HEAD' },
    { value: 'OPTIONS', label: 'OPTIONS' },
  ];

  useEffect(() => {
    fetchFeatures();
  }, []);

  useEffect(() => {
    if (selectedFeatureId) {
      fetchInterfaces();
    }
  }, [selectedFeatureId]);

  // 获取当前选中的功能模块
  const selectedFeature = features.find(f => f.id === selectedFeatureId);

  const fetchFeatures = async () => {
    try {
      setFeaturesLoading(true);
      const response = await axios.get('/cgi-bin/features');
      if (response.data && response.data.code === 0 && Array.isArray(response.data.data)) {
        setFeatures(response.data.data);
        // 如果URL中有featureId参数，使用它
        const initialFeatureId = featureId || (response.data.data[0]?.id);
        if (initialFeatureId) {
          setSelectedFeatureId(initialFeatureId);
        }
      } else {
        setFeatures([]);
        message.warning('获取功能模块数据格式不正确');
      }
    } catch (error) {
      console.error('获取功能模块失败:', error);
      message.error(error.response?.data?.message || '获取功能模块失败');
      setFeatures([]);
    } finally {
      setFeaturesLoading(false);
    }
  };

  const fetchInterfaces = async () => {
    if (!selectedFeatureId) {
      return;
    }
    try {
      setInterfacesLoading(true);
      const response = await axios.get(`/cgi-bin/interfaces?featureId=${selectedFeatureId}`);
      if (response.data && response.data.code === 0 && Array.isArray(response.data.data)) {
        setInterfaces(response.data.data);
      } else {
        setInterfaces([]);
        message.warning('获取接口配置数据格式不正确');
      }
    } catch (error) {
      console.error('获取接口配置失败:', error);
      message.error(error.response?.data?.message || '获取接口配置失败');
      setInterfaces([]);
    } finally {
      setInterfacesLoading(false);
    }
  };

  const handleAddInterface = () => {
    if (!selectedFeatureId) {
      message.warning('请先选择一个功能模块');
      return;
    }
    form.resetFields();
    setEditingInterface(null);
    setModalVisible(true);
  };

  const handleEditInterface = (record) => {
    setEditingInterface(record);
    form.setFieldsValue({
      name: record.name,
      pattern: record.urlPattern,
      statusCode: record.httpStatus?.toString() || '200',
      contentType: record.contentType || 'application/json; charset=utf-8',
      responseBody: record.responseContent || '',
      httpMethod: record.httpMethod || 'ALL',
    });
    setModalVisible(true);
  };

  const handleDeleteInterface = async (id) => {
    try {
      const response = await axios.delete(`/cgi-bin/interfaces?id=${id}`);
      if (response.data && response.data.code === 0) {
        message.success('接口删除成功');
        fetchInterfaces();
      } else {
        throw new Error(response.data?.message || '接口删除失败');
      }
    } catch (error) {
      console.error('接口删除失败:', error);
      message.error(error.response?.data?.message || error.message || '接口删除失败');
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    try {
      const response = await axios.patch(`/cgi-bin/interfaces?id=${id}`, {
        active: !currentActive
      });
      if (response.data && response.data.code === 0) {
        message.success(`接口${!currentActive ? '启用' : '禁用'}成功`);
        fetchInterfaces();
      } else {
        throw new Error(response.data?.message || `接口${!currentActive ? '启用' : '禁用'}失败`);
      }
    } catch (error) {
      console.error(`接口${!currentActive ? '启用' : '禁用'}失败:`, error);
      message.error(error.response?.data?.message || error.message || `接口${!currentActive ? '启用' : '禁用'}失败`);
    }
  };

  // 清理JSON响应内容中不需要的空白和格式化
  const cleanJsonResponse = (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      return JSON.stringify(parsed);
    } catch (e) {
      return jsonStr;
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 验证 URL 匹配规则格式
      if (!isValidPattern(values.pattern)) {
        message.error('URL匹配规则格式不正确');
        return;
      }

      // 验证响应内容格式
      if (values.contentType.includes('json')) {
        try {
          // 清理并验证JSON
          const cleanedJson = cleanJsonResponse(values.responseBody);
          JSON.parse(cleanedJson);
          values.responseBody = cleanedJson;
        } catch (e) {
          message.error('JSON响应内容格式不正确');
          return;
        }
      }

      const interfaceData = {
        name: values.name,
        featureId: selectedFeatureId,
        urlPattern: values.pattern,
        proxyType: 'response',
        responseContent: values.responseBody,
        httpStatus: parseInt(values.statusCode, 10), // 转换为数字
        contentType: values.contentType,
        responseDelay: 0,
        httpMethod: values.httpMethod,
        active: true
      };
      
      if (editingInterface) {
        const response = await axios.put(`/cgi-bin/interfaces?id=${editingInterface.id}`, interfaceData);
        if (response.data && response.data.code === 0) {
          message.success('接口更新成功');
        } else {
          throw new Error(response.data?.message || '接口更新失败');
        }
      } else {
        const response = await axios.post('/cgi-bin/interfaces', interfaceData);
        if (response.data && response.data.code === 0) {
          message.success('接口添加成功');
        } else {
          throw new Error(response.data?.message || '接口添加失败');
        }
      }
      
      setModalVisible(false);
      fetchInterfaces();
    } catch (error) {
      if (error.errorFields) {
        return; // 表单验证错误
      }
      console.error('操作失败:', error);
      message.error(error.response?.data?.message || error.message || '操作失败，请检查数据格式是否正确');
    }
  };

  // 验证 URL 匹配规则格式
  const isValidPattern = (pattern) => {
    if (!pattern) return false;
    
    // 检查是否是有效的正则表达式
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      try {
        new RegExp(pattern.slice(1, -1));
        return true;
      } catch (e) {
        return false;
      }
    }
    
    // 检查通配符格式
    if (pattern.includes('*')) {
      return /^[a-zA-Z0-9\-_/.*]+$/.test(pattern);
    }
    
    // 检查普通路径格式
    return /^[a-zA-Z0-9\-_/]+$/.test(pattern);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleTestInterface = (record) => {
    setEditingInterface(record);
    setTestUrl('');
    setTestResult(null);
    setTestModalVisible(true);
    testForm.resetFields();
  };

  const handleTestSubmit = async () => {
    try {
      const values = await testForm.validateFields();
      setTestLoading(true);
      
      try {
        // 验证测试 URL 是否匹配当前接口的匹配规则
        if (!isUrlMatchPattern(values.testUrl, editingInterface.urlPattern)) {
          setTestResult({
            success: false,
            error: '测试URL与接口匹配规则不匹配'
          });
          message.error('测试URL与接口匹配规则不匹配');
          return;
        }

        // 调用实际测试接口
        const response = await axios.post(`/cgi-bin/test-interface`, {
          url: values.testUrl,
          interfaceId: editingInterface.id
        });

        if (response.data && response.data.code === 0 && response.data.data) {
          setTestResult({
            success: true,
            statusCode: response.data.data.statusCode,
            contentType: response.data.data.contentType,
            responseBody: response.data.data.responseBody,
            matchedRule: editingInterface.urlPattern,
            httpMethod: editingInterface.httpMethod,
            requestUrl: values.testUrl,
            mockInfo: response.data.data.mockInfo
          });
          message.success('测试成功');
        } else {
          throw new Error(response.data?.message || '测试响应格式不正确');
        }
      } catch (error) {
        setTestResult({
          success: false,
          error: error.response?.data?.message || error.message || '测试失败'
        });
        message.error(error.response?.data?.message || error.message || '测试失败');
      }
      
      setTestLoading(false);
    } catch (error) {
      if (error.errorFields) {
        return; // 表单验证错误
      }
      setTestLoading(false);
    }
  };

  // 检查 URL 是否匹配模式
  const isUrlMatchPattern = (url, pattern) => {
    if (!url || !pattern) return false;
    
    try {
      // 如果是正则表达式
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        const regex = new RegExp(pattern.slice(1, -1));
        return regex.test(url);
      }
      
      // 如果是通配符模式
      if (pattern.includes('*')) {
        const regexPattern = pattern
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(url);
      }
      
      // 精确匹配
      return url === pattern;
    } catch (e) {
      console.error('URL匹配检查失败:', e);
      return false;
    }
  };

  const handleSelectFeature = (featureId) => {
    setSelectedFeatureId(featureId);
  };

  const formatResponseContent = (content, contentType) => {
    if (contentType && contentType.includes('json')) {
      try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        return content;
      }
    }
    return content;
  };

  const formatJsonContent = () => {
    const responseBody = form.getFieldValue('responseBody');
    if (responseBody) {
      try {
        const formattedJson = JSON.stringify(JSON.parse(responseBody), null, 2);
        form.setFieldsValue({ responseBody: formattedJson });
        message.success('JSON格式化成功');
      } catch (error) {
        message.error('JSON格式不正确，无法格式化');
      }
    }
  };

  const handlePreview = () => {
    const responseBody = form.getFieldValue('responseBody');
    if (responseBody) {
      try {
        // 如果是JSON，格式化显示
        const contentType = form.getFieldValue('contentType');
        if (contentType && contentType.includes('json')) {
          setPreviewContent(JSON.stringify(JSON.parse(responseBody), null, 2));
        } else {
          setPreviewContent(responseBody);
        }
        setPreviewVisible(true);
      } catch (error) {
        message.error('内容格式不正确，无法预览');
      }
    } else {
      message.warning('响应内容为空，无法预览');
    }
  };

  const filteredInterfaces = interfaces.filter(item => 
    !selectedFeatureId || item.featureId === selectedFeatureId
  );

  const columns = [
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      width: 80,
      render: (active, record) => (
        <Switch
          checked={active}
          onChange={() => handleToggleActive(record.id, active)}
        />
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'URL匹配规则',
      dataIndex: 'urlPattern',
      key: 'urlPattern',
      ellipsis: true,
    },
    {
      title: '状态码',
      dataIndex: 'httpStatus',
      key: 'httpStatus',
      width: 100,
    },
    {
      title: '内容类型',
      dataIndex: 'contentType',
      key: 'contentType',
      width: 120,
      render: (text) => {
        const found = contentTypes.find(item => item.value === text);
        return found ? found.label : text;
      }
    },
    {
      title: '请求方法',
      dataIndex: 'httpMethod',
      key: 'httpMethod',
      width: 120,
      render: (text) => {
        const found = httpMethods.find(item => item.value === text);
        return found ? found.label : text;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <div className="action-buttons">
          <Button 
            type="text" 
            icon={<PlayCircleOutlined />} 
            onClick={() => handleTestInterface(record)}
          />
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEditInterface(record)}
          />
          <Popconfirm
            title="确定要删除此接口吗？"
            onConfirm={() => handleDeleteInterface(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="interface-management-container">
        <div className="interface-management-header">
          <div className="feature-selector">
            <span>功能模块：</span>
            <Select
              value={selectedFeatureId}
              onChange={handleSelectFeature}
              style={{ width: 200 }}
              placeholder="选择功能模块"
              loading={featuresLoading}
            >
              {(features || []).map(feature => (
                <Option key={feature.id} value={feature.id}>
                  {feature.name}
                  {feature.active === false && 
                    <span style={{ color: '#ff4d4f', marginLeft: 8 }}>(已禁用)</span>
                  }
                </Option>
              ))}
            </Select>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddInterface}
            disabled={!selectedFeatureId || selectedFeature?.active === false}
          >
            添加接口
          </Button>
        </div>
        {!features.length && (
          <Alert
            message="未找到功能模块"
            description="请先在模拟数据页面创建功能模块，然后再添加接口"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {selectedFeature?.active === false && (
          <Alert
            message="功能模块已禁用"
            description="当前功能模块已被禁用，所有关联接口不会生效。您可以在模拟数据页面启用此功能模块。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <div className="interface-list-container">
          <Table
            columns={columns}
            dataSource={filteredInterfaces}
            rowKey="id"
            loading={interfacesLoading}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: '暂无接口配置' }}
          />
        </div>

        <Modal
          title={editingInterface ? '编辑接口' : '添加接口'}
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={handleCancel}
          width={800}
          destroyOnClose
          okText={editingInterface ? '保存' : '创建'}
          cancelText="取消"
          bodyStyle={{ maxHeight: '70vh', overflow: 'auto', padding: '24px' }}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              name: '',
              pattern: '',
              statusCode: '200',
              contentType: 'application/json; charset=utf-8',
              responseBody: '{\n  "code": 0,\n  "message": "success",\n  "data": {}\n}',
              httpMethod: 'ALL'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <Form.Item
                  name="name"
                  label="接口名称"
                  rules={[{ required: true, message: '请输入接口名称' }]}
                >
                  <Input placeholder="请输入接口名称" />
                </Form.Item>
              </div>
              <div style={{ flex: 1 }}>
                <Form.Item
                  name="pattern"
                  label="URL匹配规则"
                  rules={[{ required: true, message: '请输入URL匹配规则' }]}
                  tooltip="支持多种匹配方式：精确匹配 - /api/users，通配符 - /api/users/*，正则表达式 - /api\/users\/\d+/"
                >
                  <Input placeholder="例如：/api/users，/api/users/*，/api\/users\/\d+/" />
                </Form.Item>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <Form.Item
                  name="statusCode"
                  label="状态码"
                  rules={[{ required: true, message: '请选择状态码' }]}
                >
                  <Select>
                    {statusCodes.map(item => (
                      <Option key={item.value} value={item.value}>{item.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
              <div style={{ flex: 1 }}>
                <Form.Item
                  name="contentType"
                  label="内容类型"
                  rules={[{ required: true, message: '请选择内容类型' }]}
                >
                  <Select>
                    {contentTypes.map(item => (
                      <Option key={item.value} value={item.value}>{item.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
              <div style={{ flex: 1 }}>
                <Form.Item
                  name="httpMethod"
                  label="请求方法"
                  rules={[{ required: true, message: '请选择请求方法' }]}
                >
                  <Select>
                    {httpMethods.map(item => (
                      <Option key={item.value} value={item.value}>{item.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            </div>

            <Form.Item
              name="responseBody"
              labelCol={{
                span: 8,          /* 宽度比例 */
              }}
              label={
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>响应内容</span>
                  <Space>
                    <Button 
                      type="link" 
                      icon={<EyeOutlined />} 
                      onClick={handlePreview}
                      style={{ padding: 0 }}
                    >
                      预览
                    </Button>
                    <Button 
                      type="link" 
                      icon={<FormatPainterOutlined />} 
                      onClick={formatJsonContent}
                      style={{ padding: 0 }}
                    >
                      格式化JSON
                    </Button>
                  </Space>
                </div>
              }
              rules={[{ required: true, message: '请输入响应内容' }]}
            >
              <TextArea rows={12} placeholder="请输入响应内容" style={{ fontFamily: 'monospace' }} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="测试接口"
          open={testModalVisible}
          onCancel={() => setTestModalVisible(false)}
          footer={[
            <Button key="back" onClick={() => setTestModalVisible(false)}>
              关闭
            </Button>,
            <Button key="submit" type="primary" loading={testLoading} onClick={handleTestSubmit}>
              测试
            </Button>
          ]}
          width={800}
        >
          {editingInterface && (
            <div className="test-interface-container">
              <Alert
                message="URL匹配规则说明"
                description={
                  <div>
                    <p>当前接口匹配规则：<code>{editingInterface.urlPattern}</code></p>
                    <p>在Whistle规则中，您需要配置完整URL或域名指向whistle.mock-plugin://，然后插件会根据接口的匹配规则处理请求。</p>
                    <p>插件支持以下匹配方式：</p>
                    <ul>
                      <li>精确匹配：完全匹配URL路径部分</li>
                      <li>通配符匹配：使用*代表任意字符（例如：/api/users/*）</li>
                      <li>正则表达式：使用/pattern/格式（例如：/\/api\/users\/\d+/）</li>
                      <li>部分匹配：URL包含指定路径即匹配</li>
                    </ul>
                    <p>请在下方输入完整测试URL进行测试</p>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form
                form={testForm}
                layout="vertical"
              >
                <Form.Item
                  name="testUrl"
                  label="测试URL"
                  rules={[{ required: true, message: '请输入测试URL' }]}
                >
                  <Input
                    placeholder="输入完整URL，例如：https://example.com/api/users"
                    onChange={(e) => setTestUrl(e.target.value)}
                  />
                </Form.Item>
              </Form>

              {testResult && (
                <div className="test-result">
                  <div className="result-header">
                    <h3>测试结果</h3>
                    {testResult.success ? (
                      <span className="status success">成功</span>
                    ) : (
                      <span className="status error">失败</span>
                    )}
                  </div>

                  {testResult.success ? (
                    <div className="result-content">
                      <div className="result-item">
                        <span className="label">请求URL：</span>
                        <span className="value">{testResult.requestUrl}</span>
                      </div>
                      <div className="result-item">
                        <span className="label">匹配规则：</span>
                        <span className="value">{testResult.matchedRule}</span>
                      </div>
                      <div className="result-item">
                        <span className="label">请求方法：</span>
                        <span className="value">{testResult.httpMethod || 'ALL'}</span>
                      </div>
                      <div className="result-item">
                        <span className="label">状态码：</span>
                        <span className="value">{testResult.statusCode}</span>
                      </div>
                      <div className="result-item">
                        <span className="label">内容类型：</span>
                        <span className="value">{testResult.contentType}</span>
                      </div>
                      {testResult.mockInfo && (
                        <>
                          <div className="result-item">
                            <span className="label">模拟延迟：</span>
                            <span className="value">{testResult.mockInfo.delay}ms</span>
                          </div>
                          <div className="result-item">
                            <span className="label">响应时间：</span>
                            <span className="value">{new Date(testResult.mockInfo.timestamp).toLocaleString()}</span>
                          </div>
                        </>
                      )}
                      <div className="result-body">
                        <div className="label">响应内容：</div>
                        <pre>{formatResponseContent(testResult.responseBody, testResult.contentType)}</pre>
                      </div>
                    </div>
                  ) : (
                    <div className="result-error">
                      <ExclamationCircleOutlined /> {testResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* 预览内容弹窗 */}
        <Modal
          title="预览响应内容"
          open={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          footer={[
            <Button key="close" onClick={() => setPreviewVisible(false)}>
              关闭
            </Button>
          ]}
          width={600}
        >
          <div style={{ 
            maxHeight: '60vh', 
            overflow: 'auto', 
            backgroundColor: '#f5f5f5', 
            padding: '16px',
            borderRadius: '4px',
            fontFamily: 'monospace'
          }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
              {previewContent}
            </pre>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
};

export default InterfaceManagement; 