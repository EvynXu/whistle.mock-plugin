import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Input, Tree, Modal, message, Breadcrumb, Typography } from 'antd';
import { 
  FileOutlined, 
  FolderOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SaveOutlined, 
  UploadOutlined,
  ExclamationCircleOutlined,
  FolderAddOutlined
} from '@ant-design/icons';
import { ProxyAPI } from '../services/api';

const { Text } = Typography;
const { DirectoryTree } = Tree;
const { confirm } = Modal;
const { TextArea } = Input;

const FilesPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState([{ title: '根目录', path: '' }]);
  const [fileContent, setFileContent] = useState('');
  const [currentFile, setCurrentFile] = useState(null);
  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    fetchFiles();
  }, [currentPath]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const data = await ProxyAPI.listFiles(currentPath);
      setFiles(data);
    } catch (error) {
      console.error("获取文件列表失败:", error);
      message.error('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async (file) => {
    if (file.isDirectory) {
      navigateToFolder(file.path);
    } else {
      try {
        setLoading(true);
        const data = await ProxyAPI.getFile(file.path);
        setCurrentFile(file);
        setFileContent(data.content);
        setFileModalVisible(true);
      } catch (error) {
        console.error("获取文件内容失败:", error);
        message.error('获取文件内容失败');
      } finally {
        setLoading(false);
      }
    }
  };

  const navigateToFolder = (path) => {
    setCurrentPath(path);
    
    // 更新面包屑
    const parts = path.split('/').filter(Boolean);
    const crumbs = [{ title: '根目录', path: '' }];
    
    let currentPathSegment = '';
    parts.forEach(part => {
      currentPathSegment += currentPathSegment ? `/${part}` : part;
      crumbs.push({
        title: part,
        path: currentPathSegment
      });
    });
    
    setBreadcrumbs(crumbs);
  };

  const handleBreadcrumbClick = (path) => {
    navigateToFolder(path);
  };

  const handleSaveFile = async () => {
    try {
      setLoading(true);
      await ProxyAPI.saveFile(currentFile.path, fileContent);
      setFileModalVisible(false);
      message.success('文件保存成功');
      fetchFiles();
    } catch (error) {
      console.error("保存文件失败:", error);
      message.error('保存文件失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = (file) => {
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除${file.isDirectory ? '文件夹' : '文件'} "${file.name}" 吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await ProxyAPI.deleteFile(file.path);
          message.success('删除成功');
          fetchFiles();
        } catch (error) {
          console.error("删除失败:", error);
          message.error('删除失败');
        }
      },
    });
  };

  const handleCreateFile = async () => {
    const newFileName = `new-file-${Date.now()}.json`;
    const newFilePath = currentPath ? `${currentPath}/${newFileName}` : newFileName;
    
    try {
      await ProxyAPI.saveFile(newFilePath, '{\n  "data": "新文件内容"\n}');
      message.success('文件创建成功');
      fetchFiles();
      
      // 创建后立即打开编辑
      const newFile = { path: newFilePath, name: newFileName, isDirectory: false };
      handleOpenFile(newFile);
    } catch (error) {
      console.error("创建文件失败:", error);
      message.error('创建文件失败');
    }
  };

  const handleCreateFolder = () => {
    setNewFolderName('');
    setFolderModalVisible(true);
  };

  const handleFolderModalOk = async () => {
    if (!newFolderName.trim()) {
      message.error('请输入文件夹名称');
      return;
    }
    
    const newFolderPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;
    
    try {
      // 通过创建一个占位文件来创建文件夹
      await ProxyAPI.saveFile(`${newFolderPath}/.placeholder`, '');
      setFolderModalVisible(false);
      message.success('文件夹创建成功');
      fetchFiles();
    } catch (error) {
      console.error("创建文件夹失败:", error);
      message.error('创建文件夹失败');
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {record.isDirectory ? <FolderOutlined /> : <FileOutlined />}
          <a onClick={() => handleOpenFile(record)}>{text}</a>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'isDirectory',
      key: 'type',
      width: 100,
      render: (isDirectory) => isDirectory ? '文件夹' : '文件',
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size, record) => record.isDirectory ? '-' : `${size} 字节`,
    },
    {
      title: '修改时间',
      dataIndex: 'mtime',
      key: 'mtime',
      width: 200,
      render: (text) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteFile(record)}>
          删除
        </Button>
      ),
    },
  ];

  return (
    <div className="files-page">
      <Card
        title="文件管理"
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateFile}>
              新建文件
            </Button>
            <Button icon={<FolderAddOutlined />} onClick={handleCreateFolder}>
              新建文件夹
            </Button>
          </Space>
        }
      >
        <Breadcrumb style={{ marginBottom: '16px' }}>
          {breadcrumbs.map((crumb, index) => (
            <Breadcrumb.Item key={index}>
              <a onClick={() => handleBreadcrumbClick(crumb.path)}>{crumb.title}</a>
            </Breadcrumb.Item>
          ))}
        </Breadcrumb>

        <Table
          columns={columns}
          dataSource={files}
          rowKey="path"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={currentFile?.name || '文件内容'}
        open={fileModalVisible}
        onCancel={() => setFileModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setFileModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={handleSaveFile}
            loading={loading}
          >
            保存
          </Button>,
        ]}
        width={800}
      >
        <TextArea
          value={fileContent}
          onChange={(e) => setFileContent(e.target.value)}
          autoSize={{ minRows: 20, maxRows: 30 }}
        />
      </Modal>

      <Modal
        title="新建文件夹"
        open={folderModalVisible}
        onOk={handleFolderModalOk}
        onCancel={() => setFolderModalVisible(false)}
        okText="创建"
        cancelText="取消"
      >
        <Input
          placeholder="请输入文件夹名称"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onPressEnter={handleFolderModalOk}
        />
      </Modal>
    </div>
  );
};

export default FilesPage; 