import React, { useState, useEffect } from 'react';
import { Modal, Spin, Alert } from 'antd';
import ReactMarkdown from 'react-markdown';
import '../styles/version-modal.css';

/**
 * 获取版本信息的请求函数
 * @returns {Promise<Object>} 版本信息
 */
const getVersionInfo = async () => {
  const response = await fetch('/cgi-bin/version', {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || '请求失败');
  }
  
  return data;
};

/**
 * 版本信息模态框组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.visible - 是否显示模态框
 * @param {Function} props.onCancel - 取消回调函数
 */
const VersionModal = ({ visible, onCancel }) => {
  const [versionContent, setVersionContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      fetchVersionInfo();
    }
  }, [visible]);

  const fetchVersionInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getVersionInfo();
      if (response.code === 0) {
        setVersionContent(response.data.content);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(`获取版本信息失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="版本更新记录"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      className="version-modal"
    >
      <div className="version-modal-content">
        {loading && (
          <div className="version-modal-loading">
            <Spin size="large" />
            <p>正在加载版本信息...</p>
          </div>
        )}
        
        {error && (
          <Alert
            message="加载失败"
            description={error}
            type="error"
            showIcon
          />
        )}
        
        {!loading && !error && versionContent && (
          <div className="version-markdown-content">
            <ReactMarkdown>
              {versionContent.replace(/^#\s*🔄?\s*版本更新记录\s*\n+/, '')}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default VersionModal;