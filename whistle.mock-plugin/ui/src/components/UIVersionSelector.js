import React from 'react';
import { Radio, Typography } from 'antd';

export default function UIVersionSelector() {
  const current = localStorage.getItem('mm-ui-version') === 'legacy' ? 'legacy' : 'modern';
  return <div style={{ marginBottom: 24 }}>
    <Typography.Title level={5}>界面版本</Typography.Title>
    <Radio.Group value={current} onChange={e => {
      localStorage.setItem('mm-ui-version', e.target.value);
      window.location.reload();
    }} options={[{ value: 'modern', label: 'UI 3.0 工作台' }, { value: 'legacy', label: '经典 UI 2.0' }]} />
    <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>切换后刷新页面，两个界面共用原有模块、接口和同步数据。此偏好仅保存在当前浏览器。</Typography.Paragraph>
  </div>;
}
