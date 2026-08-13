import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CloudSyncOutlined,
  DisconnectOutlined,
  DownloadOutlined,
  LinkOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import '../styles/webdav-sync.css';

const { getApiError } = require('../utils/api-error');

const { Paragraph, Text, Title } = Typography;

const formatTime = (value) => {
  if (!value) return '未获取';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
};

const ModuleSelector = ({
  title,
  eyebrow,
  modules,
  selectedIds,
  onChange,
  emptyText,
  action,
  actionIcon,
  actionClassName,
  actionLoading,
  disabled,
  onAction,
  extra,
}) => {
  const allIds = modules.map(moduleItem => moduleItem.id);
  const selectedModuleCount = allIds.filter(id => selectedIds.includes(id)).length;
  const allSelected = modules.length > 0 && selectedModuleCount == modules.length;
  const partiallySelected = selectedModuleCount > 0 && !allSelected;

  return (
    <Card className="webdav-sync-module-card" bordered={false}>
      <div className="webdav-sync-module-header">
        <div>
          <Text type="secondary" className="webdav-sync-module-eyebrow">{eyebrow}</Text>
          <Title level={5}>{title}</Title>
        </div>
        {extra}
      </div>
      <div className="webdav-sync-select-all">
        <Checkbox
          checked={allSelected}
          indeterminate={partiallySelected}
          disabled={!modules.length || disabled}
          onChange={event => onChange(event.target.checked ? allIds : [])}
        >
          全选
        </Checkbox>
        <Text type="secondary">已选择 {selectedModuleCount} / {modules.length}</Text>
      </div>
      <div className="webdav-sync-module-list">
        {modules.length ? (
          <Checkbox.Group value={selectedIds} onChange={onChange} disabled={disabled}>
            {modules.map(moduleItem => (
              <Checkbox key={moduleItem.id} value={moduleItem.id} className="webdav-sync-module-option">
                <span className="webdav-sync-module-name">{moduleItem.name}</span>
                <span className="webdav-sync-module-count">{moduleItem.interfaceCount || 0} 个接口</span>
              </Checkbox>
            ))}
          </Checkbox.Group>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
        )}
      </div>
      <Button
        block
        type="primary"
        className={actionClassName}
        icon={actionIcon}
        loading={actionLoading}
        disabled={disabled || !selectedModuleCount}
        onClick={onAction}
      >
        {action}（{selectedModuleCount}）
      </Button>
    </Card>
  );
};

const WebDavSyncModal = ({ open, onClose, onPulled }) => {
  const [form] = Form.useForm();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [lastError, setLastError] = useState('');
  const [selectedPushIds, setSelectedPushIds] = useState([]);
  const [selectedPullIds, setSelectedPullIds] = useState([]);

  const showError = (error, fallback) => {
    const apiError = getApiError(error, fallback);
    setLastError(apiError.message);
    message.error(apiError.message);
    return apiError;
  };

  const applyStatus = (nextStatus, resetSelections = {}) => {
    setStatus(nextStatus);
    if (resetSelections.push) {
      setSelectedPushIds((nextStatus.localModules || []).map(moduleItem => moduleItem.id));
    }
    if (resetSelections.pull) {
      setSelectedPullIds((nextStatus.remoteModules || []).map(moduleItem => moduleItem.id));
    }
  };

  const loadStatus = async () => {
    setLoading(true);
    setLastError('');
    try {
      const response = await axios.get('/cgi-bin/webdav');
      const nextStatus = response.data.data;
      applyStatus(nextStatus, { push: true, pull: true });
      form.setFieldsValue({
        endpoint: nextStatus.endpoint,
        username: nextStatus.username,
        password: '',
      });
      if (nextStatus.configured) {
        try {
          const refreshResponse = await axios.post('/cgi-bin/webdav', { action: 'refresh' });
          applyStatus(refreshResponse.data.data, { pull: true });
        } catch (error) {
          showError(error, '连接配置已读取，但刷新远端模块失败');
        }
      }
    } catch (error) {
      showError(error, '读取 WebDAV 配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadStatus();
  }, [open]);

  const postAction = async (action, payload = {}, resetSelections = {}) => {
    const response = await axios.post('/cgi-bin/webdav', { action, ...payload });
    if (response.data && response.data.data) applyStatus(response.data.data, resetSelections);
    return response.data;
  };

  const handleTest = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch (error) {
      return;
    }
    setActionLoading('test');
    setLastError('');
    try {
      await postAction('test', values);
      message.success('WebDAV 连接测试成功');
    } catch (error) {
      showError(error, 'WebDAV 连接测试失败');
    } finally {
      setActionLoading('');
    }
  };

  const handleConnect = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch (error) {
      return;
    }
    setActionLoading('connect');
    setLastError('');
    try {
      await postAction('connect', values, { push: true, pull: true });
      form.setFieldValue('password', '');
      message.success('WebDAV 连接已保存');
      try {
        const refreshResponse = await axios.post('/cgi-bin/webdav', { action: 'refresh' });
        applyStatus(refreshResponse.data.data, { pull: true });
      } catch (error) {
        showError(error, '连接已保存，但刷新远端模块失败');
      }
    } catch (error) {
      showError(error, '保存 WebDAV 连接失败');
    } finally {
      setActionLoading('');
    }
  };

  const handleRefresh = async () => {
    setActionLoading('refresh');
    setLastError('');
    try {
      await postAction('refresh', {}, { pull: true });
      message.success('远端状态已刷新');
    } catch (error) {
      showError(error, '刷新远端状态失败');
    } finally {
      setActionLoading('');
    }
  };

  const handlePush = async (force = false, featureIds = selectedPushIds) => {
    if (!featureIds.length) {
      message.warning('请至少选择一个要推送的功能模块');
      return;
    }
    setActionLoading('push');
    setLastError('');
    try {
      await postAction('push', { force, featureIds }, { push: true, pull: true });
      message.success(`已推送 ${featureIds.length} 个功能模块`);
    } catch (error) {
      const apiError = getApiError(error, '推送失败');
      if (error.response && error.response.status == 409 && apiError.conflict == 'REMOTE_NEWER' && !force) {
        Modal.confirm({
          title: '远端模块存在差异',
          content: '已选择模块的远端内容与本地不同，继续推送会覆盖远端版本。确定继续吗？',
          okText: '继续推送',
          cancelText: '取消',
          onOk: () => handlePush(true, featureIds),
        });
      } else if (error.response && error.response.status == 409 && apiError.conflict == 'REMOTE_UNVERIFIABLE' && !force) {
        Modal.confirm({
          title: '远端服务不支持并发校验',
          content: 'WebDAV 没有返回 ETag 或 Last-Modified，无法确认模块清单期间是否被其他设备修改。仍要覆盖吗？',
          okText: '强制推送',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => handlePush(true, featureIds),
        });
      } else if (error.response && error.response.status == 409 && apiError.conflict == 'REMOTE_INVALID' && !force) {
        Modal.confirm({
          title: '远端模块清单已损坏',
          content: `继续推送会用已选择的 ${featureIds.length} 个模块创建新清单。确定继续吗？`,
          okText: '推送已选模块',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => handlePush(true, featureIds),
        });
      } else {
        showError(error, '推送失败');
      }
    } finally {
      setActionLoading('');
    }
  };

  const handlePull = async (force = false, featureIds = selectedPullIds) => {
    if (!featureIds.length) {
      message.warning('请至少选择一个要拉取的功能模块');
      return;
    }
    setActionLoading('pull');
    setLastError('');
    try {
      await postAction('pull', { force, featureIds }, { push: true, pull: true });
      message.success(`已拉取 ${featureIds.length} 个功能模块`);
      if (onPulled) await onPulled();
    } catch (error) {
      const apiError = getApiError(error, '拉取失败');
      if (error.response && error.response.status == 409 && apiError.conflict == 'LOCAL_NEWER' && !force) {
        Modal.confirm({
          title: '本地模块存在差异',
          content: `已选择模块的本地内容与远端不同，继续拉取会覆盖其中 ${featureIds.length} 个本地模块及其接口。确定继续吗？`,
          okText: '覆盖本地',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => handlePull(true, featureIds),
        });
      } else if (error.response && error.response.status == 409 && apiError.conflict == 'LOCAL_CHANGED') {
        Modal.warning({
          title: '本地模块发生变化',
          content: '拉取过程中检测到本地模块被修改，本次没有覆盖任何本地数据。请检查修改后重新拉取。',
          okText: '知道了',
        });
      } else {
        showError(error, '拉取失败');
      }
    } finally {
      setActionLoading('');
    }
  };

  const handleDisconnect = async () => {
    setActionLoading('disconnect');
    setLastError('');
    try {
      await postAction('disconnect');
      message.success('已断开 WebDAV，同步文件未删除');
    } catch (error) {
      showError(error, '断开连接失败');
    } finally {
      setActionLoading('');
    }
  };

  const configured = status && status.configured;
  const busy = !!actionLoading;

  return (
    <Modal
      title={null}
      open={open}
      onCancel={() => {
        if (busy) {
          message.warning('WebDAV 操作正在进行，请等待完成后再关闭');
          return;
        }
        onClose();
      }}
      footer={null}
      width={1000}
      maskClosable={!busy}
      keyboard={!busy}
      destroyOnClose
      className="webdav-sync-modal"
      wrapClassName="webdav-sync-modal-wrap"
    >
      <div className="webdav-sync-hero">
        <div className="webdav-sync-hero-icon"><CloudSyncOutlined /></div>
        <div className="webdav-sync-hero-copy">
          <Text className="webdav-sync-kicker">WEBDAV SYNC</Text>
          <Title level={3}>功能模块同步</Title>
          <Paragraph>按模块手动推送或拉取，每个模块独立压缩保存。</Paragraph>
        </div>
        <Tag color={configured ? 'success' : 'default'}>
          {configured ? '已连接' : '尚未配置'}
        </Tag>
      </div>

      {lastError && (
        <Alert
          className="webdav-sync-error"
          type="error"
          showIcon
          closable
          message="WebDAV 操作失败"
          description={lastError}
          onClose={() => setLastError('')}
        />
      )}

      <Spin spinning={loading}>
        {!configured ? (
          <div className="webdav-sync-grid">
            <Card className="webdav-sync-card" bordered={false}>
              <Form form={form} layout="vertical" requiredMark={false}>
                <Form.Item
                  name="endpoint"
                  label="WebDAV 专用目录"
                  rules={[{ required: true, message: '请输入 WebDAV 目录地址' }]}
                  extra="只填写目录，不包含 JSON 文件名；末尾斜杠会自动补齐。"
                >
                  <Input prefix={<LinkOutlined />} placeholder="https://webdav.example.com/webdav/whistle-mock-plugin-sync/" />
                </Form.Item>
                <div className="webdav-sync-form-row">
                  <Form.Item
                    name="username"
                    label="用户名"
                    rules={[{ required: true, message: '请输入 WebDAV 用户名' }]}
                  >
                    <Input autoComplete="username" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    label="密码"
                    rules={[{ required: true, message: '请输入 WebDAV 密码' }]}
                  >
                    <Input.Password autoComplete="current-password" />
                  </Form.Item>
                </div>
                <Space className="webdav-sync-form-actions">
                  <Button
                    icon={<SafetyCertificateOutlined />}
                    loading={actionLoading == 'test'}
                    disabled={busy && actionLoading != 'test'}
                    onClick={handleTest}
                  >
                    测试连接
                  </Button>
                  <Button
                    type="primary"
                    icon={<CloudSyncOutlined />}
                    loading={actionLoading == 'connect'}
                    disabled={busy && actionLoading != 'connect'}
                    onClick={handleConnect}
                  >
                    保存连接
                  </Button>
                </Space>
              </Form>
            </Card>
            <Card className="webdav-sync-note" bordered={false}>
              <SafetyCertificateOutlined className="webdav-sync-note-icon" />
              <Title level={5}>凭据只留在本机</Title>
              <Paragraph>
                账号密码保存在 Whistle 插件数据目录，页面不会读取明文密码，也不会写入远端同步文件。
              </Paragraph>
              <div className="webdav-sync-file-tree">
                <div>专用 WebDAV 目录</div>
                <div>├─ {status ? status.remoteFileName : 'whistle-mock-plugin-manifest.json'}</div>
                <div>└─ 每个功能模块一个 .json.gz</div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="webdav-sync-connected">
            <Card className="webdav-sync-connection-card" bordered={false}>
              <Descriptions title="连接信息" column={{ xs: 1, sm: 2 }} size="small">
                <Descriptions.Item label="目录地址" span={2}>
                  <Text className="webdav-sync-break-all" code>{status.endpoint}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="用户名">{status.username}</Descriptions.Item>
                <Descriptions.Item label="模块清单">{status.remoteFileName}</Descriptions.Item>
              </Descriptions>
              <Popconfirm
                title="确定断开 WebDAV？"
                description="只会清除本机连接信息，不会删除远端同步文件。"
                okText="断开"
                cancelText="取消"
                onConfirm={handleDisconnect}
              >
                <Button
                  type="link"
                  danger
                  className="webdav-sync-disconnect"
                  icon={<DisconnectOutlined />}
                  loading={actionLoading == 'disconnect'}
                  disabled={busy && actionLoading != 'disconnect'}
                >
                  断开连接
                </Button>
              </Popconfirm>
            </Card>
            <div className="webdav-sync-module-grid">
              <ModuleSelector
                eyebrow="LOCAL MODULES"
                title="本地模块"
                modules={status.localModules || []}
                selectedIds={selectedPushIds}
                onChange={setSelectedPushIds}
                emptyText="暂无可推送的功能模块"
                action="推送已选模块"
                actionIcon={<UploadOutlined />}
                actionLoading={actionLoading == 'push'}
                disabled={busy}
                onAction={() => handlePush(false)}
              />
              <ModuleSelector
                eyebrow="REMOTE MODULES"
                title="远端模块"
                modules={status.remoteModules || []}
                selectedIds={selectedPullIds}
                onChange={setSelectedPullIds}
                emptyText={status.remoteFileInvalid ? '远端模块清单已损坏' : '远端暂无模块，请先推送或刷新'}
                action="拉取已选模块"
                actionIcon={<DownloadOutlined />}
                actionClassName="webdav-sync-pull-button"
                actionLoading={actionLoading == 'pull'}
                disabled={busy}
                onAction={() => handlePull(false)}
                extra={(
                  <Button
                    shape="circle"
                    icon={<ReloadOutlined />}
                    loading={actionLoading == 'refresh'}
                    disabled={busy && actionLoading != 'refresh'}
                    onClick={handleRefresh}
                    aria-label="刷新远端模块"
                  />
                )}
              />
            </div>
            <Alert
              className="webdav-sync-manual-note"
              type="info"
              showIcon
              message="只同步已选择的模块"
              description={`远端清单更新时间：${formatTime(status.remoteUpdatedAt)}。拉取只替换同 ID 的已选模块及其接口，未选择的本地模块保持不变。`}
            />
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default WebDavSyncModal;
