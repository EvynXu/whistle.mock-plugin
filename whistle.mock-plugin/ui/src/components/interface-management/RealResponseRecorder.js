import React, { useState } from 'react';
import { Button, Input, message, Space, Tabs, Tag } from 'antd';
import { DownloadOutlined, ThunderboltOutlined, CopyOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;

/**
 * JSON 转 Mock.js 模板
 * 简单转换：字符串 -> '@string', 数字 -> '@integer(1,100)', 布尔 -> '@boolean'
 * 保留对象结构
 */
const jsonToMockTemplate = (obj, depth = 0) => {
  if (obj === null) return null;
  if (typeof obj === 'string') {
    // 保留特定格式字符串的提示
    if (/^\d{4}-\d{2}-\d{2}/.test(obj)) return '@date';
    if (/^\d{4}-\d{2}-\d{2}T/.test(obj)) return '@datetime';
    if (/^https?:\/\//.test(obj)) return '@url';
    if (/^\w+@\w+\.\w+/.test(obj)) return '@email';
    if (/^1[3-9]\d{9}$/.test(obj)) return '@string("number", 11)';
    return '@csentence(3, 10)';
  }
  if (typeof obj === 'number') {
    if (Number.isInteger(obj)) return '@integer(1, 999)';
    return '@float(1, 100, 2, 2)';
  }
  if (typeof obj === 'boolean') return '@boolean';
  if (Array.isArray(obj)) {
    if (obj.length === 0) return [];
    const template = jsonToMockTemplate(obj[0], depth + 1);
    // 用 |1-5 表示数组长度随机
    return [template];
  }
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = jsonToMockTemplate(value, depth + 1);
    }
    return result;
  }
  return obj;
};

const RealResponseRecorder = ({ urlPattern, onApply, method = 'GET' }) => {
  const [fetchUrl, setFetchUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [activeTab, setActiveTab] = useState('preview');

  const handleFetch = async () => {
    const targetUrl = fetchUrl.trim() || urlPattern;
    if (!targetUrl) {
      message.warning('请输入目标 URL');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/cgi-bin/proxy-fetch', {
        url: targetUrl,
        method,
      });
      if (res.data.code === 0) {
        setResponse(res.data.data);
        setActiveTab('preview');
        message.success('抓取成功');
      } else {
        throw new Error(res.data.message);
      }
    } catch (err) {
      message.error('抓取失败: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMock = () => {
    if (!response?.body) return;
    try {
      const json = JSON.parse(response.body);
      const template = jsonToMockTemplate(json);
      const mockTemplate = JSON.stringify(template, null, 2);
      onApply?.(mockTemplate);
      message.success('Mock 模板已生成');
    } catch (e) {
      message.error('响应不是 JSON，无法生成模板: ' + e.message);
    }
  };

  const handleCopy = () => {
    if (response?.body) {
      navigator.clipboard.writeText(response.body);
      message.success('已复制');
    }
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap style={{ width: '100%' }}>
          <Input
            placeholder={urlPattern || '输入真实接口 URL'}
            value={fetchUrl}
            onChange={(e) => setFetchUrl(e.target.value)}
            style={{ width: '100%', minWidth: 200 }}
            onPressEnter={handleFetch}
          />
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={loading}
            onClick={handleFetch}
          >
            抓取真实响应
          </Button>
        </Space>

        {response && (
          <>
            <Space>
              <Tag color={response.status >= 200 && response.status < 300 ? 'success' : 'error'}>
                {response.status} {response.statusText}
              </Tag>
              <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>
                复制原文
              </Button>
              <Button size="small" icon={<DownloadOutlined />} onClick={handleGenerateMock} type="primary">
                生成 Mock 模板
              </Button>
            </Space>

            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <Tabs.TabPane tab="响应预览" key="preview">
                <TextArea
                  value={response.body}
                  readOnly
                  rows={12}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
              </Tabs.TabPane>
              <Tabs.TabPane tab="生成的 Mock 模板" key="mock">
                <TextArea
                  value={(() => {
                    try {
                      const json = JSON.parse(response.body);
                      const template = jsonToMockTemplate(json);
                      return JSON.stringify(template, null, 2);
                    } catch (e) {
                      return '// 响应不是 JSON，无法生成模板\n' + response.body;
                    }
                  })()}
                  readOnly
                  rows={12}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
              </Tabs.TabPane>
            </Tabs>
          </>
        )}
      </Space>
    </div>
  );
};

export default RealResponseRecorder;
