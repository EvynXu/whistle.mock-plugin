import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import '../styles/mock-data.css';

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
      }
    } catch (error) {
      console.error('获取功能模块错误:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (feature = null) => {
    if (feature) {
      setCurrentFeature(feature);
      setFormData({
        name: feature.name,
        description: feature.description,
        active: feature.active
      });
    } else {
      setCurrentFeature(null);
      setFormData({
        name: '',
        description: '',
        active: true
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('请输入功能名称');
      return;
    }
    
    try {
      const featureData = {
        ...formData
      };
      
      // 如果是编辑已有功能，添加ID
      if (currentFeature) {
        featureData.id = currentFeature.id;
      }
      
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
        fetchFeatures();
        closeModal();
      } else {
        alert('操作失败: ' + result.message);
      }
    } catch (error) {
      console.error('保存功能模块错误:', error);
      alert('保存失败: ' + error.message);
    }
  };

  const toggleFeatureStatus = async (id) => {
    try {
      // 找到当前功能
      const feature = mockFeatures.find(f => f.id === id);
      if (!feature) return;
      
      // 创建更新请求
      const updateData = {
        id: feature.id,
        name: feature.name,
        description: feature.description,
        active: !feature.active
      };
      
      const response = await fetch('/cgi-bin/features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      const result = await response.json();
      
      if (result.code === 0) {
        // 更新本地状态
        setMockFeatures(mockFeatures.map(f => 
          f.id === id ? { ...f, active: !f.active } : f
        ));
      } else {
        alert('更新状态失败: ' + result.message);
      }
    } catch (error) {
      console.error('更新功能状态错误:', error);
      alert('操作失败: ' + error.message);
    }
  };

  const deleteFeature = async (id) => {
    if (window.confirm('确定要删除此功能吗？这将删除所有相关的接口和模拟数据。')) {
      try {
        const response = await fetch(`/cgi-bin/features?id=${id}`, {
          method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.code === 0) {
          // 更新本地状态
          setMockFeatures(mockFeatures.filter(f => f.id !== id));
        } else {
          alert('删除失败: ' + result.message);
        }
      } catch (error) {
        console.error('删除功能错误:', error);
        alert('操作失败: ' + error.message);
      }
    }
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
    } catch (error) {
      console.error('导出配置错误:', error);
      alert('导出失败: ' + error.message);
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
            alert('无效的配置文件: 缺少功能名称');
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
              for (const interfaceItem of config.interfaces) {
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
              }
            }
            
            // 刷新功能列表
            fetchFeatures();
            alert(`功能"${newFeature.name}"已成功导入`);
          } else {
            alert('导入功能失败: ' + featureResult.message);
          }
        } catch (error) {
          console.error('导入配置错误:', error);
          alert('导入失败: ' + error.message);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  return (
    <AppLayout>
      <div className="mock-data-container">
        <div className="page-header">
          <h1>功能管理</h1>
          <div className="header-actions">
            <button className="import-button" onClick={importFeatureConfig}>
              导入功能
            </button>
            <button className="add-button" onClick={() => openModal()}>
              新建功能
            </button>
          </div>
        </div>
        
        <div className="feature-list-container">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : mockFeatures.length > 0 ? (
            <table className="feature-table">
              <thead>
                <tr>
                  <th width="80">状态</th>
                  <th width="200">功能名称</th>
                  <th>功能描述</th>
                  <th width="100">接口数量</th>
                  <th width="120">创建日期</th>
                  <th width="240">操作</th>
                </tr>
              </thead>
              <tbody>
                {mockFeatures.map(feature => (
                  <tr key={feature.id} className={feature.active ? '' : 'inactive'}>
                    <td>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={feature.active} 
                          onChange={() => toggleFeatureStatus(feature.id)}
                        />
                        <span className="slider"></span>
                      </label>
                    </td>
                    <td>{feature.name}</td>
                    <td>{feature.description || '无描述'}</td>
                    <td>{feature.interfaceCount || 0}</td>
                    <td>{feature.createdAt}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="interface-button"
                          onClick={() => viewInterfaces(feature)}
                        >
                          接口管理
                        </button>
                        <button
                          className="export-button"
                          onClick={() => exportFeatureConfig(feature)}
                        >
                          导出
                        </button>
                        <button 
                          className="edit-button"
                          onClick={() => openModal(feature)}
                        >
                          编辑
                        </button>
                        <button 
                          className="delete-button"
                          onClick={() => deleteFeature(feature.id)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{currentFeature ? '编辑功能' : '新建功能'}</h2>
              <button className="close-button" onClick={closeModal}>&times;</button>
            </div>
            <form className="feature-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">功能名称</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="请输入功能名称"
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">功能描述</label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="请输入功能描述"
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                  />
                  启用此功能
                </label>
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={closeModal}>
                  取消
                </button>
                <button type="submit" className="submit-button">
                  确定
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default MockData; 