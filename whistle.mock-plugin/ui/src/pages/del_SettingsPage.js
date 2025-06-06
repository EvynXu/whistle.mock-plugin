import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Switch, message, Divider, Typography, Space, Select } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

// 模拟设置 API
const SettingsAPI = {
  getSettings: () => Promise.resolve({
    mockFolder: './mocks',
    enableAutoSave: true,
    responseDelay: 200,
    logLevel: 'info',
  }),
  saveSettings: (settings) => Promise.resolve(settings)
};

const SettingsPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const settings = await SettingsAPI.getSettings();
      form.setFieldsValue(settings);
    } catch (error) {
      console.error("获取设置失败:", error);
      message.error('获取设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await SettingsAPI.saveSettings(values);
      message.success('设置保存成功');
    } catch (error) {
      console.error("保存设置失败:", error);
      message.error('保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    fetchSettings();
  };

  return (
    <div className="settings-page">
      <Card title="全局设置">
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            mockFolder: './mocks',
            enableAutoSave: true,
            responseDelay: 200,
            logLevel: 'info',
          }}
        >
          <Title level={4}>基本设置</Title>
          <Form.Item
            name="mockFolder"
            label="Mock 数据文件夹路径"
            rules={[{ required: true, message: '请输入 Mock 数据文件夹路径!' }]}
          >
            <Input placeholder="./mocks" />
          </Form.Item>

          <Form.Item
            name="enableAutoSave"
            label="启用自动保存"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="responseDelay"
            label="默认响应延迟(ms)"
            rules={[{ required: true, message: '请输入默认响应延迟!' }]}
          >
            <Input type="number" placeholder="200" />
          </Form.Item>

          <Form.Item
            name="logLevel"
            label="日志级别"
            rules={[{ required: true, message: '请选择日志级别!' }]}
          >
            <Select placeholder="请选择日志级别">
              <Option value="debug">Debug</Option>
              <Option value="info">Info</Option>
              <Option value="warn">Warning</Option>
              <Option value="error">Error</Option>
            </Select>
          </Form.Item>

          <Divider />

          <Title level={4}>使用说明</Title>
          <Paragraph>
            Whistle Mock 插件用于快速创建 API 模拟数据，支持以下功能：
          </Paragraph>

          <Paragraph>
            <ul>
              <li>
                <Text strong>接口管理</Text> - 创建和管理模拟接口，支持 GET、POST 等多种请求方法
              </li>
              <li>
                <Text strong>文件管理</Text> - 编辑 JSON 文件作为模拟数据源
              </li>
              <li>
                <Text strong>Mock 模板语法</Text> - 支持使用 Mock.js 模板语法生成随机数据
              </li>
              <li>
                <Text strong>路径匹配规则</Text> - 支持通配符和正则表达式匹配请求路径
              </li>
            </ul>
          </Paragraph>

          <Paragraph>
            要启用 Whistle Mock 插件，请在 Whistle 界面添加以下规则：
            <pre>
              example.com mock://
            </pre>
          </Paragraph>

          <Divider />

          <Space>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={handleSave}
              loading={loading}
            >
              保存设置
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleReset}
            >
              重置
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default SettingsPage; 