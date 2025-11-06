# 快速安装和运行指南

## 📦 安装依赖

在项目目录下运行以下命令安装依赖：

```bash
npm install
```

或者使用其他包管理器：

```bash
# 使用 yarn
yarn install

# 使用 pnpm
pnpm install
```

## 🚀 启动开发服务器

安装完成后，运行以下命令启动开发服务器：

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动，浏览器会自动打开。

## 🏗️ 构建生产版本

构建用于生产环境的优化版本：

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

## 👀 预览生产构建

预览构建后的生产版本：

```bash
npm run preview
```

## ⚠️ 常见问题

### 端口被占用

如果 3000 端口被占用，可以修改 `vite.config.js` 中的端口配置：

```javascript
export default defineConfig({
  server: {
    port: 3001,  // 修改为其他端口
    open: true
  }
});
```

### 依赖安装失败

尝试清除缓存后重新安装：

```bash
# npm
rm -rf node_modules package-lock.json
npm install

# yarn
rm -rf node_modules yarn.lock
yarn install

# pnpm
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 构建失败

确保 Node.js 版本 >= 14.18.0

```bash
node --version
```

如果版本过低，请升级 Node.js。

## 📝 更多信息

查看 [README.md](./README.md) 了解更多项目信息和详细文档。
