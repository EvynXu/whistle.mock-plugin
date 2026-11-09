/**
 * MockDataV2.js - 功能模块管理页面
 */

import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import { Link, useHistory } from 'react-router-dom';
import WebDavSyncModal from '../components/WebDavSyncModal';
import { Card, Row, Col, Button, Modal, Form, Input, message, Switch, Empty, Spin, Typography, Tooltip, Badge, Select, Pagination, Table, Space, Tag, Checkbox } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ApiOutlined, ExportOutlined, ImportOutlined, InfoCircleOutlined, CalendarOutlined, SortAscendingOutlined, AppstoreOutlined, UnorderedListOutlined, CloudSyncOutlined } from '@ant-design/icons';
import '../styles/mock-data.css';
import axios from 'axios';
import PageHeader from '../components/PageHeader';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

// 刷新缓存服务
const flushCache = async () => {
  try {
    const response = await axios.get(`/_flush_cache`);
    return response.data;
  } catch (error) {
    console.error('刷新缓存失败:', error);
    throw error;
  }
};

const MockData = () => {
  const history = useHistory();
  const [mockFeatures, setMockFeatures] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(null);

  // 导出功能弹窗状态
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportIds, setSelectedExportIds] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');
  const [loadError, setLoadError] = useState('');
  const [webDavSyncEnabled, setWebDavSyncEnabled] = useState(false);
  const [showWebDavModal, setShowWebDavModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  // 排序和分页配置（支持缓存）
  const [listConfig, setListConfig] = useState(() => {
    const cached = localStorage.getItem('feature-list-config');
    return cached ? JSON.parse(cached) : {
      sortBy: 'name', // name, createdAt, interfaceCount, active
      sortOrder: 'ascend', // ascend, descend
      pageSize: 12,
      current: 1,
      viewMode: 'card' // card, list
    };
  });

  // 保存列表配置到localStorage
  const saveListConfig = (config) => {
    const newConfig = { ...listConfig, ...config };
    setListConfig(newConfig);
    localStorage.setItem('feature-list-config', JSON.stringify(newConfig));
  };

  // 加载功能列表
  useEffect(() => {
    fetchFeatures();
    fetchWebDavSetting();
  }, []);

  const fetchWebDavSetting = async () => {
    try {
      const response = await axios.get('/cgi-bin/settings');
      setWebDavSyncEnabled(response.data.webDavSyncEnabled == true);
    } catch (error) {
      console.error('读取 WebDAV 同步设置失败:', error);
      setWebDavSyncEnabled(false);
    }
  };

  // 键盘快捷键监听
  useEffect(() => {
    const handleSave = () => {
      if (showModal) {
        handleSubmit();
      }
    };
    const handleNew = () => {
      openModal();
    };
    window.addEventListener('shortcut-save', handleSave);
    window.addEventListener('shortcut-new-interface', handleNew);
    return () => {
      window.removeEventListener('shortcut-save', handleSave);
      window.removeEventListener('shortcut-new-interface', handleNew);
    };
  }, [showModal]);

  // 获取所有功能模块
  const fetchFeatures = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const response = await fetch('/cgi-bin/features');
      const result = await response.json();

      if (result.code === 0) {
        setMockFeatures(result.data || []);
      } else {
        console.error('获取功能模块失败:', result.message);
        setLoadError(result.message || '获取模块失败');
      }
    } catch (error) {
      console.error('获取功能模块错误:', error);
      setLoadError('获取功能模块失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (feature = null) => {
    if (feature) {
      setCurrentFeature(feature);
      form.setFieldsValue({
        name: feature.name,
        description: feature.description,
        active: feature.active !== false
      });
    } else {
      setCurrentFeature(null);
      form.resetFields();
      form.setFieldsValue({
        active: true
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  // 更新成功后刷新缓存
  const refreshCacheAfterUpdate = async () => {
    try {
      await flushCache();
      // 不显示提示，避免干扰主操作的反馈
    } catch (error) {
      // 记录错误但不影响用户体验
      console.error('刷新缓存失败，可能需要等待缓存自动过期:', error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const featureData = {
        ...values
      };

      // 如果是编辑已有功能，添加ID
      if (currentFeature) {
        featureData.id = currentFeature.id;
      }

      setLoading(true);
      const response = await fetch('/cgi-bin/features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(featureData)
      });

      const result = await response.json();

      if (result.code === 0) {
        // 刷新功能列表
        message.success(currentFeature ? '功能模块更新成功' : '功能模块创建成功');
        fetchFeatures();
        closeModal();

        // 刷新缓存
        refreshCacheAfterUpdate();
      } else {
        message.error('操作失败: ' + result.message);
      }
    } catch (error) {
      console.error('保存功能模块错误:', error);
      message.error('保存失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    try {
      const response = await fetch(`/cgi-bin/features?id=${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          active: !currentActive
        })
      });

      const result = await response.json();

      if (result.code === 0) {
        message.success(`${currentActive ? '禁用' : '启用'}功能模块成功`);
        // 更新本地状态
        setMockFeatures(mockFeatures.map(feature =>
          feature.id === id ? { ...feature, active: !currentActive } : feature
        ));

        // 刷新缓存 - 功能启用状态变化是最关键的需要刷新缓存的操作
        refreshCacheAfterUpdate();
      } else {
        message.error(`${currentActive ? '禁用' : '启用'}功能模块失败: ${result.message}`);
      }
    } catch (error) {
      console.error(`${currentActive ? '禁用' : '启用'}功能模块错误:`, error);
      message.error(`操作失败: ${error.message}`);
    }
  };

  const deleteFeature = async (id) => {
    Modal.confirm({
      title: '确定要删除此功能吗？',
      content: '这将删除所有相关的接口和模拟数据，此操作无法恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          const response = await fetch(`/cgi-bin/features?id=${id}`, {
            method: 'DELETE'
          });

          const result = await response.json();

          if (result.code === 0) {
            message.success('功能模块已成功删除');
            // 更新本地状态
            setMockFeatures(mockFeatures.filter(f => f.id !== id));

            // 刷新缓存
            refreshCacheAfterUpdate();
          } else {
            message.error('删除失败: ' + result.message);
          }
        } catch (error) {
          console.error('删除功能错误:', error);
          message.error('操作失败: ' + error.message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const viewInterfaces = (feature) => {
    localStorage.setItem('selectedFeatureId', feature.id);
    history.push(`/interface/${feature.id}`);
  };

  const exportFeatureConfig = async (feature) => {
    try {
      // 获取该功能的所有接口
      const response = await fetch(`/cgi-bin/interfaces?featureId=${feature.id}`);
      const result = await response.json();

      // 创建完整配置
      const config = {
        ...feature,
        interfaces: result.code === 0 ? result.data : []
      };

      const dataStr = JSON.stringify(config, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportFileDefaultName = `whistle-mock-feature-${feature.id}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      message.success('配置导出成功');
    } catch (error) {
      console.error('导出配置错误:', error);
      message.error('导出失败: ' + error.message);
    }
  };

  // 打开导出弹窗（默认全选）
  const openExportModal = () => {
    if (mockFeatures.length === 0) {
      message.warning('暂无可导出的功能模块');
      return;
    }
    setSelectedExportIds(mockFeatures.map(f => f.id));
    setShowExportModal(true);
  };

  // 导出选中的功能模块
  const handleExportSelected = async () => {
    if (selectedExportIds.length === 0) {
      message.warning('请至少选择一个功能模块');
      return;
    }

    try {
      setExporting(true);

      const selectedFeatures = mockFeatures.filter(f => selectedExportIds.includes(f.id));
      const configs = [];

      // 逐个拉取接口配置，组装成与单功能导出一致的结构
      for (const feature of selectedFeatures) {
        const response = await fetch(`/cgi-bin/interfaces?featureId=${feature.id}`);
        const result = await response.json();
        configs.push({
          ...feature,
          interfaces: result.code === 0 ? result.data : []
        });
      }

      // 只选一个时导出单个对象，兼容旧版单功能导入；多个时导出数组
      const exportData = configs.length === 1 ? configs[0] : configs;
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const exportFileName = configs.length === 1
        ? `whistle-mock-feature-${configs[0].id}.json`
        : `whistle-mock-features-${configs.length}.json`;

      const linkElement = document.createElement('a');
      linkElement.href = url;
      linkElement.download = exportFileName;
      linkElement.click();
      URL.revokeObjectURL(url);

      message.success(`成功导出 ${configs.length} 个功能模块`);
      setShowExportModal(false);
    } catch (error) {
      console.error('导出配置错误:', error);
      message.error('导出失败: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const importFeatureConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          // 兼容单个功能（对象）与多个功能（数组）两种导出格式
          const configs = Array.isArray(parsed) ? parsed : [parsed];

          // 过滤掉缺少名称的无效配置
          const validConfigs = configs.filter(config => config && config.name);
          if (validConfigs.length === 0) {
            message.error('无效的配置文件: 缺少功能名称');
            return;
          }

          message.loading({ content: '正在导入功能配置...', key: 'importInfo' });

          let featureSuccess = 0;
          let featureError = 0;
          let interfaceSuccess = 0;
          let interfaceError = 0;

          for (const config of validConfigs) {
            try {
              // 创建新功能
              const featureData = {
                name: config.name,
                description: config.description || '',
                active: config.active !== false
              };

              const featureResponse = await fetch('/cgi-bin/features', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(featureData)
              });

              const featureResult = await featureResponse.json();

              if (featureResult.code === 0) {
                featureSuccess++;
                const newFeature = featureResult.data;

                // 导入接口配置
                if (Array.isArray(config.interfaces) && config.interfaces.length > 0) {
                  for (const interfaceItem of config.interfaces) {
                    try {
                      // 创建接口，使用新功能ID
                      const interfaceData = {
                        ...interfaceItem,
                        featureId: newFeature.id,
                        id: undefined // 不使用原接口ID
                      };

                      await fetch('/cgi-bin/interfaces', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(interfaceData)
                      });

                      interfaceSuccess++;
                    } catch (error) {
                      console.error('导入接口配置失败:', error);
                      interfaceError++;
                    }
                  }
                }
              } else {
                featureError++;
                console.error('导入功能失败:', featureResult.message);
              }
            } catch (error) {
              featureError++;
              console.error('导入功能错误:', error);
            }
          }

          const interfaceSummary = interfaceSuccess > 0 || interfaceError > 0
            ? `，共导入 ${interfaceSuccess} 个接口${interfaceError > 0 ? `（${interfaceError} 个失败）` : ''}`
            : '';
          message.success({
            content: `导入完成：成功 ${featureSuccess} 个功能${featureError > 0 ? `，失败 ${featureError} 个功能` : ''}${interfaceSummary}`,
            key: 'importInfo',
            duration: 3
          });

          // 刷新功能列表
          fetchFeatures();
        } catch (error) {
          console.error('导入配置错误:', error);
          message.error('导入失败: ' + error.message);
        }
      };

      reader.readAsText(file);
    };

    input.click();
  };

  // 排序处理
  const handleSortChange = (value) => {
    saveListConfig({ sortBy: value, current: 1 });
  };

  const handleSortOrderChange = (value) => {
    saveListConfig({ sortOrder: value, current: 1 });
  };

  const handlePageSizeChange = (value) => {
    saveListConfig({ pageSize: value, current: 1 });
  };

  const handlePageChange = (page, pageSize) => {
    saveListConfig({ current: page, pageSize });
  };

  const handleViewModeChange = (mode) => {
    saveListConfig({ viewMode: mode, current: 1 });
  };

  // 获取排序后的功能列表
  const getSortedFeatures = () => {
    const sorted = mockFeatures.filter(f => `${f.name} ${f.description || ''}`.toLowerCase().includes(moduleSearch.toLowerCase())).sort((a, b) => {
      let aValue, bValue;

      switch (listConfig.sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          return listConfig.sortOrder === 'ascend'
            ? aValue.localeCompare(bValue, 'zh-CN')
            : bValue.localeCompare(aValue, 'zh-CN');

        case 'createdAt':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          return listConfig.sortOrder === 'ascend' ? aValue - bValue : bValue - aValue;

        case 'interfaceCount':
          aValue = a.interfaceCount || 0;
          bValue = b.interfaceCount || 0;
          return listConfig.sortOrder === 'ascend' ? aValue - bValue : bValue - aValue;

        case 'active':
          aValue = a.active ? 1 : 0;
          bValue = b.active ? 1 : 0;
          return listConfig.sortOrder === 'ascend' ? aValue - bValue : bValue - aValue;

        default:
          return 0;
      }
    });

    return sorted;
  };

  // 获取分页后的功能列表
  const getPaginatedFeatures = () => {
    const sortedFeatures = getSortedFeatures();
    const startIndex = (listConfig.current - 1) * listConfig.pageSize;
    const endIndex = startIndex + listConfig.pageSize;
    return sortedFeatures.slice(startIndex, endIndex);
  };

  const renderFeatureCard = feature => (
    <Col xs={24} sm={12} xl={8} key={feature.id}>
      <Card className="mm-module-card">
        <div className="mm-module-card-header"><Link className="mm-module-card-link" to={`/interface/${feature.id}`} aria-label={`查看 ${feature.name} 的接口`} title={feature.description || feature.name} onClick={() => localStorage.setItem('selectedFeatureId', feature.id)}>{feature.name}</Link><Switch aria-label={`启用模块 ${feature.name}`} checked={feature.active !== false} onChange={() => handleToggleActive(feature.id, feature.active)} size="small" /></div>
        <Paragraph ellipsis={{rows:2,tooltip:feature.description}} className="mm-module-card-description">{feature.description || '暂无模块说明'}</Paragraph>
        <div className="mm-module-card-footer"><span>{feature.interfaceCount || 0} 个接口 · {feature.active !== false ? '已启用' : '已禁用'}</span><Space className="mm-module-card-actions"><Button type="text" size="small" aria-label={`编辑 ${feature.name}`} icon={<EditOutlined />} onClick={() => openModal(feature)} /><Button type="text" size="small" aria-label={`导出 ${feature.name}`} icon={<ExportOutlined />} onClick={() => exportFeatureConfig(feature)} /><Button type="text" size="small" danger aria-label={`删除 ${feature.name}`} icon={<DeleteOutlined />} onClick={() => deleteFeature(feature.id)} /></Space></div>
      </Card>
    </Col>
  );

  // 渲染列表视图
  const renderListView = () => {
    const columns = [
      {
        title: '状态',
        dataIndex: 'active',
        key: 'active',
        width: 100,
        render: (active, record) => (
          <Switch
            checked={active}
            onChange={(checked, e) => {
              e.stopPropagation();
              handleToggleActive(record.id, active);
            }}
            checkedChildren="启用"
            unCheckedChildren="禁用"
          />
        ),
      },
      {
        title: '功能名称',
        dataIndex: 'name',
        key: 'name',
        ellipsis: { tooltip: true },
        render: (name) => (
          <Text strong style={{ fontSize: '14px' }}>{name}</Text>
        ),
      },
      {
        title: '功能描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: { tooltip: true },
        render: (description) => (
          <Text type="secondary">{description || '无描述'}</Text>
        ),
      },
      {
        title: '接口数量',
        dataIndex: 'interfaceCount',
        key: 'interfaceCount',
        width: 100,
        align: 'center',
        render: (count) => (
          <Badge count={count || 0} showZero style={{ backgroundColor: '#1677ff' }} />
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 120,
        render: (createdAt) => (
          <Text type="secondary">
            {createdAt ? new Date(createdAt).toLocaleDateString() : '未知日期'}
          </Text>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 200,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="管理接口">
              <Button
                type="link"
                size="small"
                icon={<ApiOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  viewInterfaces(record);
                }}
              >
                接口
              </Button>
            </Tooltip>
            <Tooltip title="编辑">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  openModal(record);
                }}
              />
            </Tooltip>
            <Tooltip title="导出">
              <Button
                type="link"
                size="small"
                icon={<ExportOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  exportFeatureConfig(record);
                }}
              />
            </Tooltip>
            <Tooltip title="删除">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFeature(record.id);
                }}
              />
            </Tooltip>
          </Space>
        ),
      },
    ];

    return (
      <Table
        columns={columns}
        dataSource={getPaginatedFeatures()}
        scroll={{ x: 760 }}
        rowKey="id"
        pagination={false}
        onRow={(record) => ({
          onClick: (e) => { if (!e.target.closest('button, a, input')) viewInterfaces(record); },
          style: { cursor: 'pointer' }
        })}
        rowClassName={(record) => !record.active ? 'inactive-row' : ''}
      />
    );
  };

  return (
    <>
      <div className="page-container">
        <PageHeader kicker="MODULES" title="功能模块" description="按业务组织接口，集中管理配置与启用状态。" actions={
          <div className="page-actions">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openModal()}
            >
              新建功能
            </Button>
            <Button
              type="default"
              icon={<ImportOutlined />}
              onClick={importFeatureConfig}

            >
              导入功能
            </Button>
            <Button
              type="default"
              icon={<ExportOutlined />}
              onClick={openExportModal}
              disabled={mockFeatures.length === 0}

            >
              导出功能
            </Button>
            {webDavSyncEnabled && (
              <Button
                type="default"
                icon={<CloudSyncOutlined />}
                onClick={() => setShowWebDavModal(true)}

              >
                WebDAV
              </Button>
            )}
          </div>
        } />
        <div className="mm-module-search"><Input.Search placeholder="搜索模块名称或说明" value={moduleSearch} allowClear onChange={e => { setModuleSearch(e.target.value); saveListConfig({ current: 1 }); }} style={{ maxWidth: 360 }} /></div>
        {loadError && <div role="alert" className="mm-error"><span>{loadError}</span> <Button onClick={fetchFeatures}>重试</Button></div>}

        <div className="mm-module-toolbar"><Space wrap><span>{mockFeatures.length} 个模块</span><span>{mockFeatures.filter(f => f.active !== false).length} 个已启用</span><span>{mockFeatures.reduce((sum, f) => sum + (f.interfaceCount || 0), 0)} 个接口</span></Space><Space wrap><Select aria-label="模块排序" value={listConfig.sortBy} onChange={handleSortChange} style={{width:120}} options={[{value:'name',label:'按名称'},{value:'createdAt',label:'按创建时间'},{value:'interfaceCount',label:'按接口数'},{value:'active',label:'按状态'}]} /><Select aria-label="排序方向" value={listConfig.sortOrder} onChange={handleSortOrderChange} style={{width:85}} options={[{value:'ascend',label:'升序'},{value:'descend',label:'降序'}]} /><Button aria-label="卡片视图" type={listConfig.viewMode === 'card' ? 'primary' : 'default'} icon={<AppstoreOutlined />} onClick={() => handleViewModeChange('card')} /><Button aria-label="列表视图" type={listConfig.viewMode === 'list' ? 'primary' : 'default'} icon={<UnorderedListOutlined />} onClick={() => handleViewModeChange('list')} /></Space></div>

        <Card className="feature-list-card">
          {loading ? (
            <div className="loading-state">
              <Spin size="large" />
              <div className="loading-text">正在加载功能模块...</div>
            </div>
          ) : getSortedFeatures().length > 0 ? (
            <>
              {listConfig.viewMode === 'card' ? (
                <Row gutter={[20, 20]} className="feature-grid">
                  {getPaginatedFeatures().map(feature => renderFeatureCard(feature))}
                </Row>
              ) : (
                renderListView()
              )}

              {/* 分页组件 */}
              {getSortedFeatures().length > 0 && (
                <div className="pagination-wrapper">
                  <Pagination
                    current={listConfig.current}
                    pageSize={listConfig.pageSize}
                    total={getSortedFeatures().length}
                    onChange={handlePageChange}
                    onShowSizeChange={(_, size) => handlePageSizeChange(size)}
                    showSizeChanger={true}
                    pageSizeOptions={['8','12','16','24']}
                    showQuickJumper={true}
                    showTotal={(total, range) =>
                      `第 ${range[0]}-${range[1]} 条，共 ${total} 个功能模块`
                    }
                    size="default"
                    className="custom-pagination"
                  />
                </div>
              )}
            </>
          ) : (
            <Empty
              className="custom-empty"
              image={
                <div className="empty-image">
                  <ApiOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
                </div>
              }
              description={
                <div className="empty-description">
                  <div className="empty-title">暂无功能模块或没有匹配结果</div>
                  <div className="empty-subtitle">创建您的第一个功能模块，开始管理接口</div>
                </div>
              }
            >
              <div className="empty-actions">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                  创建新功能
                </Button>
                <Button icon={<ExportOutlined />} onClick={importFeatureConfig}>
                  导入功能
                </Button>
              </div>
            </Empty>
          )}
        </Card>
      </div>

      <Modal
        title={currentFeature ? '编辑功能' : '新建功能'}
        open={showModal}
        onCancel={closeModal}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            name: '',
            description: '',
            active: true
          }}
        >
          <Form.Item
            name="name"
            label="功能名称"
            rules={[{ required: true, message: '请输入功能名称' }]}
          >
            <Input placeholder="请输入功能名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="功能描述"
          >
            <TextArea
              placeholder="请输入功能描述（可选）"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>
          <div className="form-actions">
            <Button onClick={closeModal}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              确定
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 导出功能弹窗 */}
      <Modal
        title="导出功能"
        open={showExportModal}
        onCancel={() => setShowExportModal(false)}
        footer={null}
        destroyOnClose
        width={520}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12
          }}
        >
          <Checkbox
            indeterminate={selectedExportIds.length > 0 && selectedExportIds.length < mockFeatures.length}
            checked={mockFeatures.length > 0 && selectedExportIds.length === mockFeatures.length}
            onChange={(e) => setSelectedExportIds(e.target.checked ? mockFeatures.map(f => f.id) : [])}
          >
            全选
          </Checkbox>
          <Text type="secondary">
            已选择 {selectedExportIds.length} / {mockFeatures.length}
          </Text>
        </div>

        <div
          style={{
            maxHeight: 360,
            overflowY: 'auto',
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            padding: '4px 12px'
          }}
        >
          <Checkbox.Group
            value={selectedExportIds}
            onChange={(values) => setSelectedExportIds(values)}
            style={{ width: '100%' }}
          >
            {mockFeatures.map(feature => (
              <div
                key={feature.id}
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid #fafafa'
                }}
              >
                <Checkbox value={feature.id} style={{ width: '100%' }}>
                  <span style={{ fontWeight: 500 }}>{feature.name}</span>
                  <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>
                    {feature.interfaceCount || 0} 个接口
                  </span>
                </Checkbox>
              </div>
            ))}
          </Checkbox.Group>
        </div>

        <div className="form-actions" style={{ marginTop: 16 }}>
          <Button onClick={() => setShowExportModal(false)}>
            取消
          </Button>
          <Button
            type="primary"
            loading={exporting}
            disabled={selectedExportIds.length === 0}
            onClick={handleExportSelected}
          >
            导出 ({selectedExportIds.length})
          </Button>
        </div>
      </Modal>

      <WebDavSyncModal
        open={showWebDavModal}
        onClose={() => setShowWebDavModal(false)}
        onPulled={async () => {
          await fetchFeatures();
          await refreshCacheAfterUpdate();
        }}
      />
    </>
  );
};

export default MockData;
