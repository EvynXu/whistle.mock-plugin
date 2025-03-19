import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { Form, Input, Button, Switch, Card, message, Divider, Typography, Space, Alert, InputNumber } from 'antd';
import { SaveOutlined, UndoOutlined } from '@ant-design/icons';
import '../styles/settings.css';

const { Title, Text } = Typography;

const Settings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);

  // 获取当前设置
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // 这里假设有一个获取设置的接口
      // 为了示例，我们使用默认设置
      const defaultSettings = {
        logRetention: 7,
        enableLogging: true,
        enableAutoRefresh: false,
        maxLogEntries: 10000,
        notificationEnabled: true,
        mockjsEnabled: true,
        responseDelay: 0
      };
      
      setSettings(defaultSettings);
      form.setFieldsValue(defaultSettings);
    } catch (error) {
      console.error('获取设置失败:', error);
      message.error('获取设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values) => {
    try {
      setLoading(true);
      // 这里假设有一个保存设置的接口
      // 现在只是模拟保存成功
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSettings(values);
      message.success('设置已保存');
    } catch (error) {
      console.error('保存设置失败:', error);
      message.error('保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      form.setFieldsValue(settings);
    }
  };

  return (
    <AppLayout>
      <div className="page-container">
        <div className="page-title-bar">
          <div>
            <h1 className="page-title">系统设置</h1>
            <div className="page-description">
              配置插件的全局设置项，这些设置将影响所有功能模块
            </div>
          </div>
        </div>

        <Alert
          message="设置功能正在开发中"
          description="目前部分设置可能不生效，我们正在努力完善此功能"
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={settings || {}}
        >
          <Card title="日志设置" className="settings-card">
            <Form.Item
              name="enableLogging"
              label="启用请求日志记录"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            
            <Form.Item
              name="logRetention"
              label="日志保留天数"
              rules={[{ required: true, message: '请输入日志保留天数' }]}
              tooltip="超过设定天数的日志将被自动清理"
            >
              <InputNumber min={1} max={90} />
            </Form.Item>
            
            <Form.Item
              name="maxLogEntries"
              label="最大日志条数"
              rules={[{ required: true, message: '请输入最大日志条数' }]}
              tooltip="超过设定条数的日志将被清理"
            >
              <InputNumber min={1000} max={100000} step={1000} />
            </Form.Item>
          </Card>
          
          <Card title="接口模拟设置" className="settings-card">
            <Form.Item
              name="mockjsEnabled"
              label="启用 Mock.js 数据模拟"
              valuePropName="checked"
              tooltip="使用 Mock.js 生成随机数据"
            >
              <Switch />
            </Form.Item>
            
            <Form.Item
              name="responseDelay"
              label="全局响应延迟（毫秒）"
              tooltip="所有接口默认的响应延迟时间"
            >
              <InputNumber min={0} max={10000} />
            </Form.Item>
            
            <Form.Item
              name="notificationEnabled"
              label="启用请求匹配通知"
              valuePropName="checked"
              tooltip="接口匹配成功时显示通知"
            >
              <Switch />
            </Form.Item>
          </Card>
          
          <Card title="界面设置" className="settings-card">
            <Form.Item
              name="enableAutoRefresh"
              label="启用页面自动刷新"
              valuePropName="checked"
              tooltip="启用后，页面数据将定期自动刷新"
            >
              <Switch />
            </Form.Item>
            
            <Form.Item
              name="theme"
              label="界面主题"
            >
              <Input disabled placeholder="暂不支持自定义主题" />
            </Form.Item>
          </Card>
          
          <div className="settings-actions">
            <Space>
              <Button 
                type="default" 
                icon={<UndoOutlined />} 
                onClick={handleReset}
              >
                重置
              </Button>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                htmlType="submit" 
                loading={loading}
              >
                保存设置
              </Button>
            </Space>
          </div>
        </Form>
      </div>
    </AppLayout>
  );
};

export default Settings; 