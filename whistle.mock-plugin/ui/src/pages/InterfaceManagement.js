import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { Table, Button, Modal, Form, Input, Select, message, Switch, Popconfirm, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import '../styles/interface-management.css';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

const InterfaceManagement = () => {
  const { featureId } = useParams();
  const history = useHistory();
  const [features, setFeatures] = useState([]);
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingInterface, setEditingInterface] = useState(null);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();

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

  useEffect(() => {
    fetchFeatures();
    fetchInterfaces();
  }, []);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/cgi-bin/features');
      setFeatures(response.data.features);
      if (response.data.features.length > 0 && !selectedFeatureId) {
        setSelectedFeatureId(response.data.features[0].id);
      }
      setLoading(false);
    } catch (error) {
      message.error('获取功能模块失败');
      console.error('获取功能模块失败:', error);
      setLoading(false);
    }
  };

  const fetchInterfaces = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/cgi-bin/interfaces');
      setInterfaces(response.data.interfaces);
      setLoading(false);
    } catch (error) {
      message.error('获取接口配置失败');
      console.error('获取接口配置失败:', error);
      setLoading(false);
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
      ...record,
      featureId: record.featureId,
    });
    setModalVisible(true);
  };

  const handleDeleteInterface = async (id) => {
    try {
      await axios.delete(`/cgi-bin/interfaces/${id}`);
      message.success('接口删除成功');
      fetchInterfaces();
    } catch (error) {
      message.error('接口删除失败');
      console.error('接口删除失败:', error);
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    try {
      await axios.patch(`/cgi-bin/interfaces/${id}`, { active: !currentActive });
      message.success(`接口${!currentActive ? '启用' : '禁用'}成功`);
      fetchInterfaces();
    } catch (error) {
      message.error(`接口${!currentActive ? '启用' : '禁用'}失败`);
      console.error(`接口${!currentActive ? '启用' : '禁用'}失败:`, error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingInterface) {
        await axios.put(`/cgi-bin/interfaces/${editingInterface.id}`, {
          ...values,
          active: true,
        });
        message.success('接口更新成功');
      } else {
        await axios.post('/cgi-bin/interfaces', {
          ...values,
          featureId: selectedFeatureId,
          active: true,
        });
        message.success('接口添加成功');
      }
      
      setModalVisible(false);
      fetchInterfaces();
    } catch (error) {
      if (error.errorFields) {
        return; // 表单验证错误
      }
      message.error('操作失败');
      console.error('操作失败:', error);
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

  const handleTestSubmit = async () => {
    try {
      const values = await testForm.validateFields();
      setTestLoading(true);
      
      try {
        // 这里应该调用实际测试接口的逻辑
        // 目前只是显示模拟的响应
        setTestResult({
          success: true,
          statusCode: editingInterface.statusCode,
          contentType: editingInterface.contentType,
          responseBody: editingInterface.responseBody,
          matchedRule: editingInterface.pattern,
          requestUrl: values.testUrl
        });
        message.success('测试成功');
      } catch (error) {
        setTestResult({
          success: false,
          error: error.message
        });
        message.error('测试失败');
      }
      
      setTestLoading(false);
    } catch (error) {
      if (error.errorFields) {
        return; // 表单验证错误
      }
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
      dataIndex: 'pattern',
      key: 'pattern',
      ellipsis: true,
    },
    {
      title: '状态码',
      dataIndex: 'statusCode',
      key: 'statusCode',
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
        <div className="page-header">
          <div className="feature-selector">
            <span>功能模块：</span>
            <Select
              value={selectedFeatureId}
              onChange={handleSelectFeature}
              style={{ width: 200 }}
              placeholder="选择功能模块"
              loading={loading}
            >
              {features.map(feature => (
                <Option key={feature.id} value={feature.id}>{feature.name}</Option>
              ))}
            </Select>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddInterface}
            disabled={!selectedFeatureId}
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

        <div className="interface-list-container">
          <Table
            columns={columns}
            dataSource={filteredInterfaces}
            rowKey="id"
            loading={loading}
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
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              name: '',
              pattern: '',
              statusCode: '200',
              contentType: 'application/json; charset=utf-8',
              responseBody: '{\n  "code": 0,\n  "message": "success",\n  "data": {}\n}'
            }}
          >
            <Form.Item
              name="name"
              label="接口名称"
              rules={[{ required: true, message: '请输入接口名称' }]}
            >
              <Input placeholder="请输入接口名称" />
            </Form.Item>

            <Form.Item
              name="pattern"
              label="URL匹配规则"
              rules={[{ required: true, message: '请输入URL匹配规则' }]}
              extra="支持多种匹配方式：精确匹配 - /api/users，通配符 - /api/users/*，正则表达式 - /api\/users\/\d+/"
            >
              <Input placeholder="例如：/api/users，/api/users/*，/api\/users\/\d+/" />
            </Form.Item>

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

            <Form.Item
              name="responseBody"
              label="响应内容"
              rules={[{ required: true, message: '请输入响应内容' }]}
            >
              <TextArea rows={10} placeholder="请输入响应内容" />
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
                    <p>当前接口匹配规则：<code>{editingInterface.pattern}</code></p>
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
                        <span className="label">状态码：</span>
                        <span className="value">{testResult.statusCode}</span>
                      </div>
                      <div className="result-item">
                        <span className="label">内容类型：</span>
                        <span className="value">{testResult.contentType}</span>
                      </div>
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
      </div>
    </AppLayout>
  );
};

export default InterfaceManagement; 