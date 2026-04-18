import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { Card, Typography, Switch, Space, Modal, Button, message } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import '../styles/settings.css';

const { Text } = Typography;

const syncSettingsToBackend = (patch) => {
  axios.put('/cgi-bin/settings', patch).catch(() => {});
};

const Settings = () => {
  const [displayMode, setDisplayMode] = useState('modal');
  const [interfaceFormDisplayMode, setInterfaceFormDisplayMode] = useState('modal');
  const [interfaceParamMatcherEnabled, setInterfaceParamMatcherEnabled] = useState(true);
  const [responseParamMatcherEnabled, setResponseParamMatcherEnabled] = useState(true);
  const [cyberThemeEnabled, setCyberThemeEnabled] = useState(true);

  useEffect(() => {
    const savedMode = localStorage.getItem('dataManagementDisplayMode');
    if (savedMode) setDisplayMode(savedMode);

    const savedInterfaceFormMode = localStorage.getItem('interfaceFormDisplayMode');
    if (savedInterfaceFormMode) setInterfaceFormDisplayMode(savedInterfaceFormMode);

    // 优先从后端读取入参匹配开关，保持前后端一致
    axios.get('/cgi-bin/settings').then(({ data }) => {
      const ipm = data.interfaceParamMatcherEnabled !== false;
      const rpm = data.responseParamMatcherEnabled !== false;
      setInterfaceParamMatcherEnabled(ipm);
      setResponseParamMatcherEnabled(rpm);
      localStorage.setItem('interfaceParamMatcherEnabled', String(ipm));
      localStorage.setItem('responseParamMatcherEnabled', String(rpm));
      window.dispatchEvent(new Event('storage'));
    }).catch(() => {
      const savedInterfaceParamMatcher = localStorage.getItem('interfaceParamMatcherEnabled');
      if (savedInterfaceParamMatcher !== null) setInterfaceParamMatcherEnabled(savedInterfaceParamMatcher !== 'false');
      const savedResponseParamMatcher = localStorage.getItem('responseParamMatcherEnabled');
      if (savedResponseParamMatcher !== null) setResponseParamMatcherEnabled(savedResponseParamMatcher !== 'false');
    });

    // 读取赛博朋克主题开关（默认开启）
    const savedCyber = localStorage.getItem('cyberTheme');
    setCyberThemeEnabled(savedCyber !== 'false');
  }, []);

  const handleDisplayModeChange = (checked) => {
    const newMode = checked ? 'drawer' : 'modal';
    setDisplayMode(newMode);
    localStorage.setItem('dataManagementDisplayMode', newMode);
    window.dispatchEvent(new Event('storage'));
  };

  const handleInterfaceFormDisplayModeChange = (checked) => {
    const newMode = checked ? 'drawer' : 'modal';
    setInterfaceFormDisplayMode(newMode);
    localStorage.setItem('interfaceFormDisplayMode', newMode);
    window.dispatchEvent(new Event('storage'));
  };

  const handleInterfaceParamMatcherChange = (checked) => {
    setInterfaceParamMatcherEnabled(checked);
    localStorage.setItem('interfaceParamMatcherEnabled', String(checked));
    syncSettingsToBackend({ interfaceParamMatcherEnabled: checked });
    window.dispatchEvent(new Event('storage'));
  };

  const handleResponseParamMatcherChange = (checked) => {
    setResponseParamMatcherEnabled(checked);
    localStorage.setItem('responseParamMatcherEnabled', String(checked));
    syncSettingsToBackend({ responseParamMatcherEnabled: checked });
    window.dispatchEvent(new Event('storage'));
  };

  const handleCyberThemeChange = (checked) => {
    setCyberThemeEnabled(checked);
    localStorage.setItem('cyberTheme', String(checked));
    window.dispatchEvent(new Event('storage'));
    message.success(checked ? '赛博朋克主题已开启，刷新页面后生效' : '经典主题已开启，刷新页面后生效');
    // 1.5秒后自动刷新
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const showMatcherRuleModal = (type) => {
    if (type === 'interface') {
      Modal.info({
        title: '接口入参匹配规则说明',
        width: 560,
        content: (
          <div>
            <p>用于区分同一 URL 下的不同接口定义（接口级匹配）。</p>
            <p>执行顺序与优先级：</p>
            <ul>
              <li>先进行 URL 匹配，命中多个接口时，按接口匹配条件顺序查找第一条命中规则。</li>
              <li>若命中规则且配置了目标响应，则直接返回该响应（最高优先级）。</li>
              <li>若命中规则但未配置目标响应，则进入“响应入参匹配”阶段继续判断。</li>
              <li>若本开关关闭，则跳过接口级匹配，直接走“响应入参匹配”（若开启）。</li>
            </ul>
            <p>兜底逻辑：</p>
            <ul>
              <li>若最终没有任何入参规则命中，系统返回默认响应。</li>
              <li>支持嵌套参数路径，例如：data.user.id。</li>
            </ul>
          </div>
        )
      });
      return;
    }

    Modal.info({
      title: '响应入参匹配规则说明',
      width: 560,
      content: (
        <div>
          <p>用于在同一接口内，根据请求参数选择具体响应（响应级匹配）。</p>
          <p>执行顺序与优先级：</p>
          <ul>
            <li>仅在“接口入参匹配”未直接确定目标响应时才会执行。</li>
            <li>按响应配置顺序匹配，命中第一条规则即返回对应响应。</li>
            <li>支持精确匹配、包含匹配、正则匹配。</li>
            <li>若本开关关闭，则跳过响应级匹配，直接使用默认响应。</li>
          </ul>
          <p>兜底逻辑：</p>
          <ul>
            <li>开启但未命中任一规则时，使用默认响应。</li>
            <li>与接口级都关闭时，请求将直接返回默认响应。</li>
          </ul>
        </div>
      )
    });
  };

  return (
    <AppLayout>
      <div className="page-container">
        <div className="page-title-bar">
          <div>
            <h1 className="page-title">系统设置</h1>
            <div className="page-description">
              配置插件的全局设置项和界面选项
            </div>
          </div>
        </div>

        <Card title="界面设置" className="settings-card">
          <div className="settings-item">
            <div className="settings-item-header">
              <div>
                <div className="settings-item-title">数据管理交互</div>
                <div className="settings-item-description">
                  选择数据管理的显示方式
                </div>
              </div>
              <Space>
                <Text type="secondary">
                  {displayMode === 'drawer' ? '抽屉模式' : '弹窗模式'}
                </Text>
                <Switch 
                  checked={displayMode === 'drawer'}
                  onChange={handleDisplayModeChange}
                />
              </Space>
            </div>
          </div>

          <div className="settings-item">
            <div className="settings-item-header">
              <div>
                <div className="settings-item-title">接口表单交互</div>
                <div className="settings-item-description">
                  选择添加/编辑接口的显示方式
                </div>
              </div>
              <Space>
                <Text type="secondary">
                  {interfaceFormDisplayMode === 'drawer' ? '抽屉模式' : '弹窗模式'}
                </Text>
                <Switch 
                  checked={interfaceFormDisplayMode === 'drawer'}
                  onChange={handleInterfaceFormDisplayModeChange}
                />
              </Space>
            </div>
          </div>

          <div className="settings-item">
            <div className="settings-item-header">
              <div>
                <div className="settings-item-title">
                  接口入参匹配
                  <Button
                    type="text"
                    size="small"
                    className="settings-help-icon"
                    icon={<QuestionCircleOutlined />}
                    onClick={() => showMatcherRuleModal('interface')}
                  />
                </div>
                <div className="settings-item-description">
                  是否在接口编辑表单中显示「接口匹配条件」配置区域
                </div>
              </div>
              <Space>
                <Text type="secondary">
                  {interfaceParamMatcherEnabled ? '已开启' : '已关闭'}
                </Text>
                <Switch
                  checked={interfaceParamMatcherEnabled}
                  onChange={handleInterfaceParamMatcherChange}
                />
              </Space>
            </div>
          </div>

          <div className="settings-item">
            <div className="settings-item-header">
              <div>
                <div className="settings-item-title">
                  响应入参匹配
                  <Button
                    type="text"
                    size="small"
                    className="settings-help-icon"
                    icon={<QuestionCircleOutlined />}
                    onClick={() => showMatcherRuleModal('response')}
                  />
                </div>
                <div className="settings-item-description">
                  是否在响应内容编辑器中显示「入参匹配规则」配置区域
                </div>
              </div>
              <Space>
                <Text type="secondary">
                  {responseParamMatcherEnabled ? '已开启' : '已关闭'}
                </Text>
                <Switch
                  checked={responseParamMatcherEnabled}
                  onChange={handleResponseParamMatcherChange}
                />
              </Space>
            </div>
          </div>
        </Card>

        <Card title="主题设置" className="settings-card" style={{ marginTop: 24 }}>
          <div className="settings-item">
            <div className="settings-item-header">
              <div>
                <div className="settings-item-title">赛博朋克风格</div>
                <div className="settings-item-description">
                  启用深色赛博朋克霓虹主题，关闭则恢复经典亮色主题
                </div>
              </div>
              <Space>
                <Text type="secondary">
                  {cyberThemeEnabled ? '已开启' : '已关闭'}
                </Text>
                <Switch
                  checked={cyberThemeEnabled}
                  onChange={handleCyberThemeChange}
                />
              </Space>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings; 
