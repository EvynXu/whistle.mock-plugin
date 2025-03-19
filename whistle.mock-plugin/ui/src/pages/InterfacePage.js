import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Select, Tabs, Form, Input, Modal, Divider, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, ExclamationCircleOutlined, CopyOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { FeatureAPI, InterfaceAPI } from '../services/api';

const { Option } = Select;
const { TabPane } = Tabs;
const { confirm } = Modal;
const { TextArea } = Input;

const InterfacePage = () => {
  const [features, setFeatures] = useState([]);
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentInterface, setCurrentInterface] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchFeatures();
  }, []);

  useEffect(() => {
    if (selectedFeature) {
      fetchInterfaces(selectedFeature);
    }
  }, [selectedFeature]);

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const data = await FeatureAPI.getAllFeatures();
      setFeatures(data);
      if (data.length > 0 && !selectedFeature) {
        setSelectedFeature(data[0].id);
      }
    } catch (error) {
      console.error("获取功能列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInterfaces = async (featureId) => {
    setLoading(true);
    try {
      const data = await FeatureAPI.getFeatureInterfaces(featureId);
      setInterfaces(data);
    } catch (error) {
      console.error("获取接口列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureChange = (value) => {
    setSelectedFeature(value);
  };

  const handleAdd = () => {
    form.resetFields();
    form.setFieldsValue({
      featureId: selectedFeature,
      method: 'GET',
      status: 200,
      delay: 0,
      headers: '{\n  "Content-Type": "application/json"\n}',
      responseBody: '{\n  "code": 0,\n  "message": "success",\n  "data": {}\n}'
    });
    setCurrentInterface(null);
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    form.setFieldsValue({
      ...record,
      headers: typeof record.headers === 'object' 
        ? JSON.stringify(record.headers, null, 2) 
        : record.headers || '{}',
      responseBody: typeof record.responseBody === 'object' 
        ? JSON.stringify(record.responseBody, null, 2) 
        : record.responseBody || '{}'
    });
    setCurrentInterface(record);
    setModalVisible(true);
  };

  const handleDelete = (record) => {
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除接口 "${record.path}" 吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await InterfaceAPI.deleteInterface(record.id);
          fetchInterfaces(selectedFeature);
        } catch (error) {
          console.error("删除接口失败:", error);
        }
      },
    });
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      try {
        // 尝试解析 JSON
        if (values.headers) {
          values.headers = JSON.parse(values.headers);
        }
        if (values.responseBody) {
          values.responseBody = JSON.parse(values.responseBody);
        }
      } catch (e) {
        message.error('JSON 格式错误，请检查');
        return;
      }
      
      if (currentInterface) {
        await InterfaceAPI.updateInterface(currentInterface.id, values);
      } else {
        await InterfaceAPI.createInterface(values);
      }
      
      setModalVisible(false);
      fetchInterfaces(selectedFeature);
    } catch (error) {
      console.error("保存接口失败:", error);
    }
  };

  const handleTest = async (record) => {
    try {
      const result = await InterfaceAPI.testInterface(record.id);
      Modal.info({
        title: '测试结果',
        width: 800,
        content: (
          <div>
            <pre style={{ maxHeight: '500px', overflow: 'auto' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ),
        okText: '关闭'
      });
    } catch (error) {
      console.error("测试失败:", error);
      message.error('测试失败: ' + error.message);
    }
  };

  const columns = [
    {
      title: 'URL 路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
    },
    {
      title: '请求方法',
      dataIndex: 'method',
      key: 'method',
      width: 100,
    },
    {
      title: '状态码',
      dataIndex: 'status',
      key: 'status',
      width: 100,
    },
    {
      title: '延迟(ms)',
      dataIndex: 'delay',
      key: 'delay',
      width: 100,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_, record) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="text" icon={<PlayCircleOutlined />} onClick={() => handleTest(record)}>
            测试
          </Button>
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="interface-page">
      <Card
        title="接口管理"
        extra={
          <Space>
            <span>功能：</span>
            <Select
              style={{ width: 200 }}
              value={selectedFeature}
              onChange={handleFeatureChange}
              loading={loading}
            >
              {features.map(feature => (
                <Option key={feature.id} value={feature.id}>{feature.name}</Option>
              ))}
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加接口
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={interfaces}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title={currentInterface ? "编辑接口" : "添加接口"}
        open={modalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="featureId"
            label="所属功能"
            rules={[{ required: true, message: '请选择所属功能!' }]}
          >
            <Select>
              {features.map(feature => (
                <Option key={feature.id} value={feature.id}>{feature.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="path"
            label="URL 路径"
            rules={[{ required: true, message: '请输入 URL 路径!' }]}
          >
            <Input placeholder="/api/your-path" />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="method"
              label="请求方法"
              rules={[{ required: true, message: '请选择请求方法!' }]}
              style={{ flex: 1 }}
            >
              <Select>
                <Option value="GET">GET</Option>
                <Option value="POST">POST</Option>
                <Option value="PUT">PUT</Option>
                <Option value="DELETE">DELETE</Option>
                <Option value="PATCH">PATCH</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="status"
              label="状态码"
              rules={[{ required: true, message: '请输入状态码!' }]}
              style={{ flex: 1 }}
            >
              <Input type="number" placeholder="200" />
            </Form.Item>

            <Form.Item
              name="delay"
              label="延迟(ms)"
              rules={[{ required: true, message: '请输入延迟时间!' }]}
              style={{ flex: 1 }}
            >
              <Input type="number" placeholder="0" />
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input placeholder="接口描述" />
          </Form.Item>

          <Tabs defaultActiveKey="1">
            <TabPane tab="响应体" key="1">
              <Form.Item
                name="responseBody"
                rules={[{ required: true, message: '请输入响应体!' }]}
              >
                <TextArea rows={10} placeholder="响应JSON数据" />
              </Form.Item>
            </TabPane>
            <TabPane tab="响应头" key="2">
              <Form.Item
                name="headers"
              >
                <TextArea rows={10} placeholder="响应头JSON数据" />
              </Form.Item>
            </TabPane>
          </Tabs>
        </Form>
      </Modal>
    </div>
  );
};

export default InterfacePage; 