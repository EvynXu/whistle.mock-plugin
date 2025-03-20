import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Input, DatePicker, Select, Card, Typography, Empty, Spin, Tooltip, Badge, Modal, Tabs, Descriptions, Divider, message } from 'antd';
import { SyncOutlined, DeleteOutlined, SearchOutlined, ExportOutlined, ClockCircleOutlined, FilterOutlined, EyeOutlined, InfoCircleOutlined, CloseCircleOutlined, SettingOutlined, CheckCircleOutlined, CodeOutlined, ApiOutlined, QuestionCircleOutlined, CloseOutlined, CopyOutlined } from '@ant-design/icons';
import AppLayout from '../components/AppLayout';
import '../styles/logs-page.css';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text, Paragraph } = Typography;

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ['15', '30', '50', '100'],
    showTotal: (total) => `共 ${total} 条日志`
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentLog, setCurrentLog] = useState(null);
  const [activeTab, setActiveTab] = useState('request');

  // 获取日志数据
  const fetchLogs = async (paginationParams = {}) => {
    try {
      setLoading(true);
      
      // 构建查询参数
      const params = new URLSearchParams({
        page: paginationParams.current || pagination.current || 1,
        pageSize: paginationParams.pageSize || pagination.pageSize || 15,
        type: filterType !== 'all' ? filterType : '',
        keyword: searchText || ''
      });
      
      // 如果有日期范围，添加到查询参数
      if (dateRange && dateRange.length === 2) {
        params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }
      
      const response = await fetch(`/cgi-bin/logs?${params.toString()}`);
      const result = await response.json();
      
      if (result.code === 0) {
        // 检查返回的数据结构，正确处理后端返回的数据
        if (result.data && Array.isArray(result.data.logs)) {
          // 后端返回的是 { logs: [...], total: ..., page: ..., pageSize: ..., totalPages: ... }
          setLogs(result.data.logs);
          // 更新分页信息
          setPagination(prev => ({
            ...prev,
            current: result.data.page || 1,
            pageSize: result.data.pageSize || 15,
            total: result.data.total || 0
          }));
        } else if (Array.isArray(result.data)) {
          // 后端直接返回数组的情况
          setLogs(result.data);
          setPagination(prev => ({
            ...prev,
            total: result.data.length
          }));
        } else {
          // 没有有效数据时设为空数组
          setLogs([]);
          setPagination(prev => ({
            ...prev,
            total: 0
          }));
        }
      } else {
        console.error('获取日志失败:', result.message);
        setLogs([]);
        setPagination(prev => ({
          ...prev,
          total: 0
        }));
      }
    } catch (error) {
      console.error('获取日志错误:', error);
      setLogs([]);
      setPagination(prev => ({
        ...prev,
        total: 0
      }));
    } finally {
      setLoading(false);
    }
  };

  // 首次加载和自动刷新设置
  useEffect(() => {
    fetchLogs();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  // 处理自动刷新
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLogs({
          current: pagination.current,
          pageSize: pagination.pageSize
        });
      }, 5000); // 每5秒刷新一次
      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, pagination.current, pagination.pageSize, filterType, searchText, dateRange]);

  // 清空日志
  const clearLogs = async () => {
    if (window.confirm('确定要清空所有日志吗？此操作无法撤销。')) {
      try {
        const response = await fetch('/cgi-bin/logs', {
          method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.code === 0) {
          setLogs([]);
          // 重置分页
          setPagination(prev => ({
            ...prev,
            current: 1,
            total: 0
          }));
        } else {
          console.error('清空日志失败:', result.message);
        }
      } catch (error) {
        console.error('清空日志错误:', error);
      }
    }
  };

  // 导出日志
  const exportLogs = () => {
    const filteredLogs = getFilteredLogs();
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileName = `whistle-mock-logs-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  };

  // 根据筛选条件过滤日志
  const getFilteredLogs = () => {
    // 如果使用后端分页，则不需要在前端进行筛选
    return logs;
    
    /* 注释掉旧的本地筛选逻辑，现在使用后端筛选和分页
    return logs.filter(log => {
      // 根据日志类型筛选
      if (filterType !== 'all' && log.eventType !== filterType) {
        return false;
      }
      
      // 根据搜索文本筛选
      if (searchText && !(
        log.url?.toLowerCase().includes(searchText.toLowerCase()) ||
        log.pattern?.toLowerCase().includes(searchText.toLowerCase()) ||
        log.message?.toLowerCase().includes(searchText.toLowerCase())
      )) {
        return false;
      }
      
      // 根据日期范围筛选
      if (dateRange && dateRange.length === 2) {
        const logDate = new Date(log.timestamp);
        const startDate = dateRange[0].startOf('day').toDate();
        const endDate = dateRange[1].endOf('day').toDate();
        
        if (logDate < startDate || logDate > endDate) {
          return false;
        }
      }
      
      return true;
    });
    */
  };

  // 获取状态标签样式
  const getStatusTag = (status) => {
    switch(status) {
      case 'matched':
        return <Tag className="status-tag status-tag-success">已匹配</Tag>;
      case 'unmatched':
        return <Tag className="status-tag status-tag-warning">未匹配</Tag>;
      case 'disabled':
        return <Tag className="status-tag status-tag-warning">已禁用</Tag>;
      case 'error':
        return <Tag className="status-tag status-tag-error">错误</Tag>;
      default:
        return <Tag className="status-tag">{status}</Tag>;
    }
  };

  // 获取事件类型标签样式
  const getEventTypeTag = (type) => {
    switch(type) {
      case 'request':
        return <Badge color="#1890ff" text="请求" />;
      case 'response':
        return <Badge color="#52c41a" text="响应" />;
      case 'match':
        return <Badge color="#13c2c2" text="匹配" />;
      case 'error':
        return <Badge color="#f5222d" text="错误" />;
      default:
        return <Badge color="#d9d9d9" text={type} />;
    }
  };

  const filteredLogs = getFilteredLogs();

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (text) => {
        const date = new Date(text);
        return (
          <div className="time-column">
            <div className="time-value">{date.toLocaleTimeString()}</div>
            <div className="date-small">{date.toLocaleDateString()}</div>
          </div>
        );
      },
      width: 110,
    },
    {
      title: '类型',
      dataIndex: 'eventType',
      key: 'eventType',
      render: (text) => getEventTypeTag(text),
      width: 90,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (text) => getStatusTag(text),
      width: 90,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (text) => (
        <div className="url-column">
          {text ? (
            <Tooltip title={text}>
              <Text copyable={{ text, tooltips: ['复制', '已复制!'] }} ellipsis>
                {text}
              </Text>
            </Tooltip>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </div>
      ),
    },
    {
      title: '匹配规则',
      dataIndex: 'pattern',
      key: 'pattern',
      ellipsis: true,
      render: (text) => text ? (
        <Tooltip title={text}>
          <Text code ellipsis style={{ maxWidth: 150 }}>{text}</Text>
        </Tooltip>
      ) : (
        <Text type="secondary">-</Text>
      ),
      width: 150,
    },
    {
      title: '状态码',
      dataIndex: 'statusCode',
      key: 'statusCode',
      width: 80,
      render: (text) => text ? (
        <Tag color={text >= 200 && text < 300 ? 'success' : text >= 400 ? 'error' : 'warning'}>
          {text}
        </Tag>
      ) : (
        <Text type="secondary">-</Text>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: (text) => text ? (
        <Tooltip title={`${text}ms`}>
          <Tag color={text < 100 ? 'success' : text < 500 ? 'warning' : 'error'}>
            {text}ms
          </Tag>
        </Tooltip>
      ) : (
        <Text type="secondary">-</Text>
      ),
    },
    {
      title: '详情',
      key: 'action',
      width: 60,
      render: (_, record) => (
        <Button 
          type="link" 
          size="small" 
          icon={<EyeOutlined />}
          onClick={() => showLogDetail(record)}
        />
      ),
    },
  ];

  // 修改日志详情查看功能
  const showLogDetail = (log) => {
    setCurrentLog(log);
    setDetailVisible(true);
    setActiveTab(log.eventType === 'response' ? 'response' : 'request');
  };

  // 关闭日志详情模态框
  const handleDetailClose = () => {
    setDetailVisible(false);
    setCurrentLog(null);
  };

  // 格式化 JSON 数据
  const formatJSON = (jsonStr) => {
    try {
      if (!jsonStr) return '-';
      return JSON.stringify(JSON.parse(jsonStr), null, 2);
    } catch (error) {
      return jsonStr || '-';
    }
  };

  // 渲染请求或响应头信息
  const renderHeaders = (headers) => {
    if (!headers) return <Typography.Text type="secondary">无头信息</Typography.Text>;
    
    try {
      const headerObj = typeof headers === 'string' ? JSON.parse(headers) : headers;
      return (
        <Descriptions bordered size="small" column={1} className="log-detail-descriptions">
          {Object.entries(headerObj).map(([key, value]) => (
            <Descriptions.Item 
              key={key} 
              label={<Typography.Text code>{key}</Typography.Text>}
              className="header-item"
            >
              <Typography.Text copyable>{value}</Typography.Text>
            </Descriptions.Item>
          ))}
        </Descriptions>
      );
    } catch (e) {
      return <Typography.Text type="secondary">{headers || '无头信息'}</Typography.Text>;
    }
  };

  // 获取状态描述
  const getStatusDescription = (status) => {
    switch (status) {
      case 'matched':
        return <span className="status-description success"><CheckCircleOutlined /> 已成功匹配规则</span>;
      case 'unmatched':
        return <span className="status-description warning"><QuestionCircleOutlined /> 未匹配任何规则</span>;
      case 'disabled':
        return <span className="status-description warning"><CloseCircleOutlined /> 匹配的规则已被禁用</span>;
      case 'error':
        return <span className="status-description error"><CloseCircleOutlined /> 处理请求时发生错误</span>;
      default:
        return <span className="status-description">{status}</span>;
    }
  };

  // 处理表格分页、排序、筛选变化
  const handleTableChange = (newPagination, filters, sorter) => {
    setPagination(newPagination);
    fetchLogs(newPagination);
  };

  // 处理筛选条件变更
  const handleFilterChange = (newFilterType = null, newSearchText = null, newDateRange = null) => {
    const updatedFilterType = newFilterType !== null ? newFilterType : filterType;
    const updatedSearchText = newSearchText !== null ? newSearchText : searchText;
    const updatedDateRange = newDateRange !== null ? newDateRange : dateRange;
    
    // 更新筛选条件状态
    if (newFilterType !== null) setFilterType(newFilterType);
    if (newSearchText !== null) setSearchText(newSearchText);
    if (newDateRange !== null) setDateRange(newDateRange);
    
    // 重置分页到第一页
    const resetPagination = {
      ...pagination,
      current: 1
    };
    setPagination(resetPagination);
    
    // 使用新的筛选条件获取数据
    fetchLogs({
      ...resetPagination,
      filterType: updatedFilterType,
      searchText: updatedSearchText,
      dateRange: updatedDateRange
    });
  };

  return (
    <AppLayout>
      <div className="page-container logs-page-container">
        <div className="page-title-bar">
          <div>
            <h1 className="page-title">
              运行日志
              {autoRefresh && (
                <SyncOutlined spin className="refresh-icon" />
              )}
            </h1>
            <div className="page-description">
              <InfoCircleOutlined className="mr-1" /> 
              记录系统运行事件，包括请求匹配、响应处理和错误信息
            </div>
          </div>
          <div className="page-actions">
            <Tooltip title={autoRefresh ? "停止自动刷新" : "启用自动刷新 (5秒)"}>
              <Button 
                type={autoRefresh ? "primary" : "default"}
                icon={<SyncOutlined spin={autoRefresh} />}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                自动刷新
              </Button>
            </Tooltip>
            <Button 
              icon={<SyncOutlined />}
              onClick={() => fetchLogs()}
            >
              刷新
            </Button>
            <Button 
              icon={<ExportOutlined />}
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
            >
              导出
            </Button>
            <Button 
              icon={<DeleteOutlined />}
              onClick={clearLogs}
              danger
              disabled={logs.length === 0}
            >
              清空
            </Button>
          </div>
        </div>

        <Card className="filter-card mb-3">
          <div className="filter-container">
            <Space wrap>
              <Input 
                placeholder="搜索URL或规则" 
                allowClear
                value={searchText}
                onChange={(e) => handleFilterChange(null, e.target.value, null)}
                prefix={<SearchOutlined />}
                style={{ width: 200 }}
                className="filter-item"
              />
              <Select 
                defaultValue="all" 
                style={{ width: 120 }}
                onChange={(value) => handleFilterChange(value, null, null)}
                placeholder="事件类型"
                className="filter-item"
              >
                <Option value="all">全部类型</Option>
                <Option value="request">请求</Option>
                <Option value="response">响应</Option>
                <Option value="match">匹配</Option>
                <Option value="error">错误</Option>
              </Select>
              <RangePicker 
                allowClear
                onChange={(dates) => handleFilterChange(null, null, dates)}
                className="filter-item"
              />
              <Badge 
                count={
                  (searchText ? 1 : 0) + 
                  (filterType !== 'all' ? 1 : 0) + 
                  (dateRange ? 1 : 0)
                } 
                showZero 
                size="small"
                className="filter-count"
              >
                <Button icon={<FilterOutlined />}>筛选条件</Button>
              </Badge>
            </Space>
            <div className="logs-summary">
              {loading ? (
                <Spin size="small" />
              ) : (
                <Text type="secondary" className="d-flex align-center">
                  <ClockCircleOutlined className="mr-1" /> 
                  <span>显示 {logs.length} 条日志记录</span>
                  {pagination.total > 0 && logs.length < pagination.total && (
                    <span className="ml-1">(第 {pagination.current} 页，共 {pagination.total} 条)</span>
                  )}
                </Text>
              )}
            </div>
          </div>
        </Card>

        <div className="table-container custom-table">
          <Table 
            columns={columns} 
            dataSource={filteredLogs}
            rowKey={(record) => record.id || record.timestamp}
            pagination={pagination}
            loading={loading}
            size="middle"
            onChange={handleTableChange}
            locale={{ 
              emptyText: logs.length === 0 ? (
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  description="暂无日志记录" 
                />
              ) : (
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  description="没有匹配的日志记录" 
                />
              )
            }}
            onRow={(record) => ({
              onClick: () => showLogDetail(record),
              className: 'log-table-row'
            })}
          />
        </div>

        {/* 日志详情模态框 */}
        <Modal
          visible={detailVisible}
          title={
            <div className="log-detail-header">
              <div className="log-detail-title">
                <span>日志详情</span>
                {currentLog && (
                  <span className="log-timestamp">
                    {new Date(currentLog.timestamp).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="log-detail-status">
                {currentLog && getStatusDescription(currentLog.status)}
              </div>
            </div>
          }
          onCancel={handleDetailClose}
          footer={null}
          width={800}
          className="log-detail-modal"
          closeIcon={<CloseOutlined />}
          destroyOnClose={true}
        >
          {currentLog && (
            <div className="log-detail-content">
              <div className="log-overview">
                <Descriptions bordered size="small" column={2} className="log-detail-descriptions">
                  <Descriptions.Item label="请求URL" span={2}>
                    <Typography.Text copyable ellipsis style={{ maxWidth: 600 }}>
                      {currentLog.url || '-'}
                    </Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="事件类型">
                    {getEventTypeTag(currentLog.eventType)}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    {getStatusTag(currentLog.status)}
                  </Descriptions.Item>
                  <Descriptions.Item label="匹配规则">
                    {currentLog.pattern ? (
                      <Typography.Text code copyable>
                        {currentLog.pattern}
                      </Typography.Text>
                    ) : '无匹配规则'}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态码">
                    {currentLog.statusCode ? (
                      <Tag color={currentLog.statusCode >= 200 && currentLog.statusCode < 300 ? 'success' : currentLog.statusCode >= 400 ? 'error' : 'warning'}>
                        {currentLog.statusCode}
                      </Tag>
                    ) : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="请求方法">
                    <Tag color="processing">{currentLog.method || '-'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="耗时">
                    {currentLog.duration ? (
                      <Tag color={currentLog.duration < 100 ? 'success' : currentLog.duration < 500 ? 'warning' : 'error'}>
                        {currentLog.duration}ms
                      </Tag>
                    ) : '-'}
                  </Descriptions.Item>
                </Descriptions>
              </div>

              <Divider style={{ margin: '16px 0' }} />

              <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                className="log-detail-tabs"
              >
                <Tabs.TabPane 
                  tab={<span><ApiOutlined /> 请求信息</span>} 
                  key="request"
                >
                  <div className="tab-content">
                    <Descriptions bordered size="small" column={1} className="log-detail-descriptions">
                      <Descriptions.Item label="请求头" className="header-section">
                        {renderHeaders(currentLog.requestHeaders)}
                      </Descriptions.Item>
                      <Descriptions.Item label="请求体" className="body-section">
                        {currentLog.requestBody ? (
                          <div className="code-block-wrapper">
                            <pre className="code-block">
                              {formatJSON(currentLog.requestBody)}
                            </pre>
                            <Button 
                              type="text" 
                              icon={<CopyOutlined />}
                              className="copy-btn"
                              onClick={() => {
                                navigator.clipboard.writeText(currentLog.requestBody);
                                message.success('已复制到剪贴板');
                              }}
                            />
                          </div>
                        ) : (
                          <Typography.Text type="secondary">无请求体</Typography.Text>
                        )}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                </Tabs.TabPane>
                <Tabs.TabPane 
                  tab={<span><CodeOutlined /> 响应信息</span>} 
                  key="response"
                  disabled={!currentLog.responseHeaders && !currentLog.responseBody}
                >
                  <div className="tab-content">
                    <Descriptions bordered size="small" column={1} className="log-detail-descriptions">
                      <Descriptions.Item label="响应头" className="header-section">
                        {renderHeaders(currentLog.responseHeaders)}
                      </Descriptions.Item>
                      <Descriptions.Item label="响应体" className="body-section">
                        {currentLog.responseBody ? (
                          <div className="code-block-wrapper">
                            <pre className="code-block">
                              {formatJSON(currentLog.responseBody)}
                            </pre>
                            <Button 
                              type="text" 
                              icon={<CopyOutlined />}
                              className="copy-btn"
                              onClick={() => {
                                navigator.clipboard.writeText(currentLog.responseBody);
                                message.success('已复制到剪贴板');
                              }}
                            />
                          </div>
                        ) : (
                          <Typography.Text type="secondary">无响应体</Typography.Text>
                        )}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                </Tabs.TabPane>
              </Tabs>
            </div>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
};

export default LogsPage; 