import React, { useState, useEffect, useRef } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { Table, Button, Modal, Form, Input, Select, message, Switch, Popconfirm, Alert, Space, Tabs, Card, Divider, Badge, Tooltip, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, PlayCircleOutlined, FormatPainterOutlined, EyeOutlined, CopyOutlined, CodeOutlined, CheckCircleOutlined, CloseCircleOutlined, MenuOutlined, PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
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

  const proxyTypes = [
    { value: 'response', label: '模拟响应' },
    { value: 'redirect', label: '重定向' },
    { value: 'url_redirect', label: 'URL重定向' },
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
    
    // 将自定义请求头转换为数组格式，用于动态表单项
    let headersArray = [];
    if (record.customHeaders && typeof record.customHeaders === 'object') {
      headersArray = Object.entries(record.customHeaders).map(([key, value]) => ({
        headerName: key,
        headerValue: value
      }));
    }
    
    form.setFieldsValue({
      name: record.name,
      pattern: record.urlPattern,
      proxyType: record.proxyType || 'response',
      statusCode: record.httpStatus?.toString() || '200',
      contentType: record.contentType || 'application/json; charset=utf-8',
      responseBody: record.responseContent || '',
      httpMethod: record.httpMethod || 'ALL',
      targetUrl: record.targetUrl || '',
      headerItems: headersArray // 使用数组存储表单项
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

  const cleanJsonResponse = (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      return JSON.stringify(parsed);
    } catch (e) {
      return jsonStr;
    }
  };

  // 验证URL是否合法
  const isValidUrl = (url) => {
    if (!url) return false;
    
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 检查responseBody是否是有效的JSON
      if (values.proxyType === 'response' && values.contentType.includes('application/json')) {
        try {
          JSON.parse(values.responseBody);
        } catch (e) {
          message.error('响应体不是有效的JSON格式');
          return;
        }
      }
      
      // 处理自定义请求头，将表单项数组转换为对象格式
      let customHeaders = {};
      
      if (values.proxyType === 'redirect' || values.proxyType === 'url_redirect') {
        if (values.headerItems && values.headerItems.length > 0) {
          values.headerItems.forEach(item => {
            if (item && item.headerName && item.headerName.trim()) {
              customHeaders[item.headerName.trim()] = item.headerValue || '';
            }
          });
        }
      }

      const interfaceData = {
        name: values.name,
        featureId: selectedFeatureId,
        urlPattern: values.pattern,
        proxyType: values.proxyType,
        responseContent: values.proxyType === 'response' ? values.responseBody : '',
        targetUrl: (values.proxyType === 'redirect' || values.proxyType === 'url_redirect') ? values.targetUrl : '',
        customHeaders: (values.proxyType === 'redirect' || values.proxyType === 'url_redirect') ? customHeaders : {},
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

  // 检查 URL 是否匹配模式
  const isUrlMatchPattern = (url, pattern, proxyType) => {
    if (!url || !pattern) return false;
    
    try {
      // 对于url_redirect类型，需要完全匹配
      if (proxyType === 'url_redirect') {
        return url === pattern;
      }
      
      // 对于redirect类型，只要url以pattern开头即可命中（前缀匹配）
      if (proxyType === 'redirect') {
        return url.indexOf(pattern) === 0;
      }
      
      // 以下是默认的匹配逻辑（用于response类型等）
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

  const handleTestSubmit = async () => {
    try {
      const values = await testForm.validateFields();
      setTestLoading(true);
      
      try {
        // 验证测试 URL 是否匹配当前接口的匹配规则
        if (!isUrlMatchPattern(values.testUrl, editingInterface.urlPattern, editingInterface.proxyType)) {
          let errorMessage = '测试URL与接口匹配规则不匹配';
          
          // 根据不同的代理类型提供更具体的错误信息
          if (editingInterface.proxyType === 'url_redirect') {
            errorMessage = `测试URL必须完全匹配 ${editingInterface.urlPattern}`;
          } else if (editingInterface.proxyType === 'redirect') {
            errorMessage = `测试URL必须以 ${editingInterface.urlPattern} 开头`;
          }
          
          setTestResult({
            success: false,
            error: errorMessage
          });
          message.error(errorMessage);
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
    const proxyType = form.getFieldValue('proxyType');
    if (proxyType !== 'response') {
      return;
    }
    
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
    const proxyType = form.getFieldValue('proxyType');
    if (proxyType !== 'response') {
      return;
    }
    
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
      title: '处理方式',
      dataIndex: 'proxyType',
      key: 'proxyType',
      width: 120,
      render: (text) => {
        const found = proxyTypes.find(item => item.value === text);
        return found ? found.label : text || '模拟响应';
      }
    },
    {
      title: '状态码',
      dataIndex: 'httpStatus',
      key: 'httpStatus',
      width: 100,
      render: (text, record) => {
        return record.proxyType === 'response' ? text : '-';
      }
    },
    {
      title: '内容类型',
      dataIndex: 'contentType',
      key: 'contentType',
      width: 120,
      render: (text, record) => {
        if (record.proxyType !== 'response') {
          return '-';
        }
        const found = contentTypes.find(item => item.value === text);
        return found ? found.label : text;
      }
    },
    {
      title: '目标URL',
      dataIndex: 'targetUrl',
      key: 'targetUrl',
      ellipsis: true,
      render: (text, record) => {
        return (record.proxyType === 'redirect' || record.proxyType === 'url_redirect') ? text : '-';
      }
    },
    {
      title: '自定义头',
      dataIndex: 'customHeaders',
      key: 'customHeaders',
      width: 100,
      render: (_, record) => {
        if (record.proxyType !== 'redirect' && record.proxyType !== 'url_redirect') {
          return '-';
        }
        
        const headers = record.customHeaders || {};
        const count = Object.keys(headers).length;
        
        if (count === 0) {
          return '-';
        }
        
        return <span style={{ color: '#1890ff' }}>{count}个</span>;
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
              proxyType: 'response',
              statusCode: '200',
              contentType: 'application/json; charset=utf-8',
              responseBody: '{\n  "code": 0,\n  "message": "success",\n  "data": {}\n}',
              httpMethod: 'ALL',
              targetUrl: '',
              headerItems: []
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
                  rules={[
                    { required: true, message: '请输入URL匹配规则' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const proxyType = getFieldValue('proxyType');
                        if (!value) return Promise.resolve();
                        
                        // URL重定向模式下，必须是完整URL
                        if (proxyType === 'url_redirect') {
                          try {
                            new URL(value);
                            return Promise.resolve();
                          } catch (e) {
                            return Promise.reject(new Error('URL重定向模式下，URL匹配规则必须是完整的URL（包括http://或https://）'));
                          }
                        }
                        
                        // 重定向模式下，必须以http://或https://开头
                        if (proxyType === 'redirect') {
                          if (value.startsWith('http://') || value.startsWith('https://')) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('重定向模式下，URL匹配规则必须以http://或https://开头'));
                        }
                        
                        // 响应模式下的验证
                        if (proxyType === 'response') {
                          // 正则表达式验证
                          if (value.startsWith('/') && value.endsWith('/')) {
                            try {
                              new RegExp(value.slice(1, -1));
                              return Promise.resolve();
                            } catch (e) {
                              return Promise.reject(new Error('无效的正则表达式格式'));
                            }
                          }
                          
                          // 通配符验证
                          if (value.includes('*')) {
                            if (/^[a-zA-Z0-9\-_/.*]+$/.test(value)) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('通配符URL格式不正确'));
                          }
                          
                          // 普通路径验证
                          if (/^[a-zA-Z0-9\-_/]+$/.test(value)) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('URL路径格式不正确'));
                        }
                        
                        return Promise.resolve();
                      },
                    }),
                  ]}
                  tooltip={{
                    title: (
                      <>
                        <div>不同处理方式下URL匹配规则要求：</div>
                        <ul style={{margin: '5px 0 0 15px', padding: 0}}>
                          <li><b>模拟响应：</b> 支持路径格式如 /api/users，通配符如 /api/*，正则如 /\/api\/\d+/</li>
                          <li><b>重定向：</b> 必须以http://或https://开头，例如：https://example.com/api</li>
                          <li><b>URL重定向：</b> 必须是完整URL，包括http://或https://，例如：https://example.com/api/users</li>
                        </ul>
                      </>
                    ),
                    overlayStyle: { maxWidth: '450px' }
                  }}
                >
                  <Input 
                    placeholder="根据选择的处理方式输入相应格式的URL" 
                  />
                </Form.Item>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <Form.Item
                  name="proxyType"
                  label="处理方式"
                  rules={[{ required: true, message: '请选择处理方式' }]}
                  tooltip={{
                    title: (
                      <>
                        <div>不同处理方式的规则说明：</div>
                        <ul style={{margin: '5px 0 0 15px', padding: 0}}>
                          <li><b>模拟响应：</b> 返回您定义的响应内容</li>
                          <li><b>重定向：</b> 将请求重定向到其他URL，URL匹配规则必须以http://或https://开头</li>
                          <li><b>URL重定向：</b> 完全匹配URL时重定向，URL匹配规则必须是完整URL</li>
                        </ul>
                      </>
                    ),
                    overlayStyle: { maxWidth: '450px' }
                  }}
                >
                  <Select onChange={(value) => {
                    // 当切换代理类型时，清空pattern字段，并提供不同的placeholder
                    form.setFieldsValue({ pattern: '' });
                    
                    // 为不同的代理类型提供不同的pattern占位符
                    const patternInput = document.querySelector('input[placeholder="根据选择的处理方式输入相应格式的URL"]');
                    if (patternInput) {
                      if (value === 'response') {
                        patternInput.placeholder = "例如：/api/users，/api/users/*，/api\/users\/\d+/";
                      } else if (value === 'redirect') {
                        patternInput.placeholder = "例如：https://example.com/api";
                      } else if (value === 'url_redirect') {
                        patternInput.placeholder = "例如：https://example.com/api/users";
                      }
                    }
                  }}>
                    {proxyTypes.map(item => (
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

            {/* 根据proxyType显示不同的表单项 */}
            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.proxyType !== currentValues.proxyType}>
              {({ getFieldValue }) => {
                const proxyType = getFieldValue('proxyType');
                
                if (proxyType === 'response') {
                  return (
                    <>
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
                    </>
                  );
                }
                
                if (proxyType === 'redirect' || proxyType === 'url_redirect') {
                  return (
                    <>
                      <Form.Item
                        name="targetUrl"
                        label="重定向目标URL"
                        rules={[
                          { required: true, message: '请输入重定向目标URL' },
                          { 
                            validator: (_, value) => {
                              if (!value) return Promise.resolve();
                              
                              try {
                                new URL(value);
                                return Promise.resolve();
                              } catch (e) {
                                return Promise.reject(new Error('请输入有效的URL，必须包含http://或https://'));
                              }
                            }
                          }
                        ]}
                        tooltip={proxyType === 'redirect' ? 
                          "重定向模式：输入完整的目标URL。匹配时使用前缀匹配，只要请求URL以匹配规则开头即命中。例如：https://example.com/api" : 
                          "URL重定向模式：输入完整的目标URL。匹配时要求完全匹配URL，必须与匹配规则完全一致才命中。例如：https://example.com/api/users"
                        }
                      >
                        <Input 
                          placeholder={proxyType === 'redirect' ? 
                            "例如：https://example.com/api" : 
                            "例如：https://example.com/api/users"
                          } 
                          addonBefore={
                            <Select 
                              defaultValue="https://" 
                              className="select-before" 
                              style={{ width: 100 }}
                              onChange={(value) => {
                                const currentUrl = form.getFieldValue('targetUrl') || '';
                                const urlWithoutProtocol = currentUrl.replace(/^https?:\/\//, '');
                                form.setFieldsValue({ targetUrl: value + urlWithoutProtocol });
                              }}
                            >
                              <Option value="http://">http://</Option>
                              <Option value="https://">https://</Option>
                            </Select>
                          }
                        />
                      </Form.Item>
                      
                      <Form.Item
                        label="自定义请求头"
                        tooltip="为请求添加或替换HTTP请求头"
                        className="custom-headers-container"
                      >
                        <Form.List name="headerItems">
                          {(fields, { add, remove }) => (
                            <>
                              {fields.map(({ key, name, ...restField }) => (
                                <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                                  <Col span={10}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'headerName']}
                                      noStyle
                                      rules={[
                                        { 
                                          required: true, 
                                          message: '请输入请求头名称' 
                                        },
                                        {
                                          pattern: /^[^:]+$/,
                                          message: '请求头名称不能包含冒号'
                                        }
                                      ]}
                                    >
                                      <Input placeholder="Header-Name" />
                                    </Form.Item>
                                  </Col>
                                  <Col span={12}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'headerValue']}
                                      noStyle
                                    >
                                      <Input placeholder="Header-Value" />
                                    </Form.Item>
                                  </Col>
                                  <Col span={2}>
                                    <Button 
                                      type="text" 
                                      icon={<MinusCircleOutlined />} 
                                      onClick={() => remove(name)}
                                      style={{ color: '#ff4d4f' }}
                                    />
                                  </Col>
                                </Row>
                              ))}
                              
                              <Form.Item>
                                <Button 
                                  type="dashed" 
                                  onClick={() => add()} 
                                  block 
                                  icon={<PlusOutlined />}
                                >
                                  添加请求头
                                </Button>
                              </Form.Item>
                              
                              <div style={{ marginTop: 8 }}>
                                <Button 
                                  type="link" 
                                  onClick={() => {
                                    add({ headerName: 'Content-Type', headerValue: 'application/json' });
                                  }}
                                >
                                  添加 Content-Type
                                </Button>
                                <Button 
                                  type="link" 
                                  onClick={() => {
                                    add({ headerName: 'Authorization', headerValue: 'Bearer ' });
                                  }}
                                >
                                  添加 Authorization
                                </Button>
                                <Button 
                                  type="link" 
                                  onClick={() => {
                                    add({ headerName: 'User-Agent', headerValue: 'Mozilla/5.0' });
                                  }}
                                >
                                  添加 User-Agent
                                </Button>
                              </div>
                            </>
                          )}
                        </Form.List>
                      </Form.Item>
                    </>
                  );
                }
                
                return null;
              }}
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
                    <p>代理类型：{
                      proxyTypes.find(item => item.value === editingInterface.proxyType)?.label || 
                      editingInterface.proxyType || '模拟响应'
                    }</p>
                    
                    {editingInterface.proxyType === 'url_redirect' && (
                      <div>
                        <p><b>URL重定向模式规则：</b></p>
                        <ul>
                          <li>URL匹配规则必须是完整URL（包括http://或https://）</li>
                          <li>需要完全匹配URL路径，测试URL必须与匹配规则<b>完全一致</b></li>
                          <li>命中后将直接跳转到目标URL: {editingInterface.targetUrl}</li>
                        </ul>
                      </div>
                    )}
                    
                    {editingInterface.proxyType === 'redirect' && (
                      <div>
                        <p><b>重定向模式规则：</b></p>
                        <ul>
                          <li>URL匹配规则必须以http://或https://开头</li>
                          <li>测试URL必须以匹配规则开头（<b>前缀匹配</b>）</li>
                          <li>命中后将直接跳转到目标URL: {editingInterface.targetUrl}</li>
                        </ul>
                      </div>
                    )}
                    
                    {editingInterface.proxyType === 'response' && (
                      <div>
                        <p>在Whistle规则中，您需要配置完整URL或域名指向whistle.mock-plugins://，然后插件会根据接口的匹配规则处理请求。</p>
                        <p>插件支持以下匹配方式：</p>
                        <ul>
                          <li>精确匹配：完全匹配URL路径部分</li>
                          <li>通配符匹配：使用*代表任意字符（例如：/api/users/*）</li>
                          <li>正则表达式：使用/pattern/格式（例如：/\/api\/users\/\d+/）</li>
                        </ul>
                      </div>
                    )}
                    
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
                        <span className="label">处理方式：</span>
                        <span className="value">
                          {(() => {
                            const found = proxyTypes.find(item => item.value === editingInterface.proxyType);
                            return found ? found.label : editingInterface.proxyType || '模拟响应';
                          })()}
                        </span>
                      </div>
                      
                      {(editingInterface.proxyType === 'redirect' || editingInterface.proxyType === 'url_redirect') && (
                        <div className="result-item">
                          <span className="label">重定向目标：</span>
                          <span className="value">{testResult.targetUrl || editingInterface.targetUrl}</span>
                        </div>
                      )}
                      
                      {(editingInterface.proxyType === 'redirect' || editingInterface.proxyType === 'url_redirect') && 
                       testResult.formattedHeaders && (
                        <div className="result-item">
                          <span className="label">自定义请求头：</span>
                          <div className="value" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                            {testResult.formattedHeaders}
                          </div>
                        </div>
                      )}
                      
                      {editingInterface.proxyType === 'response' && (
                        <>
                          <div className="result-item">
                            <span className="label">状态码：</span>
                            <span className="value">{testResult.statusCode}</span>
                          </div>
                          <div className="result-item">
                            <span className="label">内容类型：</span>
                            <span className="value">{testResult.contentType}</span>
                          </div>
                        </>
                      )}
                      
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
                      
                      {editingInterface.proxyType === 'response' && (
                        <div className="result-body">
                          <div className="label">响应内容：</div>
                          <pre>{formatResponseContent(testResult.responseBody, testResult.contentType)}</pre>
                        </div>
                      )}
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