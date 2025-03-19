import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import '../styles/url-redirect.css';

const UrlRedirect = () => {
  const [urlRedirects, setUrlRedirects] = useState([
    {
      id: 1,
      sourceUrl: 'https://api.example.com/users',
      targetUrl: 'http://localhost:3000/mock/users',
      description: '用户API重定向到本地',
      active: true
    },
    {
      id: 2,
      sourceUrl: 'https://api.example.com/products',
      targetUrl: 'http://localhost:3000/mock/products',
      description: '产品API重定向到本地',
      active: false
    }
  ]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRedirect, setCurrentRedirect] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [description, setDescription] = useState('');
  
  const openModal = (redirect = null) => {
    if (redirect) {
      setCurrentRedirect(redirect);
      setSourceUrl(redirect.sourceUrl);
      setTargetUrl(redirect.targetUrl);
      setDescription(redirect.description);
    } else {
      setCurrentRedirect(null);
      setSourceUrl('');
      setTargetUrl('');
      setDescription('');
    }
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!sourceUrl || !targetUrl) {
      alert('请填写源URL和目标URL');
      return;
    }
    
    if (currentRedirect) {
      // 编辑现有配置
      setUrlRedirects(urlRedirects.map(redirect => 
        redirect.id === currentRedirect.id 
          ? { ...redirect, sourceUrl, targetUrl, description }
          : redirect
      ));
    } else {
      // 添加新配置
      const newRedirect = {
        id: urlRedirects.length > 0 ? Math.max(...urlRedirects.map(r => r.id)) + 1 : 1,
        sourceUrl,
        targetUrl,
        description,
        active: true
      };
      setUrlRedirects([...urlRedirects, newRedirect]);
    }
    
    closeModal();
  };
  
  const toggleActive = (id) => {
    setUrlRedirects(urlRedirects.map(redirect => 
      redirect.id === id ? { ...redirect, active: !redirect.active } : redirect
    ));
  };
  
  const deleteRedirect = (id) => {
    if (window.confirm('确定要删除此条重定向配置吗？')) {
      setUrlRedirects(urlRedirects.filter(redirect => redirect.id !== id));
    }
  };
  
  return (
    <AppLayout>
      <div className="url-redirect-container">
        <div className="page-header">
          <h1>URL重定向配置</h1>
          <button className="add-button" onClick={() => openModal()}>
            添加URL重定向
          </button>
        </div>
        
        <div className="redirect-list-container">
          {urlRedirects.length === 0 ? (
            <div className="empty-data">
              <div className="empty-icon">🔄</div>
              <div className="empty-text">暂无URL重定向配置</div>
              <button className="add-button" onClick={() => openModal()}>
                添加URL重定向
              </button>
            </div>
          ) : (
            <table className="redirect-table">
              <thead>
                <tr>
                  <th>状态</th>
                  <th>源URL</th>
                  <th>目标URL</th>
                  <th>描述</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {urlRedirects.map(redirect => (
                  <tr key={redirect.id} className={redirect.active ? '' : 'inactive'}>
                    <td>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={redirect.active} 
                          onChange={() => toggleActive(redirect.id)} 
                        />
                        <span className="slider"></span>
                      </label>
                    </td>
                    <td className="url-text">{redirect.sourceUrl}</td>
                    <td className="url-text">{redirect.targetUrl}</td>
                    <td>{redirect.description || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="edit-button" 
                          onClick={() => openModal(redirect)}
                        >
                          编辑
                        </button>
                        <button 
                          className="delete-button" 
                          onClick={() => deleteRedirect(redirect.id)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>{currentRedirect ? '编辑URL重定向' : '添加URL重定向'}</h2>
                <button className="close-button" onClick={closeModal}>×</button>
              </div>
              <form className="redirect-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>源URL</label>
                  <input 
                    type="text" 
                    value={sourceUrl} 
                    onChange={(e) => setSourceUrl(e.target.value)} 
                    placeholder="https://api.example.com/endpoint"
                    required
                  />
                  <div className="help-text">需要重定向的原始URL</div>
                </div>
                
                <div className="form-group">
                  <label>目标URL</label>
                  <input 
                    type="text" 
                    value={targetUrl} 
                    onChange={(e) => setTargetUrl(e.target.value)} 
                    placeholder="http://localhost:3000/mock/endpoint"
                    required
                  />
                  <div className="help-text">重定向的目标地址</div>
                </div>
                
                <div className="form-group">
                  <label>描述（可选）</label>
                  <input 
                    type="text" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="重定向描述"
                  />
                </div>
                
                <div className="form-actions">
                  <button type="button" className="cancel-button" onClick={closeModal}>
                    取消
                  </button>
                  <button type="submit" className="submit-button">
                    {currentRedirect ? '保存修改' : '添加重定向'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default UrlRedirect; 