import React, { useEffect, useState } from 'react';
import { Drawer, Form, Input, message, Button, Space } from 'antd';
import axios from 'axios';
import { ResponseContentEditor, PreviewModal, formatResponseContent, refreshCacheAfterUpdate } from '.';

const DataManagementDrawer = ({ visible, onCancel, interfaceItem, onSaved }) => {
  const [form] = Form.useForm();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);

  useEffect(() => {
    if (visible && interfaceItem) {
      let responses = Array.isArray(interfaceItem.responses) ? interfaceItem.responses : [];
      let activeResponseId = interfaceItem.activeResponseId || (responses[0] && responses[0].id) || '';
      form.setFieldsValue({ responses, activeResponseId });
    }
  }, [visible, interfaceItem]);

  const handlePreview = () => {
    const values = form.getFieldsValue(true);
    const responses = Array.isArray(values.responses) ? values.responses : [];
    const activeResponse = responses.find(r => r.id === values.activeResponseId) || responses[0];
    if (!activeResponse) {
      message.error('未找到有效的响应内容');
      return;
    }
    const contentType = 'application/json; charset=utf-8';
    const formatted = formatResponseContent(activeResponse.content || '', contentType);
    setPreviewContent({ title: `预览: ${activeResponse.name || '未命名响应'}`, content: formatted, contentType, description: '' });
    setPreviewVisible(true);
  };

  const handleOk = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue(true);
      const payload = {
        responses: Array.isArray(values.responses) ? values.responses : [],
        activeResponseId: values.activeResponseId || (values.responses && values.responses[0] && values.responses[0].id) || ''
      };
      if (!interfaceItem || !interfaceItem.id) {
        message.error('缺少接口ID，无法保存');
        return;
      }
      const res = await axios.patch(`/cgi-bin/interfaces/${interfaceItem.id}`, payload);
      if (res.data && res.data.code === 0) {
        message.success('保存成功');
        await refreshCacheAfterUpdate();
        if (onSaved) onSaved();
        if (onCancel) onCancel();
      } else {
        throw new Error(res.data?.message || '保存失败');
      }
    } catch (err) {
      if (err && err.errorFields) return; // 表单校验错误
      console.error('保存失败', err);
      message.error(err.response?.data?.message || err.message || '保存失败');
    }
  };

  return (
    <>
      <Drawer
        title="数据管理"
        placement="right"
        width={1040}
        open={visible}
        onClose={onCancel}
        destroyOnClose
        bodyStyle={{ paddingBottom: 80 }}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={onCancel}>取消</Button>
              <Button type="primary" onClick={handleOk}>保存</Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical" initialValues={{ responses: [], activeResponseId: '' }}>
          <Form.Item name="responses" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="activeResponseId" hidden>
            <Input />
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const responses = getFieldValue('responses') || [];
              const activeResponseId = getFieldValue('activeResponseId') || (responses[0] && responses[0].id) || '';
              return (
                <ResponseContentEditor
                  form={form}
                  responses={responses}
                  activeResponseId={activeResponseId}
                  onPreview={handlePreview}
                  enableSorting={true}
                />
              );
            }}
          </Form.Item>
        </Form>
      </Drawer>

      <PreviewModal
        visible={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        previewContent={previewContent}
      />
    </>
  );
};

export default DataManagementDrawer;

