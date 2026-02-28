/**
 * InterfaceManagementV2.js - 接口管理页面
 */

import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { 
  Table, Button, Modal, Form, Input, Select, message, Switch, 
  Popconfirm, Alert, Space, Card, Badge, Tooltip, Row, Col,
  Popover, Checkbox, Tag, Input as AntInput, Radio, Drawer, Dropdown, Menu, Collapse
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  FileTextOutlined, PlusCircleOutlined, SettingOutlined,
  SearchOutlined, FilterOutlined, ReloadOutlined, DownOutlined, QuestionCircleOutlined, CopyOutlined
} from '@ant-design/icons';
// 移除 react-resizable，改用原生实现
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
import DataManagementModal from '../components/interface-management/DataManagementModal';
import { DataManagementDrawer } from '../components/interface-management';

const { Option } = Select;
const { Search } = AntInput;

// 列配置数据结构
const COLUMN_CONFIG = [
  { key: 'active', title: '状态', required: true },
  { key: 'name', title: '名称', required: true },
  { key: 'group', title: '分组', required: false },
  { key: 'urlPattern', title: 'URL匹配规则', required: false },
  { key: 'proxyType', title: '处理方式', required: false },
  { key: 'currentResponse', title: '当前响应', required: false },
  { key: 'responseDelay', title: '延迟(毫秒)', required: false },
  { key: 'httpStatus', title: '状态码', required: false },
  { key: 'contentType', title: '内容类型', required: false },
  { key: 'targetUrl', title: '目标URL', required: false },
  { key: 'customHeaders', title: '自定义头', required: false },
  { key: 'paramMatchers', title: '参数匹配', required: false },
  { key: 'httpMethod', title: '请求方法', required: false },
  { key: 'action', title: '操作', required: true }
];

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
  
  // 分组状态
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupActionLoading, setGroupActionLoading] = useState(false);
  
  // 模态框状态
  const [modalVisible, setModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);
  const [dataModalVisible, setDataModalVisible] = useState(false);
  const [dataModalRecord, setDataModalRecord] = useState(null);
  
  // 列配置状态
  const [columnConfigVisible, setColumnConfigVisible] = useState(false);

  // 编辑状态
  const [editingInterface, setEditingInterface] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [currentResponseId, setCurrentResponseId] = useState(null);
  
  // 搜索状态
  const [searchValue, setSearchValue] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  
  // 数据管理显示模式
  const [displayMode, setDisplayMode] = useState('modal');
  
  // 接口表单显示模式
  const [interfaceFormDisplayMode, setInterfaceFormDisplayMode] = useState('modal');
  
  // 表单实例
  const [form] = Form.useForm();

  // 表格配置状态（支持缓存）
  const [tableConfig, setTableConfig] = useState(() => {
    const cached = localStorage.getItem('interface-table-config');
    const defaultVisibleColumns = COLUMN_CONFIG.map(col => col.key);
    const defaultConfig = {
      sortOrder: null,
      sortField: null,
      pageSize: 10,
      current: 1,
      visibleColumns: defaultVisibleColumns,
      columnWidths: {
        currentResponse: 180
      }
    };
    
    if (cached) {
      const parsedConfig = JSON.parse(cached);
      // 确保 columnWidths 存在
      if (!parsedConfig.columnWidths) {
        parsedConfig.columnWidths = { currentResponse: 180 };
      }
      return parsedConfig;
    }
    
    return defaultConfig;
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

  // 监听数据管理显示模式变化
  useEffect(() => {
    // 初始化时从 localStorage 读取配置
    const savedMode = localStorage.getItem('dataManagementDisplayMode');
    if (savedMode) {
      setDisplayMode(savedMode);
    }

    // 监听 storage 事件，实现设置立即生效
    const handleStorageChange = () => {
      const newMode = localStorage.getItem('dataManagementDisplayMode');
      if (newMode) {
        setDisplayMode(newMode);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 监听接口表单显示模式变化
  useEffect(() => {
    // 初始化时从 localStorage 读取配置
    const savedMode = localStorage.getItem('interfaceFormDisplayMode');
    if (savedMode) {
      setInterfaceFormDisplayMode(savedMode);
    }

    // 监听 storage 事件，实现设置立即生效
    const handleStorageChange = () => {
      const newMode = localStorage.getItem('interfaceFormDisplayMode');
      if (newMode) {
        setInterfaceFormDisplayMode(newMode);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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
        console.log('接口分组信息:', processedInterfaces.map(item => ({ id: item.id, name: item.name, group: item.group })));
        
        // 提取并更新分组列表
        updateGroups(processedInterfaces);
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
  
  // 提取并更新分组列表
  const updateGroups = (interfaces) => {
    // 从接口列表中提取所有分组
    const groupSet = new Set();
    interfaces.forEach(item => {
      if (item.group) {
        groupSet.add(item.group);
      }
    });
    
    // 转换为数组并排序
    const groupArray = Array.from(groupSet).sort();
    setGroups(groupArray);
    
    // 如果当前选中的分组不在列表中，重置选中的分组
    if (selectedGroup && !groupArray.includes(selectedGroup)) {
      setSelectedGroup(null);
    }
  };
  
  // 根据分组和搜索关键词筛选接口
  const getFilteredInterfaces = () => {
    // 首先按功能模块筛选
    let featureFiltered = interfaces.filter(item => 
      !selectedFeatureId || item.featureId === selectedFeatureId
    );
    
    // 然后按分组筛选
    if (selectedGroup) {
      featureFiltered = featureFiltered.filter(item => item.group === selectedGroup);
    }
    
    // 最后按搜索关键词筛选
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      return featureFiltered.filter(item => 
        (item.name && item.name.toLowerCase().includes(searchLower)) || 
        (item.urlPattern && item.urlPattern.toLowerCase().includes(searchLower))
      );
    }
    
    return featureFiltered;
  };

  const handleAddInterface = () => {
    if (!selectedFeatureId) {
      message.warning('请先选择一个功能模块');
      return;
    }
    form.resetFields();
    setIsDuplicateMode(false);
    
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
      paramMatchers: [], // 初始化为空数组
      group: undefined // 确保分组字段为undefined，而不是空字符串
    });
    
    setCurrentResponseId(defaultResponseId);
    setEditingInterface(null);
    setModalVisible(true);
  };

  const handleEditInterface = (record) => {
    if (!record) {
      message.warning('接口数据不完整，无法编辑');
      return;
    }
    
    console.log('编辑接口:', record);
    
    // 重置表单
    form.resetFields();
    setIsDuplicateMode(false);
    
    // 处理响应数据
    let responses = [];
    let activeResponseId = '';
    
    if (record.responses && Array.isArray(record.responses) && record.responses.length > 0) {
      responses = record.responses;
      activeResponseId = record.activeResponseId || responses[0].id;
    } else if (record.responseContent) {
      // 兼容旧数据格式，创建默认响应
      const defaultResponseId = generateResponseId();
      responses = [{
        id: defaultResponseId,
        name: '默认响应',
        description: '',
        content: record.responseContent
      }];
      activeResponseId = defaultResponseId;
    }
    
    // 处理自定义请求头
    let headerItems = [];
    if (record.headers && typeof record.headers === 'object') {
      headerItems = Object.entries(record.headers).map(([headerName, headerValue]) => ({
        headerName,
        headerValue
      }));
    }
    
    // 处理分组值，确保它是字符串而不是数组
    let groupValue = record.group;
    if (Array.isArray(groupValue)) {
      groupValue = groupValue.length > 0 ? groupValue[0] : undefined;
    }
    
    // 设置表单值
    form.setFieldsValue({
      name: record.name,
      group: groupValue || undefined, // 使用undefined而不是空字符串
      pattern: record.urlPattern,
      proxyType: record.proxyType || 'response',
      statusCode: (record.httpStatus || record.statusCode || 200).toString(),
      contentType: record.contentType || 'application/json; charset=utf-8',
      responses,
      activeResponseId,
      httpMethod: record.httpMethod || record.method || 'ALL',
      targetUrl: record.targetUrl || '',
      headerItems,
      paramMatchers: record.paramMatchers || [],
      responseDelay: record.responseDelay ? record.responseDelay.toString() : '0'
    });
    
    console.log('编辑接口时设置的分组值:', groupValue);
    
    setCurrentResponseId(activeResponseId);
    setEditingInterface(record);
    setModalVisible(true);
  };

  // 复制新增接口
  const handleDuplicate = (record) => {
    if (!selectedFeatureId) {
      message.warning('请先选择一个功能模块');
      return;
    }
    if (!record) {
      message.warning('接口数据不完整，无法复制');
      return;
    }

    form.resetFields();

    // 深拷贝源数据
    const source = JSON.parse(JSON.stringify(record));

    // 处理响应数据
    let responses = [];
    let activeResponseId = '';

    if (Array.isArray(source.responses) && source.responses.length > 0) {
      // 为每条响应生成新的ID，并重映射activeResponseId
      const idMap = new Map();
      responses = source.responses.map((resp) => {
        const newId = generateResponseId();
        idMap.set(resp.id, newId);
        return {
          id: newId,
          name: resp.name || '未命名响应',
          description: resp.description || '',
          content: resp.content || '{}'
        };
      });
      const mapped = idMap.get(source.activeResponseId) || responses[0]?.id;
      activeResponseId = mapped || '';
    } else if (source.responseContent) {
      // 兼容旧数据格式
      const defaultResponseId = generateResponseId();
      responses = [{
        id: defaultResponseId,
        name: '默认响应',
        description: '',
        content: source.responseContent
      }];
      activeResponseId = defaultResponseId;
    }

    // 处理自定义请求头 -> 表单需要的数组结构
    let headerItems = [];
    if (source.headers && typeof source.headers === 'object') {
      headerItems = Object.entries(source.headers).map(([headerName, headerValue]) => ({
        headerName,
        headerValue
      }));
    }

    // 分组值保证为字符串
    let groupValue = source.group;
    if (Array.isArray(groupValue)) {
      groupValue = groupValue.length > 0 ? groupValue[0] : undefined;
    }

    // 设定表单初值
    form.setFieldsValue({
      name: `${source.name || '未命名接口'} - 副本`,
      group: groupValue || undefined,
      pattern: source.urlPattern,
      proxyType: source.proxyType || 'response',
      statusCode: (source.httpStatus || source.statusCode || 200).toString(),
      contentType: source.contentType || 'application/json; charset=utf-8',
      responses,
      activeResponseId,
      httpMethod: source.httpMethod || source.method || 'ALL',
      targetUrl: source.targetUrl || '',
      headerItems,
      paramMatchers: Array.isArray(source.paramMatchers) ? source.paramMatchers : [],
      responseDelay: source.responseDelay ? String(source.responseDelay) : '0'
    });

    setCurrentResponseId(activeResponseId || null);
    setEditingInterface(null); // 新增模式
    setIsDuplicateMode(true);
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
      const response = await axios.patch(`/cgi-bin/interfaces/${id}`, {
        active: !currentActive
      });
      if (response.data && response.data.code === 0) {
        message.success(`接口${!currentActive ? '启用' : '禁用'}成功`);
        fetchInterfaces();
        
        // 刷新规则缓存
        refreshCacheAfterUpdate();
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
      // 表单验证 - 先验证所有字段，再获取所有字段值（包括折叠的）
      await form.validateFields();
      const values = form.getFieldsValue(true); // true表示获取所有字段，包括未渲染的
      console.log('表单提交数据:', values);
      
      // 处理自定义请求头
      let headers = {};
      if (values.headerItems && Array.isArray(values.headerItems)) {
        values.headerItems.forEach(item => {
          if (item && item.headerName) {
            headers[item.headerName] = item.headerValue;
          }
        });
      }
      
      // 处理分组值，确保它是字符串而不是数组
      let groupValue = values.group;
      if (Array.isArray(groupValue)) {
        groupValue = groupValue.length > 0 ? groupValue[0] : '';
      }
      
      // 构建接口数据 - 在编辑模式下，确保关键字段不丢失
      const interfaceData = {
        name: values.name || (editingInterface ? editingInterface.name : ''),
        group: groupValue || (editingInterface ? editingInterface.group : '') || '', // 确保group不为undefined
        urlPattern: values.pattern || (editingInterface ? editingInterface.urlPattern : ''),
        proxyType: values.proxyType || (editingInterface ? editingInterface.proxyType : 'response'),
        featureId: selectedFeatureId,
        responses: values.responses || (editingInterface ? editingInterface.responses : []),
        activeResponseId: values.activeResponseId || (editingInterface ? editingInterface.activeResponseId : null),
        httpStatus: parseInt(values.statusCode, 10) || (editingInterface ? editingInterface.httpStatus : 200), // 转换为数字
        contentType: values.contentType || (editingInterface ? editingInterface.contentType : 'application/json; charset=utf-8'),
        responseDelay: parseInt(values.responseDelay, 10) || (editingInterface ? editingInterface.responseDelay : 0) || 0,
        httpMethod: values.httpMethod || (editingInterface ? editingInterface.httpMethod : 'ALL'),
        active: true
      };
      
      console.log('提交的分组值:', groupValue);
      
      // 根据代理类型添加不同字段
      if (values.proxyType === 'redirect' || values.proxyType === 'url_redirect') {
        interfaceData.targetUrl = values.targetUrl;
        interfaceData.headers = headers;
      }
      
      // 添加参数匹配规则（始终发送，空数组用于清空后端旧值）
      const filteredParamMatchers = Array.isArray(values.paramMatchers)
        ? values.paramMatchers.filter(matcher => matcher && matcher.paramPath && matcher.paramValue)
        : [];
      interfaceData.paramMatchers = filteredParamMatchers;
      
      console.log('提交接口数据:', interfaceData);
      
      if (editingInterface) {
        // 更新接口
        const response = await axios.put(`/cgi-bin/interfaces?id=${editingInterface.id}`, interfaceData);
        if (response.data && response.data.code === 0) {
          message.success('接口更新成功');
          setModalVisible(false);
          fetchInterfaces();
          
          // 刷新规则缓存
          refreshCacheAfterUpdate();
        } else {
          throw new Error(response.data?.message || '接口更新失败');
        }
      } else {
        // 创建接口
        const response = await axios.post('/cgi-bin/interfaces', interfaceData);
        if (response.data && response.data.code === 0) {
          message.success('接口创建成功');
          console.log('接口创建成功，返回数据:', response.data);
          console.log('返回的接口数据中的分组信息:', response.data.data?.group);
          setModalVisible(false);
          fetchInterfaces();
          
          // 刷新规则缓存
          refreshCacheAfterUpdate();
        } else {
          throw new Error(response.data?.message || '接口创建失败');
        }
      }
    } catch (error) {
      console.error('表单提交失败:', error);
      message.error(error.response?.data?.message || error.message || '操作失败');
    }
  };

  const handleCancel = () => {
    setModalVisible(false);
    setIsDuplicateMode(false);
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

  const filteredInterfaces = getFilteredInterfaces();

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

  // 处理列配置变更
  const handleColumnConfigChange = (checkedValues) => {
    // 确保必须显示的列始终被选中
    const requiredColumns = COLUMN_CONFIG.filter(col => col.required).map(col => col.key);
    const finalColumns = [...new Set([...requiredColumns, ...checkedValues])];
    
    saveTableConfig({ visibleColumns: finalColumns });
  };

  // 全选列配置
  const handleSelectAllColumns = () => {
    const allColumns = COLUMN_CONFIG.map(col => col.key);
    saveTableConfig({ visibleColumns: allColumns });
  };

  // 重置列配置
  const handleResetColumns = () => {
    const defaultColumns = COLUMN_CONFIG.map(col => col.key);
    saveTableConfig({ 
      visibleColumns: defaultColumns,
      columnWidths: {
        active: 80,
        name: 150,
        group: 120,
        urlPattern: 250,
        proxyType: 120,
        currentResponse: 180,
        responseDelay: 100,
        httpStatus: 100,
        contentType: 120,
        targetUrl: 200,
        customHeaders: 100
      }
    });
  };

  // 切换列配置面板显示
  const handleColumnConfigToggle = (visible) => {
    setColumnConfigVisible(visible);
  };

  // 搜索处理
  const handleSearch = (value) => {
    setSearchValue(value);
  };
  
  // 清除搜索
  const handleClearSearch = () => {
    setSearchValue('');
  };
  
  // 表格行选择处理
  const onSelectChange = (selectedKeys) => {
    setSelectedRowKeys(selectedKeys);
  };
  


  // 刷新数据
  const refreshData = () => {
    fetchInterfaces();
    message.success('数据已刷新');
  };

  // 可调整大小的表头组件（使用原生实现）
  const ResizableTitle = (props) => {
    const { onResize, width, columnKey, ...restProps } = props;

    if (!width || !onResize) {
      return <th {...restProps} />;
    }

    const handleMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const startX = e.clientX;
      const startWidth = width;
      let currentWidth = startWidth;

      const handleMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        currentWidth = Math.max(50, startWidth + deltaX); // 最小宽度 50px
        
        // 实时更新列宽（不保存到 localStorage）
        const newColumnWidths = {
          ...tableConfig.columnWidths,
          [columnKey]: currentWidth
        };
        setTableConfig(prev => ({
          ...prev,
          columnWidths: newColumnWidths
        }));
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        // 拖动结束后保存到 localStorage
        onResize(columnKey, currentWidth);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    return (
      <th {...restProps} style={{ ...restProps.style, position: 'relative' }}>
        {restProps.children}
        <span
          className="column-resize-handle"
          onMouseDown={handleMouseDown}
          onClick={(e) => e.stopPropagation()}
        />
      </th>
    );
  };

  // 处理列宽调整
  const handleResize = (columnKey, newWidth) => {
    const newColumnWidths = {
      ...tableConfig.columnWidths,
      [columnKey]: newWidth
    };
    saveTableConfig({ columnWidths: newColumnWidths });
  };

  // 批量操作接口状态
  const handleBatchOperation = async (active) => {
    if (!selectedRowKeys || selectedRowKeys.length === 0) {
      message.warning('请先选择要操作的接口');
      return;
    }

    try {
      setLoading(true);
      const operations = selectedRowKeys.map(id => 
        axios.patch(`/cgi-bin/interfaces/${id}`, { active })
      );
      
      await Promise.all(operations);
      message.success(`已${active ? '启用' : '禁用'} ${selectedRowKeys.length} 个接口`);
      setSelectedRowKeys([]);
      fetchInterfaces();
      
      // 刷新规则缓存
      refreshCacheAfterUpdate();
    } catch (error) {
      console.error('批量操作失败:', error);
      message.error('批量操作失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 定义所有可用的列
  const allColumns = [
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      width: tableConfig.columnWidths?.active || 80,
      onHeaderCell: (column) => ({
        width: column.width,
        columnKey: 'active',
        onResize: handleResize,
      }),
      render: (active, record) => (
        <Switch
          checked={active !== false}
          onChange={(checked) => handleToggleActive(record.id, active !== false)}
          size="small"
        />
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: tableConfig.columnWidths?.name || 150,
      onHeaderCell: (column) => ({
        width: column.width,
        columnKey: 'name',
        onResize: handleResize,
      }),
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text) => <span className="interface-name">{text}</span>,
    },
    {
      title: '分组',
      dataIndex: 'group',
      key: 'group',
      width: tableConfig.columnWidths?.group || 120,
      onHeaderCell: (column) => ({
        width: column.width,
        columnKey: 'group',
        onResize: handleResize,
      }),
      sorter: (a, b) => {
        const groupA = a.group || '';
        const groupB = b.group || '';
        return groupA.localeCompare(groupB);
      },
      render: (group) => {
        if (!group) {
          return <span style={{ color: '#999', fontStyle: 'italic' }}>未分组</span>;
        }
        return (
          <Tag color="blue" style={{ cursor: 'pointer' }} onClick={() => setSelectedGroup(group)}>
            {group}
          </Tag>
        );
      },
    },
    {
      title: 'URL匹配规则',
      dataIndex: 'urlPattern',
      key: 'urlPattern',
      width: tableConfig.columnWidths?.urlPattern || 250,
      onHeaderCell: (column) => ({
        width: column.width,
        columnKey: 'urlPattern',
        onResize: handleResize,
      }),
      ellipsis: true,
      render: (text) => <span className="url-pattern">{text}</span>,
    },
    {
      title: '处理方式',
      dataIndex: 'proxyType',
      key: 'proxyType',
      width: tableConfig.columnWidths?.proxyType || 120,
      onHeaderCell: (column) => ({
        width: column.width,
        columnKey: 'proxyType',
        onResize: handleResize,
      }),
      render: (text) => {
        const proxyType = proxyTypes.find(item => item.value === text);
        return (
          <Badge 
            color={proxyType?.color || '#999'} 
            text={proxyType?.label || text} 
          />
        );
      },
    },
    {
      title: '当前响应',
      dataIndex: 'activeResponseId',
      key: 'currentResponse',
      width: tableConfig.columnWidths?.currentResponse || 180,
      className: 'current-response-column',
      onHeaderCell: (column) => ({
        width: column.width,
        columnKey: 'currentResponse',
        onResize: handleResize,
      }),
      onCell: () => ({
        className: 'current-response-cell',
      }),
      render: (activeResponseId, record) => {
        // 如果没有响应数据，返回空
        if (!record.responses || !Array.isArray(record.responses) || record.responses.length === 0) {
          return <span className="no-response">无响应数据</span>;
        }
        
        // 找到当前激活的响应
        const activeResponse = record.responses.find(resp => resp.id === activeResponseId);
        
        // 如果没有找到激活的响应，使用第一个
        const currentResponse = activeResponse || record.responses[0];
        
        return (
          <Select
            value={activeResponseId || record.responses[0]?.id}
            style={{ width: '100%' }}
            onChange={(value) => handleResponseSwitch(record.id, value)}
            disabled={record.proxyType !== 'response'}
            getPopupContainer={(trigger) => trigger.parentNode}
          >
            {record.responses.map(resp => (
              <Option key={resp.id} value={resp.id}>
                {resp.name}
              </Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: '延迟(毫秒)',
      dataIndex: 'responseDelay',
      key: 'responseDelay',
      width: tableConfig.columnWidths?.responseDelay || 100,
      onHeaderCell: (column) => ({
        width: column.width,
        columnKey: 'responseDelay',
        onResize: handleResize,
      }),
      sorter: (a, b) => (a.responseDelay || 0) - (b.responseDelay || 0),
      render: (delay) => {
        const delayValue = parseInt(delay, 10) || 0;
        return (
          <span className={delayValue > 0 ? 'delay-active' : 'delay-inactive'}>
            {delayValue > 0 ? delayValue : '无延迟'}
          </span>
        );
      },
    },
    {
      title: '状态码',
      dataIndex: 'httpStatus',
      key: 'httpStatus',
      width: tableConfig.columnWidths?.httpStatus || 100,
      onHeaderCell: (column) => ({
        width: column.width,
        columnKey: 'httpStatus',
        onResize: handleResize,
      }),
      render: (status) => {
        const statusCode = status || 200;
        let statusClass = 'status-success';
        if (statusCode >= 400) {
          statusClass = 'status-error';
        } else if (statusCode >= 300) {
          statusClass = 'status-warning';
        }
        return <span className={statusClass}>{statusCode}</span>;
      },
    },
    {
      title: '内容类型',
      dataIndex: 'contentType',
      key: 'contentType',
      width: tableConfig.columnWidths?.contentType || 120,
      onHeaderCell: (column) => ({
        width: column.width,
        columnKey: 'contentType',
        onResize: handleResize,
      }),
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
      width: tableConfig.columnWidths?.targetUrl || 200,
      onHeaderCell: (column) => ({
        width: column.width,
        columnKey: 'targetUrl',
        onResize: handleResize,
      }),
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
      width: tableConfig.columnWidths?.customHeaders || 100,
      onHeaderCell: (column) => ({
        width: column.width,
        columnKey: 'customHeaders',
        onResize: handleResize,
      }),
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
      width: 220,
      render: (_, record) => (
        <div className="action-buttons">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEditInterface(record)}
          />
          {record.proxyType === 'response' && (
            <Tooltip title="数据管理">
              <Button 
                type="text" 
                icon={<FileTextOutlined />} 
                onClick={() => { setDataModalRecord(record); setDataModalVisible(true); }}
              />
            </Tooltip>
          )}
          <Tooltip title="复制新增">
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              onClick={() => handleDuplicate(record)}
            />
          </Tooltip>
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

  // 根据配置过滤可见列
  const visibleColumns = tableConfig.visibleColumns || COLUMN_CONFIG.map(col => col.key);
  const columns = allColumns.filter(col => visibleColumns.includes(col.key));

  // 分组筛选和操作区域
  const handleBatchToggleActive = async (active) => {
    try {
      setGroupActionLoading(true);
      const response = await axios.patch(`/cgi-bin/interfaces?active=${active}`, {
        featureId: selectedFeatureId,
        group: selectedGroup
      });
      if (response.data && response.data.code === 0) {
        message.success(`分组 "${selectedGroup}" 中的接口已成功${active ? '启用' : '禁用'}`);
        fetchInterfaces();
      } else {
        throw new Error(response.data?.message || '批量操作失败');
      }
    } catch (error) {
      console.error('批量操作失败:', error);
      message.error(error.response?.data?.message || error.message || '批量操作失败');
    } finally {
      setGroupActionLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="interface-management-container">
        {/* 警告信息置顶显示 */}
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
        
        <Card className="interface-control-panel">
          <div className="control-panel-header">
            <div className="control-left">
              <div className="feature-selector">
                <span>功能模块：</span>
                <Select
                  value={selectedFeatureId}
                  onChange={handleSelectFeature}
                  style={{ width: 200 }}
                  placeholder="选择功能模块"
                  loading={featuresLoading}
                  dropdownMatchSelectWidth={false}
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
              
              <Search
                placeholder="搜索接口名称或URL"
                onSearch={handleSearch}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{ width: 220, marginLeft: 12 }}
                enterButton={<SearchOutlined />}
                allowClear
              />
              
              <Dropdown
                overlay={
                  <Menu
                    selectedKeys={selectedGroup ? [selectedGroup] : ['ALL_GROUPS']}
                    onClick={({ key }) => {
                      if (key === 'ALL_GROUPS') {
                        setSelectedGroup(null);
                      } else {
                        setSelectedGroup(key === selectedGroup ? null : key);
                      }
                    }}
                  >
                    <Menu.Item key="ALL_GROUPS">全部分组</Menu.Item>
                    {groups.map(group => (
                      <Menu.Item key={group}>
                        {group} ({interfaces.filter(item => item.group === group).length})
                      </Menu.Item>
                    ))}
                  </Menu>
                }
                trigger={['click']}
                disabled={groups.length === 0}
              >
                <Button style={{ marginLeft: 12 }} icon={<FilterOutlined />}>
                  {selectedGroup ? `分组: ${selectedGroup}` : '分组筛选'}
                  <DownOutlined />
                </Button>
              </Dropdown>
            </div>
            
            <div className="control-right">
              <Space>
                <Tooltip title="刷新数据">
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={refreshData}
                    loading={interfacesLoading}
                  />
                </Tooltip>

                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddInterface}
                  disabled={!selectedFeatureId || selectedFeature?.active === false}
                >
                  添加接口
                </Button>
              </Space>
            </div>
          </div>
          
          {/* 统计和批量操作行 */}
          <div className="control-panel-stats">
            <div className="stats-left">
              <Space size="large">
                {selectedGroup && (
                  <span className="stat-item">
                    <span className="stat-label">当前分组：</span>
                    <Tag color="blue">{selectedGroup}</Tag>
                  </span>
                )}
                
                <span className="stat-item">
                  {searchValue ? (
                    <Badge 
                      count={`搜索"${searchValue}" - ${filteredInterfaces.length}个结果`} 
                      style={{ backgroundColor: '#108ee9' }} 
                    />
                  ) : (
                    <Badge 
                      count={`共 ${filteredInterfaces.length} 个接口`} 
                      style={{ backgroundColor: '#52c41a' }} 
                    />
                  )}
                </span>
              </Space>
            </div>
            
            <div className="stats-right">
              {selectedRowKeys.length > 0 && (
                <Space>
                  <span className="selected-count">
                    已选择 {selectedRowKeys.length} 项
                  </span>
                  <Popconfirm
                    title="确定要批量启用选中的接口吗？"
                    onConfirm={() => handleBatchOperation(true)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button size="small" type="primary">批量启用</Button>
                  </Popconfirm>
                  <Popconfirm
                    title="确定要批量禁用选中的接口吗？"
                    onConfirm={() => handleBatchOperation(false)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button size="small" danger>批量禁用</Button>
                  </Popconfirm>
                </Space>
              )}
              
              {selectedGroup && (
                <Space style={{ marginLeft: selectedRowKeys.length > 0 ? 16 : 0 }}>
                  <Popconfirm
                    title={`确定要启用分组 "${selectedGroup}" 中的所有接口吗？`}
                    onConfirm={() => handleBatchToggleActive(true)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button 
                      type="primary" 
                      size="small"
                      loading={groupActionLoading}
                    >
                      分组启用
                    </Button>
                  </Popconfirm>
                  <Popconfirm
                    title={`确定要禁用分组 "${selectedGroup}" 中的所有接口吗？`}
                    onConfirm={() => handleBatchToggleActive(false)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button 
                      danger 
                      size="small"
                      loading={groupActionLoading}
                    >
                      分组禁用
                    </Button>
                  </Popconfirm>
                </Space>
              )}
              
              {/* 列设置按钮 */}
              <Popover
                title="自定义显示列"
                trigger="click"
                open={columnConfigVisible}
                onOpenChange={handleColumnConfigToggle}
                content={
                  <div style={{ width: 280 }}>
                    <div style={{ marginBottom: 12 }}>
                      <Space>
                        <Button size="small" onClick={handleSelectAllColumns}>
                          全选
                        </Button>
                        <Button size="small" onClick={handleResetColumns}>
                          重置
                        </Button>
                      </Space>
                    </div>
                    <Checkbox.Group
                      value={tableConfig.visibleColumns || COLUMN_CONFIG.map(col => col.key)}
                      onChange={handleColumnConfigChange}
                      style={{ width: '100%' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {COLUMN_CONFIG.map(col => (
                          <Checkbox 
                            key={col.key} 
                            value={col.key}
                            disabled={col.required}
                            style={{ 
                              width: '100%',
                              color: col.required ? '#999' : undefined 
                            }}
                          >
                            {col.title}
                            {col.required && (
                              <span style={{ color: '#999', fontSize: '12px', marginLeft: 4 }}>
                                (必须)
                              </span>
                            )}
                          </Checkbox>
                        ))}
                      </div>
                    </Checkbox.Group>
                  </div>
                }
              >
                <Tooltip title="自定义表格显示列">
                  <Button 
                    icon={<SettingOutlined />} 
                    type="text"
                    size="small"
                    className="inline-column-settings-btn"
                    style={{ marginLeft: (selectedRowKeys.length > 0 || selectedGroup) ? 16 : 0 }}
                  >
                    列设置
                  </Button>
                </Tooltip>
              </Popover>
            </div>
          </div>
        </Card>
        
        <Card className="list-container-card" bordered={false} bodyStyle={{ padding: 0 }}>
          <div className="interface-list-container">
            <Table
              columns={columns}
              dataSource={filteredInterfaces}
              rowKey="id"
              loading={interfacesLoading}
              onChange={handleTableChange}
              rowSelection={{
                selectedRowKeys,
                onChange: onSelectChange,
              }}
              components={{
                header: {
                  cell: ResizableTitle,
                },
              }}
              size="middle"
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
              className="interface-table"
            />
          </div>
        </Card>

        {/* 接口编辑/创建模态框/抽屉 */}
        {interfaceFormDisplayMode === 'drawer' ? (
          <Drawer
            title={
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 600, 
                color: '#262626',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>{editingInterface ? '编辑接口' : (isDuplicateMode ? '复制新增接口' : '添加接口')}</span>
                <Badge 
                  count="配置向导" 
                  style={{ 
                    backgroundColor: '#f0f9ff', 
                    color: '#1677ff',
                    fontSize: '11px',
                    fontWeight: 'normal'
                  }} 
                />
              </div>
            }
            placement="right"
            width={1040}
            open={modalVisible}
            onClose={handleCancel}
            destroyOnClose
            bodyStyle={{ 
              padding: '0',
              background: '#fafafa'
            }}
            footer={
              <div style={{ textAlign: 'right' }}>
                <Space>
                  <Button onClick={handleCancel}>取消</Button>
                  <Button type="primary" onClick={handleSubmit}>
                    {editingInterface ? '保存' : '创建'}
                  </Button>
                </Space>
              </div>
            }
            className="interface-drawer"
          >
            <div style={{ padding: '24px' }}>
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  name: '',
                  group: '',
                  pattern: '',
                  proxyType: 'response',
                  statusCode: '200',
                  contentType: 'application/json; charset=utf-8',
                  responses: [],
                  httpMethod: 'ALL',
                  targetUrl: '',
                  headerItems: [],
                  paramMatchers: [],
                  responseDelay: '0'
                }}
              >
              <Collapse 
                defaultActiveKey={
                  editingInterface && editingInterface.proxyType === 'response'
                    ? ['3'] // mock代理场景：只展开第3步（高级配置）
                    : ['1', '2', '3'] // 其他场景：展开所有步骤
                }
                style={{ marginBottom: '16px' }}
                ghost
              >
                {/* 第一步：基础信息 */}
                <Collapse.Panel 
                  header={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge count="1" style={{ backgroundColor: '#1677ff' }} />
                      <span>基础信息</span>
                    </div>
                  }
                  key="1"
                >
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
                  name="group"
                  label="分组"
                  tooltip="为接口设置分组，便于管理和批量操作"
                >
                  <Select
                    placeholder="选择或创建分组"
                    showSearch
                    allowClear
                    style={{ width: '100%' }}
                    mode="tags"
                    maxTagCount="responsive"
                    maxTagTextLength={10}
                    onChange={(value) => {
                      // 如果值是数组（tags模式），只取第一个元素
                      if (Array.isArray(value) && value.length > 0) {
                        // 如果第一个元素是空字符串，则设置为undefined
                        const groupValue = value[0] === '' ? undefined : value[0];
                        form.setFieldsValue({ group: groupValue });
                      }
                    }}
                    onInputKeyDown={(e) => {
                      // 防止回车键提交表单
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                      }
                    }}
                  >
                    {Array.from(new Set(interfaces.map(item => item.group).filter(Boolean))).map(group => (
                      <Option key={group} value={group}>{group}</Option>
                    ))}
                  </Select>
                </Form.Item>
                </div>
                </div>
                </Collapse.Panel>

                {/* 第二步：URL配置 */}
                <Collapse.Panel 
                  header={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge count="2" style={{ backgroundColor: '#1677ff' }} />
                      <span>URL配置</span>
                    </div>
                  }
                  key="2"
                >
                <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
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
                        patternInput.placeholder = "例如：/api/users，/api/users/*，/api\\/users\\/\\d+/";
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
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
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
              <div style={{ flex: 1 }}>
                {/* 这里可以留空或添加其他字段 */}
              </div>
                </div>
                </Collapse.Panel>

                {/* 第三步：高级配置 */}
                <Collapse.Panel 
                  header={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge count="3" style={{ backgroundColor: '#1677ff' }} />
                      <span>高级配置</span>
                    </div>
                  }
                  key="3"
                >

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
                        <div style={{ flex: 1 }}>
                          <Form.Item
                            name="responseDelay"
                            label="延迟响应(毫秒)"
                            tooltip="设置接口响应延迟时间，单位为毫秒"
                            rules={[
                              { 
                                pattern: /^\d*$/, 
                                message: '请输入有效的数字' 
                              },
                              {
                                validator: (_, value) => {
                                  if (!value || parseInt(value, 10) <= 60000) {
                                    return Promise.resolve();
                                  }
                                  return Promise.reject(new Error('延迟时间不能超过60秒(60000毫秒)'));
                                }
                              }
                            ]}
                          >
                            <Input placeholder="例如：500" />
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                <Button
                                  type="dashed"
                                  onClick={() => add()}
                                  icon={<PlusOutlined />}
                                  style={{ flex: 1 }}
                                >
                                  添加参数匹配规则
                                </Button>
                                <Popover
                                  content={
                                    <div style={{ maxWidth: '300px' }}>
                                      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>匹配规则说明：</div>
                                      <div style={{ lineHeight: '1.6' }}>
                                        <div>• <strong>精确匹配</strong>：参数值完全相等</div>
                                        <div>• <strong>包含</strong>：参数值包含指定内容</div>
                                        <div>• <strong>正则</strong>：参数值符合正则表达式</div>
                                        <div>• <strong>嵌套路径</strong>：使用点号分隔，如 data.user.id</div>
                                      </div>
                                    </div>
                                  }
                                  title="参数匹配规则"
                                  trigger="click"
                                  placement="top"
                                >
                                  <Button
                                    type="text"
                                    icon={<QuestionCircleOutlined />}
                                    style={{ 
                                      color: '#999',
                                      padding: '4px'
                                    }}
                                    size="small"
                                  />
                                </Popover>
                              </div>
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
                </Collapse.Panel>
              </Collapse>
            </Form>
          </div>
          </Drawer>
        ) : (
          <Modal
            title={
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 600, 
                color: '#262626',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>{editingInterface ? '编辑接口' : (isDuplicateMode ? '复制新增接口' : '添加接口')}</span>
                <Badge 
                  count="配置向导" 
                  style={{ 
                    backgroundColor: '#f0f9ff', 
                    color: '#1677ff',
                    fontSize: '11px',
                    fontWeight: 'normal'
                  }} 
                />
              </div>
            }
            open={modalVisible}
            onCancel={handleCancel}
            onOk={handleSubmit}
            width={1040}
            destroyOnClose
            okText={editingInterface ? '保存' : '创建'}
            cancelText="取消"
            bodyStyle={{ 
              maxHeight: '70vh',
              overflow: 'auto',
              background: '#fafafa'
            }}
          >
            <div style={{ padding: '0' }}>
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  name: '',
                  group: '',
                  pattern: '',
                  proxyType: 'response',
                  statusCode: '200',
                  contentType: 'application/json; charset=utf-8',
                  responses: [],
                  httpMethod: 'ALL',
                  targetUrl: '',
                  headerItems: [],
                  paramMatchers: [],
                  responseDelay: '0'
                }}
              >
                {/* Modal 模式下使用相同的表单内容，但去掉 Collapse 包装 */}
                <div style={{ padding: '24px' }}>
                  {/* 基础信息 */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge count="1" style={{ backgroundColor: '#1677ff' }} />
                      <span>基础信息</span>
                    </div>
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
                          name="group"
                          label="分组"
                          tooltip="为接口设置分组，便于管理和批量操作"
                        >
                          <Select
                            placeholder="选择或创建分组"
                            showSearch
                            allowClear
                            style={{ width: '100%' }}
                            mode="tags"
                            maxTagCount="responsive"
                            maxTagTextLength={10}
                            onChange={(value) => {
                              if (Array.isArray(value) && value.length > 0) {
                                const groupValue = value[0] === '' ? undefined : value[0];
                                form.setFieldsValue({ group: groupValue });
                              }
                            }}
                            onInputKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                              }
                            }}
                          >
                            {Array.from(new Set(interfaces.map(item => item.group).filter(Boolean))).map(group => (
                              <Option key={group} value={group}>{group}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </div>
                    </div>
                  </div>

                  {/* URL配置 */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge count="2" style={{ backgroundColor: '#1677ff' }} />
                      <span>URL配置</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
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
                                
                                if (proxyType === 'url_redirect') {
                                  try {
                                    new URL(value);
                                    return Promise.resolve();
                                  } catch (e) {
                                    return Promise.reject(new Error('URL重定向模式下，URL匹配规则必须是完整的URL（包括http://或https://）'));
                                  }
                                }
                                
                                if (proxyType === 'redirect') {
                                  if (value.startsWith('http://') || value.startsWith('https://')) {
                                    return Promise.resolve();
                                  }
                                  return Promise.reject(new Error('重定向模式下，URL匹配规则必须以http://或https://开头'));
                                }
                                
                                if (proxyType === 'response') {
                                  if (value.startsWith('/') && value.endsWith('/')) {
                                    try {
                                      new RegExp(value.slice(1, -1));
                                      return Promise.resolve();
                                    } catch (e) {
                                      return Promise.reject(new Error('无效的正则表达式格式'));
                                    }
                                  }
                                  
                                  if (value.includes('*')) {
                                    if (/^[a-zA-Z0-9\-_/.*]+$/.test(value)) {
                                      return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('通配符URL格式不正确'));
                                  }
                                  
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
                            form.setFieldsValue({ pattern: '' });
                            const patternInput = document.querySelector('input[placeholder="根据选择的处理方式输入相应格式的URL"]');
                            if (patternInput) {
                              if (value === 'response') {
                                patternInput.placeholder = "例如：/api/users，/api/users/*，/api\\/users\\/\\d+/";
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
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
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
                      <div style={{ flex: 1 }}>
                        {/* 这里可以留空或添加其他字段 */}
                      </div>
                    </div>
                  </div>

                  {/* 高级配置 */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge count="3" style={{ backgroundColor: '#1677ff' }} />
                      <span>高级配置</span>
                    </div>

                    {/* 根据proxyType显示不同的表单项 */}
                    <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.proxyType !== currentValues.proxyType}>
                      {({ getFieldValue }) => {
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
                                <div style={{ flex: 1 }}>
                                  <Form.Item
                                    name="responseDelay"
                                    label="延迟响应(毫秒)"
                                    tooltip="设置接口响应延迟时间，单位为毫秒"
                                    rules={[
                                      { 
                                        pattern: /^\d*$/, 
                                        message: '请输入有效的数字' 
                                      },
                                      {
                                        validator: (_, value) => {
                                          if (!value || parseInt(value, 10) <= 60000) {
                                            return Promise.resolve();
                                          }
                                          return Promise.reject(new Error('延迟时间不能超过60秒(60000毫秒)'));
                                        }
                                      }
                                    ]}
                                  >
                                    <Input placeholder="例如：500" />
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
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                        <Button
                                          type="dashed"
                                          onClick={() => add()}
                                          icon={<PlusOutlined />}
                                          style={{ flex: 1 }}
                                        >
                                          添加参数匹配规则
                                        </Button>
                                        <Popover
                                          content={
                                            <div style={{ maxWidth: '300px' }}>
                                              <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>匹配规则说明：</div>
                                              <div style={{ lineHeight: '1.6' }}>
                                                <div>• <strong>精确匹配</strong>：参数值完全相等</div>
                                                <div>• <strong>包含</strong>：参数值包含指定内容</div>
                                                <div>• <strong>正则</strong>：参数值符合正则表达式</div>
                                                <div>• <strong>嵌套路径</strong>：使用点号分隔，如 data.user.id</div>
                                              </div>
                                            </div>
                                          }
                                          title="参数匹配规则"
                                          trigger="click"
                                          placement="top"
                                        >
                                          <Button
                                            type="text"
                                            icon={<QuestionCircleOutlined />}
                                            style={{ 
                                              color: '#999',
                                              padding: '4px'
                                            }}
                                            size="small"
                                          />
                                        </Popover>
                                      </div>
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
                  </div>
                </div>
              </Form>
            </div>
          </Modal>
        )}
                    
        {/* 使用拆分后的预览模态框组件 */}
        <PreviewModal
          visible={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          previewContent={previewContent}
        />

        {/* 数据管理弹窗/抽屉 */}
        {displayMode === 'drawer' ? (
          <DataManagementDrawer
            visible={dataModalVisible}
            onCancel={() => { setDataModalVisible(false); setDataModalRecord(null); }}
            interfaceItem={dataModalRecord}
            onSaved={() => {
              fetchInterfaces();
            }}
          />
        ) : (
          <DataManagementModal
            visible={dataModalVisible}
            onCancel={() => { setDataModalVisible(false); setDataModalRecord(null); }}
            interfaceItem={dataModalRecord}
            onSaved={() => {
              fetchInterfaces();
            }}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default InterfaceManagement; 