import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Input, DatePicker, Select, Card, Typography, Empty, Spin, Tooltip, Badge } from 'antd';
import { SyncOutlined, DeleteOutlined, SearchOutlined, ExportOutlined, ClockCircleOutlined, FilterOutlined, EyeOutlined, InfoCircleOutlined } from '@ant-design/icons';
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

  // 获取日志数据
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/cgi-bin/logs');
      const result = await response.json();
      
      if (result.code === 0) {
        setLogs(result.data || []);
      } else {
        console.error('获取日志失败:', result.message);
      }
    } catch (error) {
      console.error('获取日志错误:', error);
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
        fetchLogs();
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
  }, [autoRefresh]);

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

  // 显示日志详情
  const showLogDetail = (log) => {
    // TODO: 实现日志详情查看功能
    console.log('查看日志详情:', log);
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
              onClick={fetchLogs}
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
                onChange={(e) => setSearchText(e.target.value)}
                prefix={<SearchOutlined />}
                style={{ width: 200 }}
                className="filter-item"
              />
              <Select 
                defaultValue="all" 
                style={{ width: 120 }}
                onChange={(value) => setFilterType(value)}
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
                onChange={(dates) => setDateRange(dates)}
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
                  <span>显示 {filteredLogs.length} 条日志记录</span>
                  {logs.length > filteredLogs.length && (
                    <span className="ml-1">(已筛选，共 {logs.length} 条)</span>
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
            pagination={{ 
              pageSize: 15,
              showSizeChanger: true,
              pageSizeOptions: ['15', '30', '50', '100'],
              showTotal: (total) => `共 ${total} 条日志`
            }}
            loading={loading}
            size="middle"
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
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default LogsPage; 