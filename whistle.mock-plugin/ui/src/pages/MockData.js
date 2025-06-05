import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { Card, Row, Col, Button, Modal, Form, Input, message, Switch, Empty, Spin, Typography, Tooltip, Badge, Select, Pagination } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ApiOutlined, ExportOutlined, InfoCircleOutlined, CalendarOutlined, SortAscendingOutlined } from '@ant-design/icons';
import '../styles/mock-data.css';
import axios from 'axios';

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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true
  });
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  // 排序和分页配置（支持缓存）
  const [listConfig, setListConfig] = useState(() => {
    const cached = localStorage.getItem('feature-list-config');
    return cached ? JSON.parse(cached) : {
      sortBy: 'name', // name, createdAt, interfaceCount, active
      sortOrder: 'ascend', // ascend, descend
      pageSize: 12,
      current: 1
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
  }, []);

  // 获取所有功能模块
  const fetchFeatures = async () => {
    try {
      setLoading(true);
      const response = await fetch('/cgi-bin/features');
      const result = await response.json();
      
      if (result.code === 0) {
        setMockFeatures(result.data || []);
      } else {
        console.error('获取功能模块失败:', result.message);
        message.error('获取功能模块失败: ' + result.message);
      }
    } catch (error) {
      console.error('获取功能模块错误:', error);
      message.error('获取功能模块失败, 请检查网络连接');
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
    // 导航到该功能的接口列表页面
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
          const config = JSON.parse(event.target.result);
          
          // 验证导入的配置
          if (!config.name) {
            message.error('无效的配置文件: 缺少功能名称');
            return;
          }
          
          // 创建新功能
          const featureData = {
            name: config.name,
            description: config.description || '',
            active: config.active !== false
          };
          
          // 保存功能
          const featureResponse = await fetch('/cgi-bin/features', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(featureData)
          });
          
          const featureResult = await featureResponse.json();
          
          if (featureResult.code === 0) {
            const newFeature = featureResult.data;
            
            // 导入接口配置
            if (Array.isArray(config.interfaces) && config.interfaces.length > 0) {
              message.loading({ content: '正在导入接口配置...', key: 'importInfo' });
              
              let successCount = 0;
              let errorCount = 0;
              
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
                  
                  successCount++;
                } catch (error) {
                  console.error('导入接口配置失败:', error);
                  errorCount++;
                }
              }
              
              if (errorCount > 0) {
                message.info({ content: `导入完成，成功 ${successCount} 个接口，失败 ${errorCount} 个接口`, key: 'importInfo', duration: 3 });
              } else {
                message.success({ content: `成功导入 ${successCount} 个接口`, key: 'importInfo', duration: 2 });
              }
            } else {
              message.success('功能导入成功（无接口配置）');
            }
            
            // 刷新功能列表
            fetchFeatures();
          } else {
            message.error('导入功能失败: ' + featureResult.message);
          }
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

  // 获取排序后的功能列表
  const getSortedFeatures = () => {
    const sorted = [...mockFeatures].sort((a, b) => {
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

  // 渲染功能模块卡片
  const renderFeatureCard = (feature) => {
    const formattedDate = feature.createdAt 
      ? new Date(feature.createdAt).toLocaleDateString()
      : '未知日期';
    
    return (
      <Col xs={24} sm={12} md={8} lg={6} key={feature.id} style={{ marginBottom: 16 }}>
        <Badge.Ribbon 
          text={feature.active ? '已启用' : '已禁用'} 
          color={feature.active ? '#52c41a' : '#f5222d'}
          style={{ display: 'block' }}
        >
          <Card
            hoverable
            className={`feature-card ${!feature.active ? 'inactive-feature' : ''}`}
            actions={[
              <Tooltip title="管理接口">
                <ApiOutlined key="interfaces" onClick={() => viewInterfaces(feature)} />
              </Tooltip>,
              <Tooltip title="编辑功能">
                <EditOutlined key="edit" onClick={() => openModal(feature)} />
              </Tooltip>,
              <Tooltip title="删除功能">
                <DeleteOutlined key="delete" onClick={() => deleteFeature(feature.id)} />
              </Tooltip>,
              <Tooltip title="导出配置">
                <ExportOutlined key="export" onClick={() => exportFeatureConfig(feature)} />
              </Tooltip>
            ]}
          >
            <div className="feature-card-content">
              <div className="feature-name">
                <Title level={4} ellipsis={{ tooltip: feature.name }}>
                  {feature.name}
                </Title>

                <Switch
                  checked={feature.active}
                  onChange={() => handleToggleActive(feature.id, feature.active)}
                  size="small"
                />
              </div>
              
              <Paragraph className="feature-description" ellipsis={{ rows: 2, expandable: false, tooltip: feature.description }}>
                {feature.description || '无描述'}
              </Paragraph>
              
              <div className="feature-stat">
                <span>
                  <InfoCircleOutlined /> {feature.interfaceCount || 0} 个接口
                </span>
                <span className="feature-date">
                  <CalendarOutlined /> {formattedDate}
                </span>
              </div>
            </div>
          </Card>
        </Badge.Ribbon>
      </Col>
    );
  };

  return (
    <AppLayout>
      <div className="page-container">
        <div className="page-title-bar">
          <div>
            <h1 className="page-title">功能模块管理</h1>
            <div className="page-description">
              创建和管理功能模块，为每个功能配置独立的接口
            </div>
          </div>
          <div className="page-actions">
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => openModal()}
            >
              新建功能
            </Button>
            <Button 
              type="primary" 
              icon={<ExportOutlined />}
              onClick={importFeatureConfig}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              导入功能
            </Button>
          </div>
        </div>

        {/* 排序和分页控制栏 */}
        {mockFeatures.length > 0 && !loading && (
          <div style={{ 
            marginBottom: 16, 
            padding: '12px 16px', 
            background: '#fafafa', 
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>
                <SortAscendingOutlined /> 排序：
              </span>
              <Select
                value={listConfig.sortBy}
                onChange={handleSortChange}
                style={{ width: 120 }}
                size="small"
              >
                <Select.Option value="name">名称</Select.Option>
                <Select.Option value="createdAt">创建时间</Select.Option>
                <Select.Option value="interfaceCount">接口数量</Select.Option>
                <Select.Option value="active">状态</Select.Option>
              </Select>
              <Select
                value={listConfig.sortOrder}
                onChange={handleSortOrderChange}
                style={{ width: 80 }}
                size="small"
              >
                <Select.Option value="ascend">升序</Select.Option>
                <Select.Option value="descend">降序</Select.Option>
              </Select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>每页显示：</span>
              <Select
                value={listConfig.pageSize}
                onChange={handlePageSizeChange}
                style={{ width: 80 }}
                size="small"
              >
                <Select.Option value={8}>8</Select.Option>
                <Select.Option value={12}>12</Select.Option>
                <Select.Option value={16}>16</Select.Option>
                <Select.Option value={24}>24</Select.Option>
              </Select>
              <span style={{ fontSize: '14px', color: '#999' }}>
                共 {mockFeatures.length} 个功能模块
              </span>
            </div>
          </div>
        )}
        
        <div className="feature-list-container">
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <div>正在加载功能模块...</div>
            </div>
          ) : mockFeatures.length > 0 ? (
            <>
              <Row gutter={[16, 16]}>
                {getPaginatedFeatures().map(feature => renderFeatureCard(feature))}
              </Row>
              
              {/* 分页组件 */}
              {mockFeatures.length > listConfig.pageSize && (
                <div style={{ 
                  marginTop: 24, 
                  textAlign: 'center',
                  padding: '16px',
                  borderTop: '1px solid #f0f0f0'
                }}>
                  <Pagination
                    current={listConfig.current}
                    pageSize={listConfig.pageSize}
                    total={mockFeatures.length}
                    onChange={handlePageChange}
                    onShowSizeChange={handlePageChange}
                    showSizeChanger={true}
                    showQuickJumper={true}
                    showTotal={(total, range) => 
                      `第 ${range[0]}-${range[1]} 条，共 ${total} 个功能模块`
                    }
                    pageSizeOptions={['8', '12', '16', '24']}
                    size="default"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="empty-data">
              <div className="empty-icon">📂</div>
              <div className="empty-text">暂无功能，请点击"新建功能"按钮创建</div>
              <div className="empty-actions">
                <button className="create-button" onClick={() => openModal()}>
                  创建新功能
                </button>
                <button className="import-button-large" onClick={importFeatureConfig}>
                  导入已有功能
                </button>
              </div>
            </div>
          )}
        </div>
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
    </AppLayout>
  );
};

export default MockData; 