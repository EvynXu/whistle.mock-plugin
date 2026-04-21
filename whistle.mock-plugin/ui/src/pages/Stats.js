import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import {
  Card, Row, Col, Statistic, Table, Tag, Spin, Empty, Badge,
  DatePicker, Input, Space
} from 'antd';
import {
  ApiOutlined, ThunderboltOutlined,
  BarChartOutlined, RiseOutlined, SearchOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const Stats = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({});
  const [topData, setTopData] = useState({ topInterfaces: [], topFeatures: [] });
  const [timeline, setTimeline] = useState({});
  const [recentLogs, setRecentLogs] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [filterDate, setFilterDate] = useState(null);
  const [filterUrl, setFilterUrl] = useState('');

  const fetchOverview = useCallback(async () => {
    const [oRes, tRes, tlRes] = await Promise.all([
      axios.get('/cgi-bin/stats?type=overview'),
      axios.get('/cgi-bin/stats?type=top'),
      axios.get('/cgi-bin/stats?type=timeline'),
    ]);
    setOverview(oRes.data.data || {});
    setTopData(tRes.data.data || { topInterfaces: [], topFeatures: [] });
    setTimeline(tlRes.data.data?.timeline || {});
  }, []);

  const fetchRecent = useCallback(async (date, url) => {
    setRecentLoading(true);
    try {
      const params = new URLSearchParams({ type: 'recent' });
      if (date) params.append('date', date);
      if (url) params.append('url', url);
      const res = await axios.get(`/cgi-bin/stats?${params.toString()}`);
      setRecentLogs(res.data.data?.logs || []);
    } catch (e) {
      console.error('加载最近记录失败:', e);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await fetchOverview();
      const dateStr = filterDate ? dayjs(filterDate).format('YYYY-MM-DD') : '';
      await fetchRecent(dateStr, filterUrl);
    } catch (e) {
      console.error('加载统计数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateChange = (date) => {
    setFilterDate(date);
    const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : '';
    fetchRecent(dateStr, filterUrl);
  };

  const handleUrlChange = (e) => {
    const value = e.target.value;
    setFilterUrl(value);
    const dateStr = filterDate ? dayjs(filterDate).format('YYYY-MM-DD') : '';
    fetchRecent(dateStr, value);
  };

  const hitColumns = [
    { title: '接口名称', dataIndex: 'name', key: 'name' },
    { title: '命中次数', dataIndex: 'count', key: 'count', width: 120 },
    {
      title: '占比',
      key: 'percent',
      width: 120,
      render: (_, record) => {
        const total = overview.totalHits || 1;
        const pct = ((record.count / total) * 100).toFixed(1);
        return <Badge count={`${pct}%`} style={{ backgroundColor: '#52c41a' }} />;
      },
    },
  ];

  const featureColumns = [
    { title: '模块名称', dataIndex: 'name', key: 'name' },
    { title: '命中次数', dataIndex: 'count', key: 'count', width: 120 },
  ];

  const recentColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (t) => new Date(t).toLocaleString(),
    },
    { title: '方法', dataIndex: 'method', key: 'method', width: 80 },
    { title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (s) => <Tag color={s >= 200 && s < 300 ? 'success' : 'default'}>{s}</Tag>,
    },
    { title: '模块', dataIndex: 'featureName', key: 'featureName', width: 140 },
    { title: '接口', dataIndex: 'interfaceName', key: 'interfaceName', width: 160 },
  ];

  const timelineEntries = Object.entries(timeline).sort();
  const maxTimeline = Math.max(...Object.values(timeline), 1);

  return (
    <AppLayout>
      <div className="page-container">
        <div className="page-title-bar">
          <div>
            <h1 className="page-title">📊 请求统计</h1>
            <div className="page-description">
              查看 Mock 接口的命中情况、流量趋势和未覆盖接口
            </div>
          </div>
        </div>

        {loading ? (
          <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
        ) : (
          <>
            {/* 概览卡片 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="今日命中"
                    value={overview.todayHits || 0}
                    prefix={<ThunderboltOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="7日总请求"
                    value={overview.totalRequests || 0}
                    prefix={<BarChartOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="命中率"
                    value={overview.hitRate || 0}
                    suffix="%"
                    prefix={<RiseOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="活跃接口 / 总数"
                    value={`${overview.activeInterfaces || 0} / ${overview.totalInterfaces || 0}`}
                    prefix={<ApiOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            {/* 趋势图（简单柱状图） */}
            <Card title="📈 近7天命中趋势" style={{ marginBottom: 24 }}>
              {timelineEntries.length === 0 ? (
                <Empty description="暂无数据" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', height: 160, gap: 12, padding: '0 8px' }}>
                  {timelineEntries.map(([date, count]) => (
                    <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{count}</div>
                      <div
                        style={{
                          width: '100%',
                          height: `${(count / maxTimeline) * 120}px`,
                          background: '#1890ff',
                          borderRadius: '4px 4px 0 0',
                          minHeight: count > 0 ? 4 : 0,
                          transition: 'height 0.3s',
                        }}
                      />
                      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{date.slice(5)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top 命中接口 & 功能模块 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card title="🏆 Top 10 命中接口">
                  {topData.topInterfaces.length === 0 ? (
                    <Empty description="暂无命中记录" />
                  ) : (
                    <Table
                      dataSource={topData.topInterfaces}
                      columns={hitColumns}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card title="📦 Top 10 功能模块">
                  {topData.topFeatures.length === 0 ? (
                    <Empty description="暂无命中记录" />
                  ) : (
                    <Table
                      dataSource={topData.topFeatures}
                      columns={featureColumns}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />
                  )}
                </Card>
              </Col>
            </Row>

            {/* 最近命中 */}
            <Card
              title="🕐 最近命中记录"
              extra={
                <Space>
                  <DatePicker
                    placeholder="筛选日期"
                    value={filterDate}
                    onChange={handleDateChange}
                    allowClear
                    style={{ width: 140 }}
                  />
                  <Input
                    placeholder="筛选 URL"
                    value={filterUrl}
                    onChange={handleUrlChange}
                    allowClear
                    prefix={<SearchOutlined />}
                    style={{ width: 200 }}
                  />
                </Space>
              }
            >
              {recentLoading ? (
                <Spin size="small" style={{ display: 'block', margin: '40px auto' }} />
              ) : recentLogs.length === 0 ? (
                <Empty description="暂无记录" />
              ) : (
                <Table
                  dataSource={recentLogs}
                  columns={recentColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              )}
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Stats;
