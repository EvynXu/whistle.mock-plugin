import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { 
  Table, Button, Modal, Form, Input, Select, message, Switch, 
  Popconfirm, Alert, Space, Card, Badge, Tooltip, Row, Col 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  FileTextOutlined, PlusCircleOutlined 
} from '@ant-design/icons';
import '../styles/interface-management.css';
import axios from 'axios';

// 导入拆分后的组件
import {
  ResponseContentEditor,
  PreviewModal,
  contentTypes,
  proxyTypes,
  statusCodes,
  httpMethods,
  refreshCacheAfterUpdate,
  formatResponseContent,
  generateResponseId
} from '../components/interface-management';

const { Option } = Select;

const InterfaceManagement = () => {
  const { featureId } = useParams();
  const history = useHistory();
  
  // 基础状态
  const [features, setFeatures] = useState([]);
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [interfacesLoading, setInterfacesLoading] = useState(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);
  
  // 模态框状态
  const [modalVisible, setModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  // 编辑状态
  const [editingInterface, setEditingInterface] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [currentResponseId, setCurrentResponseId] = useState(null);
  
  // 表单实例
  const [form] = Form.useForm();

  // 表格配置状态（支持缓存）
  const [tableConfig, setTableConfig] = useState(() => {
    const cached = localStorage.getItem('interface-table-config');
    return cached ? JSON.parse(cached) : {
      sortOrder: null,
      sortField: null,
      pageSize: 10,
      current: 1
    };
  });

  // 保存表格配置到localStorage
  const saveTableConfig = (config) => {
    const newConfig = { ...tableConfig, ...config };
    setTableConfig(newConfig);
    localStorage.setItem('interface-table-config', JSON.stringify(newConfig));
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  useEffect(() => {
    if (selectedFeatureId) {
      fetchInterfaces();
    }
  }, [selectedFeatureId]);

  // 获取当前选中的功能模块
  const selectedFeature = features.find(f => f.id === selectedFeatureId);

  const fetchFeatures = async () => {
    try {
      setFeaturesLoading(true);
      const response = await axios.get('/cgi-bin/features');
      if (response.data && response.data.code === 0 && Array.isArray(response.data.data)) {
        setFeatures(response.data.data);
        // 如果URL中有featureId参数，使用它
        const initialFeatureId = featureId || (response.data.data[0]?.id);
        if (initialFeatureId) {
          setSelectedFeatureId(initialFeatureId);
        }
      } else {
        setFeatures([]);
        message.warning('获取功能模块数据格式不正确');
      }
    } catch (error) {
      console.error('获取功能模块失败:', error);
      message.error(error.response?.data?.message || '获取功能模块失败');
      setFeatures([]);
    } finally {
      setFeaturesLoading(false);
    }
  };

  const fetchInterfaces = async () => {
    if (!selectedFeatureId) {
      return;
    }
    try {
      setInterfacesLoading(true);
      const response = await axios.get(`/cgi-bin/interfaces?featureId=${selectedFeatureId}`);
      
      console.log('获取接口列表响应:', response.data);
      
      if (response.data && response.data.code === 0 && Array.isArray(response.data.data)) {
        // 确保每个接口的响应数据格式正确
        const processedInterfaces = response.data.data.map(item => {
          console.log(`处理接口 ${item.name}:`, {
            hasResponses: !!item.responses,
            responsesLength: item.responses ? item.responses.length : 0,
            activeResponseId: item.activeResponseId
          });
          
          // 确保 responses 是数组
          if (!Array.isArray(item.responses)) {
            item.responses = [];
          }
          
          // 确保每个响应都有必要的字段
          item.responses = item.responses.map((resp, index) => ({
            id: resp.id || `resp-${index}-${Date.now()}`,
            name: resp.name || `响应 ${index + 1}`,
            description: resp.description || '',
            content: resp.content || '{}'
          }));
          
          return item;
        });
        
        setInterfaces(processedInterfaces);
        console.log('处理后的接口列表:', processedInterfaces);
      } else {
        console.warn('接口数据格式不正确:', response.data);
        setInterfaces([]);
        message.warning('获取接口配置数据格式不正确');
      }
    } catch (error) {
      console.error('获取接口配置失败:', error);
      message.error(error.response?.data?.message || '获取接口配置失败');
      setInterfaces([]);
    } finally {
      setInterfacesLoading(false);
    }
  };

  const handleAddInterface = () => {
    if (!selectedFeatureId) {
      message.warning('请先选择一个功能模块');
      return;
    }
    form.resetFields();
    
    // 创建默认响应
    const defaultResponseId = generateResponseId();
    const defaultResponses = [{
      id: defaultResponseId,
      name: '默认响应',
      description: '',
      content: '{\n  "code": 0,\n  "message": "success",\n  "data": {}\n}'
    }];
    
    console.log('创建新接口，初始化响应数据:', defaultResponses);
    
    form.setFieldsValue({
      proxyType: 'response',
      statusCode: '200',
      contentType: 'application/json; charset=utf-8',
      responses: defaultResponses,
      activeResponseId: defaultResponseId,
      httpMethod: 'ALL',
      headerItems: [], // 初始化为空数组
      paramMatchers: [] // 初始化为空数组
    });
    
    setCurrentResponseId(defaultResponseId);
    setEditingInterface(null);
    setModalVisible(true);
  };

  const handleEditInterface = (record) => {
    console.log('开始编辑接口:', record.name, '原始数据:', record);
    setEditingInterface(record);
    
    // 将自定义请求头转换为数组格式，用于动态表单项
    let headersArray = [];
    if (record.customHeaders && typeof record.customHeaders === 'object') {
      headersArray = Object.entries(record.customHeaders).map(([key, value]) => ({
        headerName: key,
        headerValue: value
      }));
    }

    // 处理参数匹配规则，转换为数组格式
    let paramMatchersArray = [];
    if (record.paramMatchers && Array.isArray(record.paramMatchers)) {
      paramMatchersArray = record.paramMatchers.map(matcher => ({
        paramPath: matcher.paramPath || '',
        paramValue: matcher.paramValue || '',
        matchType: matcher.matchType || 'exact'
      }));
    }

    // 处理多响应数据
    let initialResponses = [];
    let initialResponseId = null;

    // 深拷贝记录中的响应数据，避免引用问题
    if (record.responses && Array.isArray(record.responses) && record.responses.length > 0) {
      console.log('使用现有响应数据, 数量:', record.responses.length);
      
      initialResponses = JSON.parse(JSON.stringify(record.responses));
      initialResponseId = record.activeResponseId || record.responses[0].id;
      
      // 确保每个响应都有名称
      initialResponses = initialResponses.map((resp, index) => ({
        id: resp.id || generateResponseId(),
        name: resp.name || `响应 ${index + 1}`,
        description: resp.description || '',
        content: resp.content || '{}'
      }));
    } else if (record.responseContent) {
      // 向后兼容：如果只有传统的 responseContent 字段，创建一个默认响应
      console.log('创建默认响应，使用responseContent字段');
      const defaultResponseId = generateResponseId();
      initialResponses = [
        {
          id: defaultResponseId,
          name: '默认响应',
          description: '',
          content: record.responseContent
        }
      ];
      initialResponseId = defaultResponseId;
    }
    
    console.log('编辑接口，设置响应数据:', initialResponses);
    setCurrentResponseId(initialResponseId);
    
    form.setFieldsValue({
      name: record.name,
      pattern: record.urlPattern,
      proxyType: record.proxyType || 'response',
      statusCode: record.httpStatus?.toString() || '200',
      contentType: record.contentType || 'application/json; charset=utf-8',
      responses: initialResponses,
      activeResponseId: initialResponseId,
      httpMethod: record.httpMethod || 'ALL',
      targetUrl: record.targetUrl || '',
      headerItems: headersArray, // 使用数组存储表单项
      paramMatchers: paramMatchersArray
    });
    setModalVisible(true);
  };

  const handleDeleteInterface = async (id) => {
    try {
      const response = await axios.delete(`/cgi-bin/interfaces?id=${id}`);
      if (response.data && response.data.code === 0) {
        message.success('接口删除成功');
        fetchInterfaces();
        
        // 刷新规则缓存
        refreshCacheAfterUpdate();
      } else {
        throw new Error(response.data?.message || '接口删除失败');
      }
    } catch (error) {
      console.error('接口删除失败:', error);
      message.error(error.response?.data?.message || error.message || '接口删除失败');
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    try {
      const response = await axios.patch(`/cgi-bin/interfaces?id=${id}`, {
        active: !currentActive
      });
      if (response.data && response.data.code === 0) {
        message.success(`接口${!currentActive ? '启用' : '禁用'}成功`);
        fetchInterfaces();
      } else {
        throw new Error(response.data?.message || `接口${!currentActive ? '启用' : '禁用'}失败`);
      }
    } catch (error) {
      console.error(`接口${!currentActive ? '启用' : '禁用'}失败:`, error);
      message.error(error.response?.data?.message || error.message || `接口${!currentActive ? '启用' : '禁用'}失败`);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log('=== 开始表单提交 ===');
      console.log('表单提交，原始值:', JSON.stringify(values, null, 2));
      
      // 获取当前激活的响应ID和所有响应
      const activeResponseId = values.activeResponseId;
      let responses = values.responses || [];
      
      console.log('提取的原始响应数据:', responses);
      console.log('响应数据类型:', typeof responses);
      console.log('是否为数组:', Array.isArray(responses));
      
      // 确保responses是数组格式
      if (!Array.isArray(responses)) {
        console.log('响应数据不是数组，尝试解析...');
        try {
          if (typeof responses === 'string') {
            responses = JSON.parse(responses);
            if (!Array.isArray(responses)) {
              responses = [];
            }
          } else {
            responses = [];
          }
    } catch (e) {
          console.error('解析响应数据失败:', e);
          responses = [];
    }
      }
      
      console.log('处理前的响应数据:', JSON.stringify(responses, null, 2));

      // 确保每个响应都有名称、描述和内容
      const cleanedResponses = responses.map((resp, index) => {
        console.log(`处理响应 ${index}:`, resp);
        const cleaned = {
          id: resp.id || generateResponseId(),
          name: resp.name || `响应 ${index + 1}`,
          description: resp.description || '',
          content: resp.content || '{}'
        };
        console.log(`处理后的响应 ${index}:`, cleaned);
        return cleaned;
      });

      // 如果没有响应，创建一个默认响应
      if (cleanedResponses.length === 0) {
        console.log('没有响应数据，创建默认响应');
        const defaultId = generateResponseId();
        cleanedResponses.push({
          id: defaultId,
          name: '默认响应',
          description: '',
          content: '{\n  "code": 0,\n  "message": "success",\n  "data": {}\n}'
        });
        setCurrentResponseId(defaultId);
      }
      
      // 确保有一个激活的响应ID
      const validActiveResponseId = activeResponseId && cleanedResponses.some(r => r.id === activeResponseId) 
        ? activeResponseId 
        : cleanedResponses[0].id;
      
      // 获取激活的响应
      const activeResponse = cleanedResponses.find(r => r.id === validActiveResponseId) || cleanedResponses[0];
      
      console.log('=== 清理后的响应数据 ===');
      console.log('清理后的响应数据:', JSON.stringify(cleanedResponses, null, 2));
      console.log('激活的响应ID:', validActiveResponseId);
      console.log('激活的响应:', activeResponse);
      
      // 检查responseBody是否是有效的JSON
      if (values.proxyType === 'response' && values.contentType.includes('application/json')) {
        cleanedResponses.forEach(response => {
        try {
            if (response.content) {
              JSON.parse(response.content);
            }
        } catch (e) {
            message.error(`响应 "${response.name}" 不是有效的JSON格式`);
            throw new Error(`响应 "${response.name}" 不是有效的JSON格式`);
        }
        });
      }
      
      // 处理自定义请求头，将表单项数组转换为对象格式
      let customHeaders = {};
      
      if (values.proxyType === 'redirect' || values.proxyType === 'url_redirect') {
        if (values.headerItems && values.headerItems.length > 0) {
          values.headerItems.forEach(item => {
            if (item && item.headerName && item.headerName.trim()) {
              customHeaders[item.headerName.trim()] = item.headerValue || '';
            }
          });
        }
      }

      // 处理参数匹配规则，清理无效的规则
      let paramMatchers = [];
      if (values.proxyType === 'response' && values.paramMatchers && values.paramMatchers.length > 0) {
        paramMatchers = values.paramMatchers
          .filter(item => item && item.paramPath && item.paramPath.trim() && item.paramValue !== undefined)
          .map(item => ({
            paramPath: item.paramPath.trim(),
            paramValue: item.paramValue,
            matchType: item.matchType || 'exact'
          }));
      }

      console.log('=== 参数匹配规则处理 ===');
      console.log('原始参数匹配规则:', values.paramMatchers);
      console.log('清理后的参数匹配规则:', paramMatchers);

      const interfaceData = {
        name: values.name,
        featureId: selectedFeatureId,
        urlPattern: values.pattern,
        proxyType: values.proxyType,
        // 同时保存所有响应和当前活跃的响应
        responses: cleanedResponses,
        activeResponseId: validActiveResponseId,
        // 兼容性保留：将当前活跃响应的内容保存到 responseContent
        responseContent: activeResponse ? activeResponse.content : '',
        targetUrl: (values.proxyType === 'redirect' || values.proxyType === 'url_redirect') ? values.targetUrl : '',
        customHeaders: (values.proxyType === 'redirect' || values.proxyType === 'url_redirect') ? customHeaders : {},
        paramMatchers: paramMatchers, // 添加参数匹配规则
        httpStatus: parseInt(values.statusCode, 10), // 转换为数字
        contentType: values.contentType,
        responseDelay: 0,
        httpMethod: values.httpMethod,
        active: true
      };
      
      console.log('=== 最终提交的接口数据 ===');
      console.log('提交的接口数据:', JSON.stringify(interfaceData, null, 2));
      
      let response;
      if (editingInterface) {
        // 更新现有接口
        console.log('执行接口更新，ID:', editingInterface.id);
        response = await axios.put(`/cgi-bin/interfaces?id=${editingInterface.id}`, interfaceData);
      } else {
        // 创建新接口
        console.log('执行接口创建');
        response = await axios.post('/cgi-bin/interfaces', interfaceData);
      }

      console.log('服务器响应:', response.data);

      if (response.data && response.data.code === 0) {
        console.log('=== 接口操作成功 ===');
        message.success(editingInterface ? '接口更新成功' : '接口创建成功');
        setModalVisible(false);
        fetchInterfaces();
        
        // 刷新规则缓存
        refreshCacheAfterUpdate();
      } else {
        throw new Error(response.data?.message || '操作失败');
      }
    } catch (error) {
      if (error.message && error.message.includes('JSON格式')) {
        // 已经显示了错误信息，不需要再显示
        return;
      }
      console.error('=== 接口操作失败 ===');
      console.error('操作失败:', error);
      message.error(error.response?.data?.message || error.message || '操作失败');
    }
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleSelectFeature = (featureId) => {
    setSelectedFeatureId(featureId);
    // 切换功能模块时重置分页到第一页，但保留其他配置
    saveTableConfig({ current: 1 });
  };

  // 预览响应内容
  const handlePreview = () => {
    // 获取当前选中的响应内容
    const responses = form.getFieldValue('responses') || [];
    const activeResponseId = form.getFieldValue('activeResponseId');
    const activeResponse = responses.find(r => r.id === activeResponseId);
    
    if (!activeResponse) {
      message.error('未找到有效的响应内容');
      return;
    }
    
    // 根据内容类型格式化响应内容
    const contentType = form.getFieldValue('contentType') || '';
    const formattedContent = formatResponseContent(activeResponse.content, contentType);
    
    // 设置预览内容，包含响应名称
    setPreviewContent({
      title: `预览: ${activeResponse.name || '未命名响应'}`,
      content: formattedContent,
      description: '',
      contentType
    });
        setPreviewVisible(true);
  };

  const handleResponseSelect = (responseId) => {
    setCurrentResponseId(responseId);
  };

  // 在列表页面直接切换响应数据
  const handleResponseSwitch = async (interfaceId, responseId) => {
    try {
      const response = await axios.patch(`/cgi-bin/interfaces?id=${interfaceId}`, {
        activeResponseId: responseId
      });
      
      if (response.data.code === 0) {
        // 更新本地状态
        setInterfaces(interfaces.map(item => 
          item.id === interfaceId 
            ? { ...item, activeResponseId: responseId }
            : item
        ));
        
        const activeResponse = interfaces
          .find(item => item.id === interfaceId)
          ?.responses
          ?.find(resp => resp.id === responseId);
        
        message.success(`已切换到响应: ${activeResponse?.name || '未命名'}`);
        
        // 刷新缓存以立即生效
        await refreshCacheAfterUpdate();
      }
    } catch (error) {
      console.error('切换响应失败:', error);
      message.error('切换响应失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredInterfaces = interfaces.filter(item => 
    !selectedFeatureId || item.featureId === selectedFeatureId
  );

  // 处理表格变化（排序、分页）
  const handleTableChange = (pagination, filters, sorter) => {
    console.log('表格变化:', { pagination, filters, sorter });
    
    // 保存排序配置
    const sortConfig = {
      sortField: sorter.field || null,
      sortOrder: sorter.order || null,
      current: pagination.current,
      pageSize: pagination.pageSize
    };
    
    saveTableConfig(sortConfig);
  };

  const columns = [
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      width: 80,
      sorter: (a, b) => {
        // true排在前面，false排在后面
        return Number(b.active) - Number(a.active);
      },
      sortDirections: ['descend', 'ascend'],
      render: (active, record) => (
        <Switch
          checked={active}
          onChange={() => handleToggleActive(record.id, active)}
        />
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      sorter: (a, b) => a.name.localeCompare(b.name, 'zh-CN'),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'URL匹配规则',
      dataIndex: 'urlPattern',
      key: 'urlPattern',
      ellipsis: true,
      sorter: (a, b) => a.urlPattern.localeCompare(b.urlPattern),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: '处理方式',
      dataIndex: 'proxyType',
      key: 'proxyType',
      width: 120,
      sorter: (a, b) => {
        const aType = a.proxyType || 'response';
        const bType = b.proxyType || 'response';
        return aType.localeCompare(bType);
      },
      sortDirections: ['ascend', 'descend'],
      render: (text) => {
        const found = proxyTypes.find(item => item.value === text);
        return found ? found.label : text || '模拟响应';
      }
    },
    {
      title: '当前响应',
      dataIndex: 'responses',
      key: 'currentResponse',
      width: 160,
      render: (responses, record) => {
        // 仅在模拟响应类型时显示
        if (record.proxyType !== 'response') {
          return '-';
        }
        
        // 如果没有响应数据
        if (!responses || !Array.isArray(responses) || responses.length === 0) {
          return <span style={{ color: '#999' }}>无响应数据</span>;
        }
        
        // 如果只有一个响应，直接显示名称
        if (responses.length === 1) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{responses[0].name || '默认响应'}</span>
              <Badge count="1" style={{ backgroundColor: '#52c41a' }} />
            </div>
          );
        }
        
        // 多个响应时显示选择器
        const activeResponse = responses.find(r => r.id === record.activeResponseId) || responses[0];
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Select
              size="small"
              value={record.activeResponseId || activeResponse.id}
              onChange={(responseId) => handleResponseSwitch(record.id, responseId)}
              style={{ width: '110px' }}
              optionLabelProp="label"
              disabled={record.active === false}
            >
              {responses.map(resp => (
                <Option 
                  key={resp.id} 
                  value={resp.id} 
                  label={resp.name || '未命名'}
                >
                  <Tooltip title={resp.description || resp.name}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{resp.name || '未命名'}</span>
                      {resp.id === (record.activeResponseId || activeResponse.id) && (
                        <Badge status="processing" />
                      )}
                    </div>
                  </Tooltip>
                </Option>
              ))}
            </Select>
            <Badge 
              count={responses.length} 
              style={{ backgroundColor: '#1890ff' }}
              title={`共${responses.length}个响应`}
            />
          </div>
        );
      }
    },
    {
      title: '状态码',
      dataIndex: 'httpStatus',
      key: 'httpStatus',
      width: 100,
      sorter: (a, b) => {
        const aStatus = parseInt(a.httpStatus) || 0;
        const bStatus = parseInt(b.httpStatus) || 0;
        return aStatus - bStatus;
      },
      sortDirections: ['ascend', 'descend'],
      render: (text, record) => {
        return record.proxyType === 'response' ? text : '-';
      }
    },
    {
      title: '内容类型',
      dataIndex: 'contentType',
      key: 'contentType',
      width: 120,
      sorter: (a, b) => {
        const aType = a.contentType || '';
        const bType = b.contentType || '';
        return aType.localeCompare(bType);
      },
      sortDirections: ['ascend', 'descend'],
      render: (text, record) => {
        if (record.proxyType !== 'response') {
          return '-';
        }
        const found = contentTypes.find(item => item.value === text);
        return found ? found.label : text;
      }
    },
    {
      title: '目标URL',
      dataIndex: 'targetUrl',
      key: 'targetUrl',
      ellipsis: true,
      sorter: (a, b) => {
        const aUrl = a.targetUrl || '';
        const bUrl = b.targetUrl || '';
        return aUrl.localeCompare(bUrl);
      },
      sortDirections: ['ascend', 'descend'],
      render: (text, record) => {
        return (record.proxyType === 'redirect' || record.proxyType === 'url_redirect') ? text : '-';
      }
    },
    {
      title: '自定义头',
      dataIndex: 'customHeaders',
      key: 'customHeaders',
      width: 100,
      sorter: (a, b) => {
        const aCount = Object.keys(a.customHeaders || {}).length;
        const bCount = Object.keys(b.customHeaders || {}).length;
        return aCount - bCount;
      },
      sortDirections: ['ascend', 'descend'],
      render: (_, record) => {
        if (record.proxyType !== 'redirect' && record.proxyType !== 'url_redirect') {
          return '-';
        }
        
        const headers = record.customHeaders || {};
        const count = Object.keys(headers).length;
        
        if (count === 0) {
          return '-';
        }
        
        // 检查是否包含随机值
        const hasRandomValue = Object.values(headers).some(v => v && v.startsWith('@'));
        
        return (
          <Tooltip title={
            <div>
              {Object.entries(headers).map(([key, value]) => (
                <div key={key}>
                  {key}: {value}
                  {value && value.startsWith('@') && (
                    <span style={{ color: '#52c41a' }}> (随机)</span>
                  )}
                </div>
              ))}
            </div>
          }>
            <span style={{ color: '#1890ff' }}>
              {count}个
              {hasRandomValue && <span style={{ marginLeft: 4 }}>🎲</span>}
            </span>
          </Tooltip>
        );
      }
    },
    {
      title: '参数匹配',
      dataIndex: 'paramMatchers',
      key: 'paramMatchers',
      width: 100,
      render: (_, record) => {
        if (record.proxyType !== 'response') {
          return '-';
        }
        
        const matchers = record.paramMatchers || [];
        const count = matchers.length;
        
        if (count === 0) {
          return '-';
        }
        
        return (
          <Tooltip title={
            <div>
              {matchers.map((matcher, index) => (
                <div key={index}>
                  {matcher.paramPath}: {matcher.paramValue}
                  <span style={{ color: '#52c41a', marginLeft: 4 }}>
                    ({matcher.matchType === 'exact' ? '精确' : matcher.matchType === 'contains' ? '包含' : '正则'})
                  </span>
                </div>
              ))}
            </div>
          }>
            <span style={{ color: '#1890ff' }}>
              {count}条规则
            </span>
          </Tooltip>
        );
      }
    },
    {
      title: '请求方法',
      dataIndex: 'httpMethod',
      key: 'httpMethod',
      width: 120,
      sorter: (a, b) => {
        const aMethod = a.httpMethod || '';
        const bMethod = b.httpMethod || '';
        return aMethod.localeCompare(bMethod);
      },
      sortDirections: ['ascend', 'descend'],
      render: (text) => {
        const found = httpMethods.find(item => item.value === text);
        return found ? found.label : text;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <div className="action-buttons">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEditInterface(record)}
          />
          <Popconfirm
            title="确定要删除此接口吗？"
            onConfirm={() => handleDeleteInterface(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="interface-management-container">
        <div className="interface-management-header">
          <div className="feature-selector">
            <span>功能模块：</span>
            <Select
              value={selectedFeatureId}
              onChange={handleSelectFeature}
              style={{ width: 200 }}
              placeholder="选择功能模块"
              loading={featuresLoading}
            >
              {(features || []).map(feature => (
                <Option key={feature.id} value={feature.id}>
                  {feature.name}
                  {feature.active === false && 
                    <span style={{ color: '#ff4d4f', marginLeft: 8 }}>(已禁用)</span>
                  }
                </Option>
              ))}
            </Select>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddInterface}
            disabled={!selectedFeatureId || selectedFeature?.active === false}
          >
            添加接口
          </Button>
        </div>
        
        {!features.length && (
          <Alert
            message="未找到功能模块"
            description="请先在模拟数据页面创建功能模块，然后再添加接口"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {selectedFeature?.active === false && (
          <Alert
            message="功能模块已禁用"
            description="当前功能模块已被禁用，所有关联接口不会生效。您可以在模拟数据页面启用此功能模块。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 接口列表状态栏 */}
        {filteredInterfaces.length > 0 && !interfacesLoading && (
          <div style={{ 
            marginBottom: 16, 
            padding: '8px 12px', 
            background: '#f8f9fa', 
            borderRadius: '4px',
            fontSize: '13px',
            color: '#666',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>
              当前功能模块：<strong>{selectedFeature?.name}</strong>
            </span>
            <span>
              共 {filteredInterfaces.length} 个接口，每页显示 {tableConfig.pageSize} 个
              {tableConfig.sortField && (
                <span style={{ marginLeft: 8 }}>
                  | 按"{columns.find(col => col.key === tableConfig.sortField)?.title || tableConfig.sortField}"
                  {tableConfig.sortOrder === 'ascend' ? '升序' : '降序'}排列
                </span>
              )}
            </span>
          </div>
        )}

        <div className="interface-list-container">
          <Table
            columns={columns}
            dataSource={filteredInterfaces}
            rowKey="id"
            loading={interfacesLoading}
            onChange={handleTableChange}
            pagination={{
              current: tableConfig.current,
              pageSize: tableConfig.pageSize,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `共 ${total} 个接口，显示第 ${range[0]}-${range[1]} 个`,
              pageSizeOptions: ['10', '20', '50', '100'],
              size: 'default'
            }}
            locale={{ emptyText: '暂无接口配置' }}
            sortDirections={['ascend', 'descend']}
          />
        </div>

        {/* 接口编辑/创建模态框 */}
        <Modal
          title={editingInterface ? '编辑接口' : '添加接口'}
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={handleCancel}
          width={800}
          destroyOnClose
          okText={editingInterface ? '保存' : '创建'}
          cancelText="取消"
          bodyStyle={{ maxHeight: '70vh', overflow: 'auto', padding: '24px' }}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              name: '',
              pattern: '',
              proxyType: 'response',
              statusCode: '200',
              contentType: 'application/json; charset=utf-8',
              responses: [],
              httpMethod: 'ALL',
              targetUrl: '',
              headerItems: [],
              paramMatchers: []
            }}
          >
            {/* 基础信息表单项保持原样 */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <Form.Item
                  name="name"
                  label="接口名称"
                  rules={[{ required: true, message: '请输入接口名称' }]}
                >
                  <Input placeholder="请输入接口名称" />
                </Form.Item>
              </div>
              <div style={{ flex: 1 }}>
                <Form.Item
                  name="pattern"
                  label="URL匹配规则"
                  rules={[
                    { required: true, message: '请输入URL匹配规则' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const proxyType = getFieldValue('proxyType');
                        if (!value) return Promise.resolve();
                        
                        // URL重定向模式下，必须是完整URL
                        if (proxyType === 'url_redirect') {
                          try {
                            new URL(value);
                            return Promise.resolve();
                          } catch (e) {
                            return Promise.reject(new Error('URL重定向模式下，URL匹配规则必须是完整的URL（包括http://或https://）'));
                          }
                        }
                        
                        // 重定向模式下，必须以http://或https://开头
                        if (proxyType === 'redirect') {
                          if (value.startsWith('http://') || value.startsWith('https://')) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('重定向模式下，URL匹配规则必须以http://或https://开头'));
                        }
                        
                        // 响应模式下的验证
                        if (proxyType === 'response') {
                          // 正则表达式验证
                          if (value.startsWith('/') && value.endsWith('/')) {
                            try {
                              new RegExp(value.slice(1, -1));
                              return Promise.resolve();
                            } catch (e) {
                              return Promise.reject(new Error('无效的正则表达式格式'));
                            }
                          }
                          
                          // 通配符验证
                          if (value.includes('*')) {
                            if (/^[a-zA-Z0-9\-_/.*]+$/.test(value)) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('通配符URL格式不正确'));
                          }
                          
                          // 普通路径验证
                          if (/^[a-zA-Z0-9\-_/]+$/.test(value)) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('URL路径格式不正确'));
                        }
                        
                        return Promise.resolve();
                      },
                    }),
                  ]}
                  tooltip={{
                    title: (
                      <>
                        <div>不同处理方式下URL匹配规则要求：</div>
                        <ul style={{margin: '5px 0 0 15px', padding: 0}}>
                          <li><b>模拟响应：</b> 支持路径格式如 /api/users，通配符如 /api/*，正则如 /\/api\/\d+/</li>
                          <li><b>重定向：</b> 必须以http://或https://开头，例如：https://example.com/api</li>
                          <li><b>URL重定向：</b> 必须是完整URL，包括http://或https://，例如：https://example.com/api/users</li>
                        </ul>
                      </>
                    ),
                    overlayStyle: { maxWidth: '450px' }
                  }}
                >
                  <Input 
                    placeholder="根据选择的处理方式输入相应格式的URL" 
                  />
                </Form.Item>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <Form.Item
                  name="proxyType"
                  label="处理方式"
                  rules={[{ required: true, message: '请选择处理方式' }]}
                  tooltip={{
                    title: (
                      <>
                        <div>不同处理方式的规则说明：</div>
                        <ul style={{margin: '5px 0 0 15px', padding: 0}}>
                          <li><b>模拟响应：</b> 返回您定义的响应内容</li>
                          <li><b>重定向：</b> 将请求重定向到其他URL，URL匹配规则必须以http://或https://开头</li>
                          <li><b>URL重定向：</b> 完全匹配URL时重定向，URL匹配规则必须是完整URL</li>
                        </ul>
                      </>
                    ),
                    overlayStyle: { maxWidth: '450px' }
                  }}
                >
                  <Select onChange={(value) => {
                    // 当切换代理类型时，清空pattern字段，并提供不同的placeholder
                    form.setFieldsValue({ pattern: '' });
                    
                    // 为不同的代理类型提供不同的pattern占位符
                    const patternInput = document.querySelector('input[placeholder="根据选择的处理方式输入相应格式的URL"]');
                    if (patternInput) {
                      if (value === 'response') {
                        patternInput.placeholder = "例如：/api/users，/api/users/*，/api\/users\/\d+/";
                      } else if (value === 'redirect') {
                        patternInput.placeholder = "例如：https://example.com/api";
                      } else if (value === 'url_redirect') {
                        patternInput.placeholder = "例如：https://example.com/api/users";
                      }
                    }
                  }}>
                    {proxyTypes.map(item => (
                      <Option key={item.value} value={item.value}>{item.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
              <div style={{ flex: 1 }}>
                <Form.Item
                  name="httpMethod"
                  label="请求方法"
                  rules={[{ required: true, message: '请选择请求方法' }]}
                >
                  <Select>
                    {httpMethods.map(item => (
                      <Option key={item.value} value={item.value}>{item.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            </div>

            {/* 根据proxyType显示不同的表单项 */}
            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.proxyType !== currentValues.proxyType}>
              {({ getFieldValue, setFieldsValue }) => {
                const proxyType = getFieldValue('proxyType');
                
                if (proxyType === 'response') {
                  return (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <Form.Item
                            name="statusCode"
                            label="状态码"
                            rules={[{ required: true, message: '请选择状态码' }]}
                          >
                            <Select>
                              {statusCodes.map(item => (
                                <Option key={item.value} value={item.value}>{item.label}</Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </div>
                        <div style={{ flex: 1 }}>
                          <Form.Item
                            name="contentType"
                            label="内容类型"
                            rules={[{ required: true, message: '请选择内容类型' }]}
                          >
                            <Select>
                              {contentTypes.map(item => (
                                <Option key={item.value} value={item.value}>{item.label}</Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </div>
                      </div>

                      {/* 请求入参匹配设置 */}
                      <Form.Item
                        label="请求入参匹配"
                        tooltip="设置请求参数的匹配条件，只有当请求参数满足条件时才返回对应的响应。支持嵌套属性路径，如：a.b.c"
                      >
                        <Form.List name="paramMatchers">
                          {(fields, { add, remove }) => (
                            <>
                              {fields.map(({ key, name, ...restField }) => (
                                <div key={key} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'paramPath']}
                                    rules={[
                                      { required: true, message: '请输入参数路径' },
                                      {
                                        pattern: /^[a-zA-Z_$][a-zA-Z0-9_$.]*$/,
                                        message: '请输入有效的参数路径，如：userId 或 data.user.id'
                                      }
                                    ]}
                                    style={{ flex: 1, margin: 0 }}
                                  >
                                    <Input placeholder="参数路径（如：userId 或 data.user.id）" />
                                  </Form.Item>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'paramValue']}
                                    rules={[{ required: true, message: '请输入期望值' }]}
                                    style={{ flex: 1, margin: 0 }}
                                  >
                                    <Input placeholder="期望值（如：123 或 admin）" />
                                  </Form.Item>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'matchType']}
                                    style={{ width: 100, margin: 0 }}
                                    initialValue="exact"
                                  >
                                    <Select placeholder="匹配类型">
                                      <Option value="exact">精确匹配</Option>
                                      <Option value="contains">包含</Option>
                                      <Option value="regex">正则</Option>
                                    </Select>
                                  </Form.Item>
                              <Button 
                                    type="text" 
                                    danger 
                                    icon={<DeleteOutlined />}
                                    onClick={() => remove(name)}
                                  />
                                </div>
                              ))}
                              <Button
                                type="dashed"
                                onClick={() => add()}
                                icon={<PlusOutlined />}
                                style={{ width: '100%', marginTop: '8px' }}
                              >
                                添加参数匹配规则
                              </Button>
                              {fields.length > 0 && (
                                <div style={{ 
                                  fontSize: '12px', 
                                  color: '#666', 
                                  marginTop: '8px',
                                  padding: '8px',
                                  backgroundColor: '#f5f5f5',
                                  borderRadius: '4px'
                                }}>
                                  <div><strong>说明：</strong></div>
                                  <div>• <strong>精确匹配</strong>：参数值完全相等</div>
                                  <div>• <strong>包含</strong>：参数值包含指定内容</div>
                                  <div>• <strong>正则</strong>：参数值符合正则表达式</div>
                                  <div>• <strong>嵌套路径</strong>：使用点号分隔，如 data.user.id</div>
                          </div>
                              )}
                            </>
                          )}
                        </Form.List>
                      </Form.Item>

                      {/* 隐藏的表单字段用于存储响应数据 */}
                      <Form.Item 
                        name="responses" 
                        initialValue={[]}
                        hidden
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item name="activeResponseId" hidden>
                        <Input />
                      </Form.Item>

                      {/* 使用新的合并组件 */}
                      <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) => {
                          let responses = getFieldValue('responses') || [];
                          const activeResponseId = getFieldValue('activeResponseId');
                          
                          // 确保是数组
                          if (!Array.isArray(responses)) {
                            try {
                              if (typeof responses === 'string') {
                                responses = JSON.parse(responses);
                }
                            } catch (e) {
                              responses = [];
                            }
                          }
                          
                          return (
                            <ResponseContentEditor
                              form={form}
                              responses={responses}
                              activeResponseId={activeResponseId}
                              onPreview={handlePreview}
                            />
                          );
                        }}
                      </Form.Item>
                    </>
                  );
                } else if (proxyType === 'redirect' || proxyType === 'url_redirect') {
                  return (
                    <>
                      <Form.Item
                        name="targetUrl"
                        label="重定向目标URL"
                        rules={[
                          { required: true, message: '请输入重定向目标URL' },
                          { 
                            validator(_, value) {
                              if (!value) return Promise.resolve();
                              try {
                                new URL(value);
                                return Promise.resolve();
                              } catch (e) {
                                return Promise.reject(new Error('请输入有效的URL格式（包括http://或https://）'));
                              }
                            }
                          }
                        ]}
                        tooltip="重定向的目标URL，必须是完整的URL格式"
                      >
                        <Input 
                          placeholder="例如：https://api.example.com/users"
                        />
                      </Form.Item>
                      
                      {/* 自定义请求头设置 */}
                      <Form.Item label="自定义请求头">
                        <Form.List name="headerItems">
                          {(fields, { add, remove }) => (
                            <>
                              {fields.map(({ key, name, ...restField }) => (
                                <div key={key} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'headerName']}
                                    rules={[{ required: true, message: '请输入请求头名称' }]}
                                    style={{ flex: 1, margin: 0 }}
                                    >
                                    <Input placeholder="请求头名称（如：Authorization）" />
                                    </Form.Item>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'headerValue']}
                                    rules={[{ required: true, message: '请输入请求头值' }]}
                                    style={{ flex: 1, margin: 0 }}
                                    >
                                    <Input placeholder="请求头值（如：Bearer token123）" />
                                    </Form.Item>
                                    <Button 
                                      type="text" 
                                    danger 
                                    icon={<DeleteOutlined />}
                                      onClick={() => remove(name)}
                                    />
                                </div>
                              ))}
                                <Button 
                                  type="dashed" 
                                  onClick={() => add()} 
                                  icon={<PlusOutlined />}
                                style={{ width: '100%', marginTop: '8px' }}
                                >
                                  添加请求头
                                </Button>
                            </>
                          )}
                        </Form.List>
                      </Form.Item>
                    </>
                  );
                }
                
                return null;
              }}
            </Form.Item>
          </Form>
        </Modal>
                    
        {/* 使用拆分后的预览模态框组件 */}
        <PreviewModal
          visible={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          previewContent={previewContent}
        />
      </div>
    </AppLayout>
  );
};

export default InterfaceManagement; 