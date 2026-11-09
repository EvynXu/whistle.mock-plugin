import React from 'react';
import { Modal, Table } from 'antd';
import { getShortcutsList } from '../hooks/useKeyboardShortcuts';

const KeyboardShortcutsHelp = ({ visible, onClose }) => {
  const shortcuts = getShortcutsList();

  const columns = [
    {
      title: '快捷键',
      dataIndex: 'key',
      key: 'key',
      width: 180,
      render: (text) => (
        <kbd style={{
          display: 'inline-block',
          padding: '4px 8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          lineHeight: 1,
          color: '#333',
          background: '#f5f5f5',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          boxShadow: '0 1px 0 rgba(0,0,0,0.1)',
        }}>
          {text}
        </kbd>
      ),
    },
    {
      title: '功能',
      dataIndex: 'desc',
      key: 'desc',
    },
  ];

  return (
    <Modal
      title="⌨️ 键盘快捷键"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={480}
    >
      <Table
        dataSource={shortcuts.map((s, i) => ({ ...s, id: i }))}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        showHeader={false}
      />
    </Modal>
  );
};

export default KeyboardShortcutsHelp;
