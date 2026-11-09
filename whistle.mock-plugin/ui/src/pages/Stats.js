import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Alert, Button, Card, DatePicker, Empty, Input, Progress, Space, Spin, Statistic, Table, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import PageHeader from '../components/PageHeader';
export default function Stats() {
  const history = useHistory(),
    version = useRef(0);
  const [range, setRange] = useState(null),
    [url, setUrl] = useState(''),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const load = async () => {
    const current = ++version.current;
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (range) {
        params.startDate = range[0].format('YYYY-MM-DD');
        params.endDate = range[1].format('YYYY-MM-DD');
      }
      if (url) params.url = url;
      const results = await Promise.all(['overview', 'top', 'timeline', 'recent'].map(type => axios.get('/cgi-bin/stats', {
        params: {
          ...params,
          type
        }
      }).then(({
        data
      }) => {
        if (data.code !== 0) throw new Error(data.message);
        return data.data;
      })));
      if (current === version.current) setData({
        overview: results[0],
        top: results[1],
        timeline: results[2].timeline || {},
        logs: results[3].logs || []
      });
    } catch (e) {
      if (current === version.current) setError(e.message);
    } finally {
      if (current === version.current) setLoading(false);
    }
  };
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => {
      clearTimeout(timer);
      version.current++;
    };
  }, [range, url]);
  const o = data?.overview || {},
    tops = data?.top || {},
    days = Object.entries(data?.timeline || {}),
    max = Math.max(1, ...days.map(([, count]) => count));
  const go = i => history.push(`/interface/${i.featureId || ''}${i.id ? `?interfaceId=${encodeURIComponent(i.id)}` : ''}`);
  return <div className="page-container"><PageHeader kicker="OBSERVABILITY" title="请求统计" description="查看已记录请求的命中情况。默认最近 7 天；过滤条件同时作用于全部统计。" actions={<Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>} />
    <div className="mm-stats-filters"><DatePicker.RangePicker value={range} onChange={setRange} allowClear /><Input.Search allowClear placeholder="筛选请求 URL" value={url} onChange={e => setUrl(e.target.value)} style={{
        maxWidth: 320
      }} /></div>
    {error && <Alert type="error" showIcon message="统计加载失败" description={error} action={<Button onClick={load}>重试</Button>} />}
    <Spin spinning={loading}><div className="mm-metrics"><Card><Statistic title="已记录请求" value={o.totalRequests || 0} /></Card><Card><Statistic title="Mock 命中" value={o.totalHits || 0} /></Card><Card><Statistic title="透传 / 未命中" value={o.totalMisses || 0} /></Card><Card><Statistic title="命中率" value={o.hitRate || 0} suffix="%" /></Card></div>
    <Card title="命中趋势" className="mm-stats-section">{days.length ? <div className="mm-timeline" role="img" aria-label={days.map(([date, count]) => `${date}: ${count} 次`).join('；')}>{days.map(([date, count]) => <div key={date} className="mm-timeline-day"><span>{count}</span><div className="mm-timeline-track"><div style={{
                height: `${count / max * 100}%`
              }} /></div><small>{date.slice(5)}</small></div>)}</div> : <Empty description="此时间范围暂无记录" />}</Card>
    <div className="mm-stats-columns"><Card title="热点接口"><Table size="small" pagination={false} rowKey="id" dataSource={tops.topInterfaces || []} columns={[{
            title: '接口',
            dataIndex: 'name',
            render: (name, item) => <Button type="link" onClick={() => go(item)}>{name}</Button>
          }, {
            title: '命中',
            dataIndex: 'count'
          }, {
            title: '占比',
            render: (_, item) => <Progress size="small" percent={Number((item.count / Math.max(1, o.totalHits) * 100).toFixed(1))} />
          }]} /></Card><Card title="热点模块"><Table size="small" pagination={false} rowKey="id" dataSource={tops.topFeatures || []} columns={[{
            title: '模块',
            dataIndex: 'name',
            render: (name, item) => <Button type="link" onClick={() => go({
              featureId: item.id
            })}>{name}</Button>
          }, {
            title: '命中',
            dataIndex: 'count'
          }]} /></Card></div>
    <Card title="最近命中记录 · 最多 20 条" className="mm-stats-section"><Table size="small" rowKey="id" pagination={false} scroll={{
          x: 760
        }} dataSource={data?.logs || []} columns={[{
          title: '时间',
          dataIndex: 'timestamp',
          render: t => new Date(t).toLocaleString()
        }, {
          title: '方法',
          dataIndex: 'method'
        }, {
          title: 'URL',
          dataIndex: 'url',
          ellipsis: true
        }, {
          title: '状态',
          dataIndex: 'status',
          render: s => <Tag color={s >= 400 ? 'error' : 'success'}>{s}</Tag>
        }, {
          title: '接口',
          dataIndex: 'interfaceName',
          render: (name, item) => <Button type="link" onClick={() => go({
            featureId: item.featureId,
            id: item.interfaceId
          })}>{name || '未分类'}</Button>
        }]} /></Card></Spin>
  </div>;
}
