import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Statistic, Row, Col, Modal, Form, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { FeatureAPI } from '../services/api';

const { Title, Paragraph } = Typography;
const { confirm } = Modal;

const HomePage = () => {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editFeatureId, setEditFeatureId] = useState(null);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const data = await FeatureAPI.getAllFeatures();
      setFeatures(data);
    } catch (error) {
      console.error("获取功能列表失败:", error);
      // 在实际项目中应添加错误提示
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setEditFeatureId(null);
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    form.setFieldsValue({
      name: record.name,
      description: record.description,
    });
    setEditFeatureId(record.id);
    setModalVisible(true);
  };

  const handleDelete = (record) => {
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除功能 "${record.name}" 吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await FeatureAPI.deleteFeature(record.id);
          fetchFeatures();
        } catch (error) {
          console.error("删除功能失败:", error);
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
      if (editFeatureId) {
        await FeatureAPI.updateFeature(editFeatureId, values);
      } else {
        await FeatureAPI.createFeature(values);
      }
      setModalVisible(false);
      fetchFeatures();
    } catch (error) {
      console.error("保存功能失败:", error);
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '接口数量',
      dataIndex: 'interfaceCount',
      key: 'interfaceCount',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="home-page">
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={8}>
          <Card>
            <Statistic title="功能总数" value={features.length} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="接口总数" 
              value={features.reduce((sum, feature) => sum + (feature.interfaceCount || 0), 0)} 
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="今日请求次数" value={0} />
          </Card>
        </Col>
      </Row>

      <Card 
        title="功能列表" 
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加功能
          </Button>
        }
      >
        <Table 
          columns={columns} 
          dataSource={features} 
          rowKey="id" 
          loading={loading}
        />
      </Card>

      <Modal
        title={editFeatureId ? "编辑功能" : "添加功能"}
        open={modalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ name: '', description: '' }}
        >
          <Form.Item
            name="name"
            label="功能名称"
            rules={[{ required: true, message: '请输入功能名称!' }]}
          >
            <Input placeholder="请输入功能名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="功能描述"
          >
            <Input.TextArea placeholder="请输入功能描述" rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HomePage; 