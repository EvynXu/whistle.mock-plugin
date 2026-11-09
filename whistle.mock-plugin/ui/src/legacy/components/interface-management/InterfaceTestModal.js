import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Input, Alert, Space } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { proxyTypes } from './constants';
import { isUrlMatchPattern, refreshCacheAfterUpdate } from './utils';
import axios from 'axios';

const InterfaceTestModal = ({ 
  visible, 
  onCancel, 
  editingInterface 
}) => {
  const [testForm] = Form.useForm();
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  // 清理函数：模态框关闭时重置状态
  useEffect(() => {
    if (!visible) {
      setTestResult(null);
      setTestLoading(false);
      testForm.resetFields();
    }
  }, [visible, testForm]);

  const handleTestSubmit = async () => {
    try {
      const values = await testForm.validateFields();
      const { testUrl } = values;
      
      if (!testUrl) {
        return;
      }
      
      setTestLoading(true);
      
      try {
        // 测试前刷新缓存，确保使用最新的接口定义
        await refreshCacheAfterUpdate();
      } catch (error) {
        // 即使刷新缓存失败，也继续测试
        console.warn('刷新缓存失败，将使用现有的缓存数据:', error);
      }
      
      try {
        // 验证测试 URL 是否匹配当前接口的匹配规则
        if (!isUrlMatchPattern(testUrl, editingInterface.urlPattern, editingInterface.proxyType)) {
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
          setTestLoading(false);
          return;
        }

        // 调用实际测试接口
        const response = await axios.post(`/cgi-bin/test-interface`, {
          url: testUrl,
          interfaceId: editingInterface.id
        });
        
        if (response.data && response.data.code === 0) {
          // 设置测试结果
          setTestResult({
            success: true,
            ...response.data.data,
            matchedRule: editingInterface.urlPattern,
            httpMethod: editingInterface.httpMethod,
            requestUrl: testUrl,
            mockInfo: response.data.data.mockInfo
          });
        } else {
          throw new Error(response.data?.message || '测试响应格式不正确');
        }
      } catch (error) {
        setTestResult({
          success: false,
          error: error.response?.data?.message || error.message || '测试失败'
        });
      }
      
      setTestLoading(false);
    } catch (error) {
      if (error.errorFields) {
        return; // 表单验证错误
      }
      console.error('测试失败:', error);
      setTestLoading(false);
    }
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

  return (
    <Modal
      title="测试接口"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
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
                        {
                          editingInterface.customHeaders && 
                          Object.entries(editingInterface.customHeaders)
                            .map(([key, value]) => {
                              const generatedValue = testResult.customHeaders[key];
                              return (
                                <div key={key}>
                                  {key}: {value.startsWith('@') ? (
                                    <span>
                                      <span style={{ color: '#d9d9d9' }}>{value}</span>
                                      {' '} → {' '}
                                      <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{generatedValue}</span>
                                      <span style={{ color: '#8c8c8c', fontSize: '12px' }}> (随机生成)</span>
                                    </span>
                                  ) : generatedValue}
                                </div>
                              );
                            })
                        }
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
  );
};

export default InterfaceTestModal; 