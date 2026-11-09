import React from 'react';
import { Modal, Button } from 'antd';

const PreviewModal = ({ 
  visible, 
  onCancel, 
  previewContent 
}) => {
  return (
    <Modal
      title={previewContent?.title || "预览响应内容"}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          关闭
        </Button>
      ]}
      width={600}
    >
      {previewContent?.description && (
        <div style={{ 
          marginBottom: '16px',
          padding: '8px',
          borderRadius: '4px',
          borderLeft: '4px solid #00f0ff'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>描述：</div>
          <div style={{ opacity: 0.7 }}>{previewContent.description}</div>
        </div>
      )}
      
      <div style={{ 
        maxHeight: '60vh', 
        overflow: 'auto', 
        padding: '16px',
        borderRadius: '4px',
        fontFamily: "'Share Tech Mono', monospace",
      }}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
          {previewContent?.content}
        </pre>
      </div>
    </Modal>
  );
};

export default PreviewModal;
