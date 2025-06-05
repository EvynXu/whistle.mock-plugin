import React, { useState, useEffect } from 'react';
import { Modal, Spin, Alert } from 'antd';
import { ProxyAPI } from '../services/api';
import '../styles/version-modal.css';

/**
 * 简单的Markdown渲染器组件
 * @param {Object} props - 组件属性
 * @param {string} props.children - 要渲染的Markdown文本
 */
const SimpleMarkdownRenderer = ({ children }) => {
  const renderMarkdown = (text) => {
    return text
      .split('\n')
      .map((line, index) => {
        // 处理标题
        if (line.startsWith('# ')) {
          return <h1 key={index}>{line.substring(2)}</h1>;
        } 
        if (line.startsWith('## ')) {
          return <h2 key={index}>{line.substring(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index}>{line.substring(4)}</h3>;
        }
        
        // 处理列表项
        if (line.startsWith('- ')) {
          return <li key={index}>{line.substring(2)}</li>;
        }
        
        // 处理空行
        if (line.trim() === '') {
          return <br key={index} />;
        }
        
        // 处理加粗文本
        const boldText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <p key={index} dangerouslySetInnerHTML={{ __html: boldText }} />;
      });
  };

  return <div className="simple-markdown">{renderMarkdown(children)}</div>;
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
        const response = await ProxyAPI.getVersionInfo();
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
            <SimpleMarkdownRenderer>{versionContent}</SimpleMarkdownRenderer>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default VersionModal;