import React, { useState, useEffect } from 'react';
import { ReactSortable } from 'react-sortablejs';
import ReactDOM from 'react-dom';
import { Card, Button, Space, Badge, Row, Col, Input, Select, Tooltip, message, Tag, Divider } from 'antd';
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
  FullscreenExitOutlined,
  MenuOutlined,
  FilterOutlined,
  PlusOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { generateResponseId } from './utils';

const { TextArea } = Input;
const { Option } = Select;

const MATCH_TYPE_LABELS = {
  exact: '精确',
  contains: '包含',
  regex: '正则',
};

const ResponseContentEditor = ({ 
  form,
  responses, 
  activeResponseId, 
  onPreview,
  enableSorting = false
}) => {
  const { getFieldValue, setFieldsValue } = form;
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [isTextareaFullscreen, setIsTextareaFullscreen] = useState(false);
  const [showSorting, setShowSorting] = useState(false);

  const [responseParamMatcherEnabled, setResponseParamMatcherEnabled] = useState(() => {
    const v = localStorage.getItem('responseParamMatcherEnabled');
    return v === null ? true : v !== 'false';
  });

  useEffect(() => {
    const handleStorage = () => {
      const v = localStorage.getItem('responseParamMatcherEnabled');
      setResponseParamMatcherEnabled(v === null ? true : v !== 'false');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 查找激活的响应
  const activeResponseIndex = responses.findIndex(r => r.id === activeResponseId);
  const activeResponse = activeResponseIndex >= 0 ? responses[activeResponseIndex] : null;
  // 拖拽排序：基于 ReactSortable 管理一个本地列表镜像
  const [sortableList, setSortableList] = useState(() => {
    return Array.isArray(responses) ? responses.map(r => ({ ...r })) : [];
  });

  useEffect(() => {
    setSortableList(Array.isArray(responses) ? responses.map(r => ({ ...r })) : []);
  }, [responses]);

  const handleAfterSort = (newList) => {
    setFieldsValue({ responses: newList });
  };


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
      content: '{\n  "code": 0,\n  "message": "success",\n  "data": {}\n}',
      paramMatchers: []
    };
    
    const updatedResponses = [...currentResponses, newResponse];
    
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

  // 更新当前响应的 paramMatchers
  const updateActiveResponseParamMatchers = (paramMatchers) => {
    if (activeResponseIndex >= 0) {
      const currentResponses = getFieldValue('responses') || [];
      const newResponses = [...currentResponses];
      newResponses[activeResponseIndex] = {
        ...newResponses[activeResponseIndex],
        paramMatchers
      };
      setFieldsValue({ responses: newResponses });
    }
  };

  // 添加入参匹配规则
  const handleAddParamMatcher = () => {
    const currentMatchers = (activeResponse && activeResponse.paramMatchers) || [];
    updateActiveResponseParamMatchers([
      ...currentMatchers,
      { paramPath: '', paramValue: '', matchType: 'exact' }
    ]);
  };

  // 删除入参匹配规则
  const handleRemoveParamMatcher = (index) => {
    const currentMatchers = (activeResponse && activeResponse.paramMatchers) || [];
    const newMatchers = currentMatchers.filter((_, i) => i !== index);
    updateActiveResponseParamMatchers(newMatchers);
  };

  // 更新入参匹配规则某个字段
  const handleParamMatcherChange = (index, field, value) => {
    const currentMatchers = (activeResponse && activeResponse.paramMatchers) || [];
    const newMatchers = currentMatchers.map((m, i) => 
      i === index ? { ...m, [field]: value } : m
    );
    updateActiveResponseParamMatchers(newMatchers);
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
            style={{ color: '#595959' }}
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

  // 渲染响应级入参匹配规则区域
  const renderParamMatchers = () => {
    if (!activeResponse) return null;

    const matchers = activeResponse.paramMatchers || [];

    return (
      <div style={{ marginBottom: '12px' }}>
        <Divider orientation="left" orientationMargin={0} style={{ margin: '0 0 10px 0', fontSize: '12px' }}>
          <Space size={6}>
            <FilterOutlined style={{ color: '#1677ff' }} />
            <span style={{ fontWeight: 'bold', color: '#333' }}>入参匹配规则</span>
            {matchers.length > 0 && (
              <Tag color="blue" style={{ fontSize: '11px', padding: '0 4px' }}>{matchers.length}条</Tag>
            )}
            <Tooltip title="满足所有规则时返回此响应；无规则的响应作为默认兜底。响应按列表顺序依次检查，第一个匹配的响应被返回。">
              <QuestionCircleOutlined style={{ color: '#bbb', cursor: 'help', fontSize: '12px' }} />
            </Tooltip>
          </Space>
        </Divider>
        <div>
          {matchers.map((matcher, index) => (
            <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <Input
                style={{ flex: 1 }}
                placeholder="参数路径（如：userId 或 data.user.id）"
                value={matcher.paramPath || ''}
                onChange={(e) => handleParamMatcherChange(index, 'paramPath', e.target.value)}
                size="small"
              />
              <Input
                style={{ flex: 1 }}
                placeholder="期望值（如：123 或 admin）"
                value={matcher.paramValue || ''}
                onChange={(e) => handleParamMatcherChange(index, 'paramValue', e.target.value)}
                size="small"
              />
              <Select
                style={{ width: 90 }}
                value={matcher.matchType || 'exact'}
                onChange={(val) => handleParamMatcherChange(index, 'matchType', val)}
                size="small"
              >
                <Option value="exact">精确匹配</Option>
                <Option value="contains">包含</Option>
                <Option value="regex">正则</Option>
              </Select>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => handleRemoveParamMatcher(index)}
              />
            </div>
          ))}
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAddParamMatcher}
            style={{ width: '100%' }}
          >
            添加匹配规则
          </Button>
          {matchers.length === 0 && (
            <div style={{ color: '#bbb', fontSize: '12px', marginTop: '6px', textAlign: 'center' }}>
              无规则时此响应作为默认兜底响应
            </div>
          )}
        </div>
      </div>
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
          borderRadius: '6px',
          border: '1px dashed #d9d9d9'
        }}>
          <FileTextOutlined style={{ fontSize: '32px', color: '#bfbfbf', marginBottom: '12px' }} />
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
            style={{ backgroundColor: '#00ff41' }} 
          />
        </div>
      }
      extra={
        <Space size="small">
          {enableSorting && (
            <Button 
              type="default" 
              icon={<MenuOutlined />} 
              onClick={() => setShowSorting(!showSorting)}
              size="small"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              排序
            </Button>
          )}
          <Button 
            type="default" 
            icon={<PlusCircleOutlined />} 
            onClick={handleAddResponse}
            size="small"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px'
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
              borderColor: '#00ff41',
              color: '#00ff41'
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
      {enableSorting && showSorting && Array.isArray(sortableList) && sortableList.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <ReactSortable
            list={sortableList}
            setList={(newState) => {
              setSortableList(newState);
              handleAfterSort(newState);
            }}
            animation={150}
            ghostClass="sortable-ghost"
            style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}
          >
            {sortableList.map((item) => (
              <div
                key={item.id}
                className={`sortable-chip${item.id === activeResponseId ? ' sortable-chip-active' : ''}`}
                onClick={() => handleResponseSelect(item.id)}
                title={item.name || '未命名响应'}
              >
                {item.name || '未命名响应'}
              </div>
            ))}
          </ReactSortable>
        </div>
      )}
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
                <Input.Group compact>
                  <Select
                    style={{ width: 'calc(100% - 40px)' }}
                    placeholder="选择要编辑的响应"
                    value={activeResponseId}
                    onChange={handleResponseSelect}
                  >
                    {responses.map((resp, index) => (
                      <Option key={resp.id} value={resp.id}>
                        {resp.name || `响应 ${index + 1}`}
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

      {/* 响应级入参匹配规则区域 */}
      {activeResponse && responseParamMatcherEnabled && renderParamMatchers()}

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
              rows={26} 
              placeholder="请输入响应内容..." 
              style={{ 
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                fontSize: '13px',
                lineHeight: '1.5',
                minHeight: '620px'
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
