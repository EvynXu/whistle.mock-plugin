# 列宽拖动调整功能实现说明

## 实现日期
2025-11-06

## 功能概述
为接口管理页面的"当前响应"列添加了拖动调整宽度的功能，列内的下拉框（Select）会自动根据列宽进行自适应。

## 技术方案
使用 Ant Design + react-resizable 的组合方案实现列宽拖动调整。

## 修改文件清单

### 1. package.json
**修改内容：**
- 添加 `react-resizable: ^3.0.5` 依赖到 devDependencies

**位置：** 第42行

### 2. InterfaceManagementV2.js
**修改内容：**

#### 2.1 导入模块（第18-19行）
```javascript
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
```

#### 2.2 扩展 tableConfig 状态（第98-123行）
- 添加 `columnWidths` 字段到状态中
- 为"当前响应"列设置默认宽度 180px
- 添加兼容性处理，确保旧缓存数据能正确加载

#### 2.3 创建 ResizableTitle 组件（第714-740行）
- 封装可调整大小的表头组件
- 集成 react-resizable 的 Resizable 组件
- 添加拖动手柄和事件处理

#### 2.4 创建 handleResize 函数（第742-749行）
- 处理列宽调整事件
- 更新 tableConfig.columnWidths
- 自动保存到 localStorage

#### 2.5 修改"当前响应"列配置（第844-881行）
- 将固定宽度改为动态读取：`tableConfig.columnWidths?.currentResponse || 180`
- 添加 `onHeaderCell` 属性，配置可调整大小的表头
- 为 Select 组件添加 `getPopupContainer` 属性，确保下拉菜单正确定位

#### 2.6 修改 Table 组件（第1383-1387行）
- 添加 `components` 属性
- 配置自定义表头组件：`{ header: { cell: ResizableTitle } }`

#### 2.7 更新 handleResetColumns 函数（第680-689行）
- 重置列配置时同时重置列宽到默认值 180px

### 3. interface-management.css
**修改内容：**

添加拖动手柄样式（第1287-1321行）：
- `.react-resizable` - 可调整大小容器的基础样式
- `.react-resizable-handle` - 拖动手柄的样式和定位
- `.react-resizable-handle:hover` - 悬停时的视觉反馈
- `.react-resizable-handle::after` - 拖动指示线的样式

## 功能特性

### 1. 列宽拖动
- 鼠标悬停在"当前响应"列的右边缘时，光标变为调整大小的图标
- 拖动边缘可以调整列宽
- 拖动时有视觉反馈（蓝色高亮）

### 2. 自动保存
- 调整后的列宽自动保存到 localStorage
- 页面刷新后保持用户设置的列宽

### 3. Select 自适应
- 列内的下拉框宽度设置为 100%
- 随列宽变化自动调整
- 下拉菜单正确定位，不会超出容器

### 4. 重置功能
- 点击"重置"按钮可以恢复默认列宽（180px）

### 5. 兼容性处理
- 兼容旧版本的缓存数据
- 如果缓存中没有 columnWidths，自动初始化为默认值

## 使用说明

### 安装依赖
```bash
cd whistle.mock-plugin
npm install
```

### 构建项目
```bash
npm run build
```

### 测试功能
1. 启动 whistle 服务
2. 打开接口管理页面
3. 找到"当前响应"列
4. 将鼠标移动到列标题的右边缘
5. 当光标变为调整大小图标时，拖动调整列宽
6. 刷新页面，验证列宽是否保持

## 技术细节

### 最小/最大宽度
当前实现没有设置硬性的最小/最大宽度限制，但可以通过以下方式添加：

```javascript
onResize: (e, { size }) => {
  const minWidth = 120;
  const maxWidth = 400;
  const newWidth = Math.max(minWidth, Math.min(maxWidth, size.width));
  // 更新列宽...
}
```

### 扩展到其他列
如果需要为其他列也添加拖动调整功能：

1. 在 `tableConfig.columnWidths` 中添加对应列的默认宽度
2. 在列配置中添加 `onHeaderCell` 属性
3. 使用动态宽度替代固定宽度

示例：
```javascript
{
  title: '延迟(毫秒)',
  key: 'responseDelay',
  width: tableConfig.columnWidths?.responseDelay || 100,
  onHeaderCell: (column) => ({
    width: column.width,
    onResize: handleResize('responseDelay'),
  }),
  // ...
}
```

## 注意事项

1. **性能考虑**：拖动时会频繁更新状态和 localStorage，对于大量数据的表格可能需要添加防抖处理
2. **浏览器兼容性**：react-resizable 依赖现代浏览器的 API，IE11 可能需要 polyfill
3. **移动端支持**：当前实现主要针对桌面端，移动端的触摸拖动可能需要额外配置

## 后续优化建议

1. 添加最小/最大宽度限制，防止列宽过小或过大
2. 为拖动操作添加防抖，减少状态更新频率
3. 支持双击列边缘自动调整到最适宽度
4. 支持更多列的宽度调整
5. 添加"恢复默认列宽"的快捷按钮

## 相关文档

- [react-resizable 官方文档](https://github.com/react-grid-layout/react-resizable)
- [Ant Design Table 可调整列宽示例](https://ant.design/components/table-cn#components-table-demo-resizable-column)

