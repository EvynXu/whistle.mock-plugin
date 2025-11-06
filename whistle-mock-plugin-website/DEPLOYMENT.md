# 部署到 GitHub Pages

本项目已配置为通过 GitHub Actions 自动部署到 GitHub Pages。

## 🚀 自动部署

当您推送代码到 `main` 或 `dev` 分支时，GitHub Actions 会自动：
1. 检出代码
2. 安装依赖
3. 构建项目
4. 部署到 GitHub Pages

### 触发条件

- 推送到 `main` 或 `dev` 分支
- `whistle-mock-plugin-website/` 目录下的文件发生变化
- 手动触发工作流

## 📋 首次部署步骤

### 1. 推送代码到 GitHub

```bash
git push origin dev
# 或
git push origin main
```

### 2. 启用 GitHub Pages

1. 访问仓库页面：https://github.com/EvynXu/whistle.mock-plugin
2. 点击 **Settings**（设置）
3. 在左侧菜单中找到 **Pages**
4. 在 **Source**（源）部分：
   - 选择 **GitHub Actions** 作为部署源
5. 点击 **Save**（保存）

### 3. 等待部署完成

- 前往 **Actions** 标签页查看部署进度
- 首次部署可能需要几分钟
- 部署成功后，网站将在以下地址可用：

  **https://evynxu.github.io/whistle.mock-plugin/**

## 🔍 查看部署状态

1. 在仓库页面，点击 **Actions** 标签
2. 查看 "Deploy Website to GitHub Pages" 工作流
3. 点击具体的运行记录查看详细日志

## 🛠️ 手动触发部署

如果需要手动触发部署：

1. 访问仓库的 **Actions** 页面
2. 选择 "Deploy Website to GitHub Pages" 工作流
3. 点击 **Run workflow** 按钮
4. 选择要部署的分支
5. 点击 **Run workflow**

## 📝 工作流配置

工作流配置文件位于：`.github/workflows/deploy-website.yml`

主要配置：
- **触发分支**：main, dev
- **Node.js 版本**：18
- **构建目录**：whistle-mock-plugin-website
- **输出目录**：whistle-mock-plugin-website/dist

## ⚙️ Vite 配置

`vite.config.js` 中已配置正确的 base 路径：

```javascript
export default defineConfig({
  base: '/whistle.mock-plugin/',
  // ...
});
```

这确保了在 GitHub Pages 上所有资源路径都是正确的。

## 🐛 常见问题

### 部署失败？

1. **检查 GitHub Pages 设置**
   - 确保已启用 GitHub Pages
   - 确保源设置为 "GitHub Actions"

2. **检查工作流权限**
   - 前往仓库 Settings → Actions → General
   - 在 "Workflow permissions" 部分
   - 确保选择了 "Read and write permissions"

3. **检查构建日志**
   - 在 Actions 页面查看详细的构建日志
   - 查找错误信息并修复

### 页面显示 404？

1. 等待几分钟，GitHub Pages 可能需要时间更新
2. 清除浏览器缓存
3. 确认访问的 URL 是否正确

### 资源加载失败？

检查 `vite.config.js` 中的 `base` 配置是否正确：
- 应该是：`base: '/whistle.mock-plugin/'`
- 注意前后的斜杠

## 🔄 更新网站

只需推送代码到 `main` 或 `dev` 分支：

```bash
git add .
git commit -m "更新网站内容"
git push origin dev
```

GitHub Actions 会自动构建并部署最新版本。

## 📊 部署徽章

可以在 README 中添加部署状态徽章：

```markdown
[![Deploy](https://github.com/EvynXu/whistle.mock-plugin/actions/workflows/deploy-website.yml/badge.svg)](https://github.com/EvynXu/whistle.mock-plugin/actions/workflows/deploy-website.yml)
```

## 🌐 访问网站

部署成功后，网站将在以下地址可用：

**https://evynxu.github.io/whistle.mock-plugin/**

享受您的新网站吧！🎉
