import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Card, Button, Space, Badge, Row, Col, Input, Select, Tooltip, message, AutoComplete } from 'antd';
import { 
  CodeOutlined, 
  EyeOutlined, 
  FormatPainterOutlined,
  FileTextOutlined,
  PlusCircleOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined 
} from '@ant-design/icons';
import { generateResponseId } from './utils';

const { TextArea } = Input;
const { Option } = Select;

const ResponseContentEditor = ({ 
  form,
  responses, 
  activeResponseId, 
  onPreview
}) => {
  const { getFieldValue, setFieldsValue } = form;
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [isTextareaFullscreen, setIsTextareaFullscreen] = useState(false);

  // 查找激活的响应
  const activeResponseIndex = responses.findIndex(r => r.id === activeResponseId);
  const activeResponse = activeResponseIndex >= 0 ? responses[activeResponseIndex] : null;

  // 全屏切换函数
  const toggleTextareaFullscreen = () => {
    setIsTextareaFullscreen(!isTextareaFullscreen);
  };

  // ESC键退出全屏 - 移到全屏覆盖层内部处理
  const handleFullscreenEscKey = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setIsTextareaFullscreen(false);
    }
  };

  // 添加新响应
  const handleAddResponse = () => {
    const newResponseId = generateResponseId();
    let currentResponses = getFieldValue('responses') || [];
    
    // 确保数组格式
    if (!Array.isArray(currentResponses)) {
      try {
        if (typeof currentResponses === 'string') {
          currentResponses = JSON.parse(currentResponses);
        }
      } catch (e) {
        currentResponses = [];
      }
    }
    
    if (!Array.isArray(currentResponses)) {
      currentResponses = [];
    }
    
    const newResponse = {
      id: newResponseId,
      name: `响应 ${currentResponses.length + 1}`,
      description: '',
      content: '{\n  "code": 0,\n  "message": "success",\n  "data": {}\n}'
    };
    
    const updatedResponses = [...currentResponses, newResponse];
    
    // 更新表单字段
    setFieldsValue({ 
      responses: updatedResponses,
      activeResponseId: newResponseId
    });
  };

  // 删除响应
  const handleDeleteResponse = (responseId) => {
    let currentResponses = getFieldValue('responses') || [];
    
    if (currentResponses.length <= 1) {
      message.warning('至少需要保留一个响应');
      return;
    }
    
    const updatedResponses = currentResponses.filter(resp => resp.id !== responseId);
    
    // 如果删除的是当前选中的响应，切换到第一个响应
    let newActiveId = activeResponseId;
    if (responseId === activeResponseId) {
      newActiveId = updatedResponses[0]?.id;
    }
    
    setFieldsValue({ 
      responses: updatedResponses,
      activeResponseId: newActiveId
    });
  };

  // 切换响应
  const handleResponseSelect = (responseId) => {
    setFieldsValue({ activeResponseId: responseId });
    setIsEditing(false);
  };

  // 开始编辑响应名称
  const handleStartEdit = () => {
    if (activeResponse) {
      setEditingName(activeResponse.name || '');
      setIsEditing(true);
    }
  };

  // 完成编辑响应名称
  const handleFinishEdit = () => {
    if (activeResponseId && editingName.trim()) {
      const currentResponses = getFieldValue('responses') || [];
      const updatedResponses = currentResponses.map(resp => 
        resp.id === activeResponseId ? { ...resp, name: editingName.trim() } : resp
      );
      setFieldsValue({ responses: updatedResponses });
    }
    setIsEditing(false);
    setEditingName('');
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingName('');
  };

  // 更新响应内容
  const updateActiveResponseContent = (content) => {
    if (activeResponseIndex >= 0) {
      const currentResponses = getFieldValue('responses') || [];
      const newResponses = [...currentResponses];
      newResponses[activeResponseIndex] = {
        ...newResponses[activeResponseIndex],
        content
      };
      setFieldsValue({ responses: newResponses });
    }
  };

  // 格式化JSON内容
  const formatJsonContent = () => {
    if (!activeResponse || !activeResponse.content) {
      message.warning('没有可格式化的JSON内容');
      return;
    }
    
    try {
      const parsedJson = JSON.parse(activeResponse.content);
      const formattedJson = JSON.stringify(parsedJson, null, 2);
      
      updateActiveResponseContent(formattedJson);
      message.success('JSON已格式化');
    } catch (error) {
      message.error('无效的JSON格式，无法格式化');
    }
  };

  // 预览响应内容
  const handlePreview = () => {
    if (!activeResponse) {
      message.error('未找到有效的响应内容');
      return;
    }
    
    if (onPreview) {
      onPreview();
    }
  };

  // 渲染全屏TextArea
  const renderFullscreenTextarea = () => {
    if (!isTextareaFullscreen || !activeResponse) return null;

    return ReactDOM.createPortal(
      <div 
        className="textarea-fullscreen-overlay"
        onKeyDown={handleFullscreenEscKey}
        tabIndex={-1}
      >
        <div className="textarea-fullscreen-header">
          <Button 
            icon={<FullscreenExitOutlined />}
            onClick={toggleTextareaFullscreen}
            size="small"
            type="text"
            style={{ color: '#ffffff' }}
          >
            退出全屏 (ESC)
          </Button>
        </div>
        <TextArea 
          className="textarea-fullscreen-editor"
          autoFocus
          placeholder="请输入响应内容..." 
          value={activeResponse.content || ''}
          onChange={(e) => updateActiveResponseContent(e.target.value)}
        />
      </div>,
      document.body
    );
  };

  // 如果没有响应数据，显示创建按钮
  if (!Array.isArray(responses) || responses.length === 0) {
    return (
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CodeOutlined />
            <span>响应内容编辑</span>
          </div>
        }
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: '16px' }}
      >
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          background: '#fafafa',
          borderRadius: '6px',
          border: '1px dashed #d9d9d9'
        }}>
          <FileTextOutlined style={{ fontSize: '32px', color: '#d9d9d9', marginBottom: '12px' }} />
          <div style={{ color: '#999', marginBottom: '16px' }}>暂无响应数据</div>
          <Button 
            type="primary" 
            icon={<PlusCircleOutlined />} 
            onClick={handleAddResponse}
          >
            创建第一个响应
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CodeOutlined />
          <span>响应内容编辑</span>
          <Badge 
            count={responses.length} 
            style={{ backgroundColor: '#52c41a' }} 
          />
        </div>
      }
      extra={
        <Space size="small">
          <Button 
            type="default" 
            icon={<PlusCircleOutlined />} 
            onClick={handleAddResponse}
            size="small"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              borderColor: '#1890ff',
              color: '#1890ff'
            }}
          >
            添加响应
          </Button>
          <Button 
            type="default" 
            icon={<EyeOutlined />} 
            onClick={handlePreview}
            size="small"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              borderColor: '#52c41a',
              color: '#52c41a'
            }}
          >
            预览
          </Button>
          <Button 
            type="default" 
            icon={<FormatPainterOutlined />} 
            onClick={formatJsonContent}
            size="small"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              borderColor: '#fa8c16',
              color: '#fa8c16'
            }}
          >
            格式化JSON
          </Button>
        </Space>
      }
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: '16px' }}
    >
      {/* 响应选择和名称编辑合并区域 */}
      <div style={{ marginBottom: '16px' }}>
        <Row gutter={12} align="middle">
          <Col span={20}>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ 
                fontSize: '12px', 
                color: '#666', 
                fontWeight: 'bold' 
              }}>
                选择响应 / 编辑名称
              </label>
            </div>
            
            <div style={{ position: 'relative' }}>
              {isEditing ? (
                // 编辑模式：显示输入框
                <Input.Group compact>
                  <Input
                    style={{ width: 'calc(100% - 80px)' }}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onPressEnter={handleFinishEdit}
                    onBlur={handleFinishEdit}
                    placeholder="输入响应名称"
                    autoFocus
                  />
                  <Button 
                    style={{ width: '40px' }}
                    type="primary" 
                    icon={<CheckCircleOutlined />}
                    onClick={handleFinishEdit}
                  />
                  <Button 
                    style={{ width: '40px' }}
                    icon={<DeleteOutlined />}
                    onClick={handleCancelEdit}
                  />
                </Input.Group>
              ) : (
                // 选择模式：显示下拉选择器
                <Input.Group compact>
                  <Select
                    style={{ width: 'calc(100% - 40px)' }}
                    placeholder="选择要编辑的响应"
                    value={activeResponseId}
                    onChange={handleResponseSelect}
                    optionLabelProp="label"
                  >
                    {responses.map((resp, index) => (
                      <Option 
                        key={resp.id} 
                        value={resp.id}
                        label={
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                            <span>{resp.name || `响应 ${index + 1}`}</span>
                          </div>
                        }
                      >
                        <div style={{ padding: '4px 0' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            marginBottom: '4px'
                          }}>
                            <span style={{ fontWeight: 'bold' }}>
                              {resp.name || `响应 ${index + 1}`}
                            </span>
                            {resp.id === activeResponseId && (
                              <Badge status="processing" text="当前选中" />
                            )}
                          </div>
                        </div>
                      </Option>
                    ))}
                  </Select>
                  <Tooltip title="编辑响应名称">
                    <Button 
                      style={{ width: '40px' }}
                      icon={<EditOutlined />}
                      onClick={handleStartEdit}
                      disabled={!activeResponse}
                    />
                  </Tooltip>
                </Input.Group>
              )}
            </div>
          </Col>
          
          <Col span={4}>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ 
                fontSize: '12px', 
                color: '#666', 
                fontWeight: 'bold' 
              }}>
                操作
              </label>
            </div>
            <Tooltip title="删除当前响应">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => activeResponseId && handleDeleteResponse(activeResponseId)}
                disabled={responses.length <= 1 || !activeResponse}
                style={{ width: '100%' }}
              >
                删除
              </Button>
            </Tooltip>
          </Col>
        </Row>
      </div>

      {/* 响应内容编辑区域 */}
      {activeResponse && (
        <>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ 
              fontSize: '12px', 
              color: '#666', 
              fontWeight: 'bold' 
            }}>
              响应内容
            </label>
          </div>
          
          <div style={{ position: 'relative' }}>
            <TextArea 
              rows={12} 
              placeholder="请输入响应内容..." 
              style={{ 
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                fontSize: '13px',
                lineHeight: '1.5'
              }}
              value={activeResponse.content || ''}
              onChange={(e) => updateActiveResponseContent(e.target.value)}
            />
            <Button 
              className="textarea-fullscreen-btn"
              icon={<FullscreenOutlined />}
              onClick={toggleTextareaFullscreen}
              size="small"
              style={{
                position: 'absolute',
                top: '8px',
                right: '12px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #d9d9d9',
                zIndex: 10
              }}
              title="全屏编辑"
            />
          </div>
        </>
      )}
      
      {/* 渲染全屏编辑器 */}
      {renderFullscreenTextarea()}
    </Card>
  );
};

export default ResponseContentEditor; 