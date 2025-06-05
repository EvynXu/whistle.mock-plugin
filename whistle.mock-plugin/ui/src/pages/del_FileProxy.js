import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import '../styles/file-proxy.css';

const FileProxy = () => {
  const [fileProxies, setFileProxies] = useState([
    {
      id: 1,
      localPath: '/path/to/local/file.json',
      remotePath: '/api/data',
      description: '用户数据接口',
      active: true
    },
    {
      id: 2,
      localPath: '/path/to/local/orders.json',
      remotePath: '/api/orders',
      description: '订单数据接口',
      active: false
    },
    {
      id: 3,
      localPath: '/path/to/local/products.json',
      remotePath: '/api/products',
      description: '商品数据接口',
      active: true
    }
  ]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProxy, setCurrentProxy] = useState(null);
  const [localPath, setLocalPath] = useState('');
  const [remotePath, setRemotePath] = useState('');
  const [description, setDescription] = useState('');
  
  const openModal = (proxy = null) => {
    if (proxy) {
      setCurrentProxy(proxy);
      setLocalPath(proxy.localPath);
      setRemotePath(proxy.remotePath);
      setDescription(proxy.description);
    } else {
      setCurrentProxy(null);
      setLocalPath('');
      setRemotePath('');
      setDescription('');
    }
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!localPath || !remotePath) {
      alert('请填写本地文件路径和远程路径');
      return;
    }
    
    if (currentProxy) {
      // 编辑现有配置
      setFileProxies(fileProxies.map(proxy => 
        proxy.id === currentProxy.id 
          ? { ...proxy, localPath, remotePath, description }
          : proxy
      ));
    } else {
      // 添加新配置
      const newProxy = {
        id: fileProxies.length > 0 ? Math.max(...fileProxies.map(p => p.id)) + 1 : 1,
        localPath,
        remotePath,
        description,
        active: true
      };
      setFileProxies([...fileProxies, newProxy]);
    }
    
    closeModal();
  };
  
  const toggleActive = (id) => {
    setFileProxies(fileProxies.map(proxy => 
      proxy.id === id ? { ...proxy, active: !proxy.active } : proxy
    ));
  };
  
  const deleteProxy = (id) => {
    if (window.confirm('确定要删除此条配置吗？')) {
      setFileProxies(fileProxies.filter(proxy => proxy.id !== id));
    }
  };
  
  return (
    <AppLayout>
      <div className="file-proxy-container">
        <div className="page-title-bar">
          <div>
            <h1 className="page-title">文件代理配置</h1>
            <div className="page-description">
              配置文件代理规则，支持本地文件和远程文件
            </div>
          </div>
          <div className="page-actions">
            <button className="add-button" onClick={() => openModal()}>
              添加文件代理
            </button>
          </div>
        </div>
        
        <div className="proxy-list-container">
          {fileProxies.length === 0 ? (
            <div className="empty-data">
              <div className="empty-icon">📁</div>
              <div className="empty-text">暂无文件代理配置</div>
              <button className="add-button" onClick={() => openModal()}>
                添加文件代理
              </button>
            </div>
          ) : (
            <table className="proxy-table">
              <thead>
                <tr>
                  <th>状态</th>
                  <th>本地文件路径</th>
                  <th>远程路径</th>
                  <th>描述</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {fileProxies.map(proxy => (
                  <tr key={proxy.id} className={proxy.active ? '' : 'inactive'}>
                    <td>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={proxy.active} 
                          onChange={() => toggleActive(proxy.id)} 
                        />
                        <span className="slider"></span>
                      </label>
                    </td>
                    <td className="local-path">{proxy.localPath}</td>
                    <td>{proxy.remotePath}</td>
                    <td>{proxy.description || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="edit-button" 
                          onClick={() => openModal(proxy)}
                        >
                          编辑
                        </button>
                        <button 
                          className="delete-button" 
                          onClick={() => deleteProxy(proxy.id)}
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
                <h2>{currentProxy ? '编辑文件代理' : '添加文件代理'}</h2>
                <button className="close-button" onClick={closeModal}>×</button>
              </div>
              <form className="proxy-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>本地文件路径</label>
                  <div className="file-input-group">
                    <input 
                      type="text" 
                      value={localPath} 
                      onChange={(e) => setLocalPath(e.target.value)} 
                      placeholder="/path/to/local/file.json"
                      required
                    />
                    <button type="button" className="browse-button">浏览...</button>
                  </div>
                  <div className="help-text">选择本地文件作为数据源</div>
                </div>
                
                <div className="form-group">
                  <label>远程路径</label>
                  <input 
                    type="text" 
                    value={remotePath} 
                    onChange={(e) => setRemotePath(e.target.value)} 
                    placeholder="/api/data"
                    required
                  />
                  <div className="help-text">访问此路径时将返回本地文件内容</div>
                </div>
                
                <div className="form-group">
                  <label>描述（可选）</label>
                  <input 
                    type="text" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="接口描述"
                  />
                </div>
                
                <div className="form-actions">
                  <button type="button" className="cancel-button" onClick={closeModal}>
                    取消
                  </button>
                  <button type="submit" className="submit-button">
                    {currentProxy ? '保存修改' : '添加代理'}
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

export default FileProxy; 