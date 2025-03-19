import React, { useState } from 'react';
import Layout from '../components/Layout';
import FeatureCard from '../components/FeatureCard';
import '../styles/home.css';

const Home = () => {
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'list'
  const [sortOption, setSortOption] = useState('name'); // 'name', 'status', 'date'
  
  const [features, setFeatures] = useState([
    {
      id: 1,
      name: '用户数据',
      description: '模拟用户信息相关接口',
      active: true,
      interfaceCount: 3,
      createdAt: '2023-09-15'
    },
    {
      id: 2,
      name: '订单信息',
      description: '模拟订单相关接口',
      active: false,
      interfaceCount: 2,
      createdAt: '2023-08-20'
    },
    {
      id: 3,
      name: '商品列表',
      description: '模拟商品数据接口',
      active: true,
      interfaceCount: 5,
      createdAt: '2023-10-01'
    }
  ]);
  
  // 根据排序选项排序功能
  const sortedFeatures = [...features].sort((a, b) => {
    if (sortOption === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortOption === 'status') {
      return (b.active ? 1 : 0) - (a.active ? 1 : 0);
    } else if (sortOption === 'date') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return 0;
  });
  
  return (
    <Layout>
      <div className="content-header">
        <div className="content-title">功能列表</div>
        <div className="view-controls">
          <span>视图:</span>
          <div className="view-toggle">
            <button 
              className={viewMode === 'cards' ? 'active' : ''}
              onClick={() => setViewMode('cards')}
            >
              卡片
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              列表
            </button>
          </div>
          <div className="sort-control">
            <span>排序:</span>
            <select 
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="name">名称</option>
              <option value="status">状态</option>
              <option value="date">创建日期</option>
            </select>
          </div>
        </div>
      </div>
      
      {viewMode === 'cards' ? (
        <div className="feature-cards">
          {sortedFeatures.map(feature => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      ) : (
        <div className="feature-list-view">
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>描述</th>
                <th>状态</th>
                <th>接口数量</th>
                <th>创建日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedFeatures.map(feature => (
                <tr key={feature.id}>
                  <td>{feature.name}</td>
                  <td>{feature.description}</td>
                  <td>
                    <span className={`status-badge ${feature.active ? 'active' : 'inactive'}`}>
                      {feature.active ? '已启用' : '未启用'}
                    </span>
                  </td>
                  <td>{feature.interfaceCount}</td>
                  <td>{feature.createdAt}</td>
                  <td>
                    <button className="action-btn edit">编辑</button>
                    <button className="action-btn">管理接口</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};

export default Home; 