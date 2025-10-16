# 本地 Pyodide 配置说明

## 概述

为了解决某些电脑在使用聊天框中的 Python 编辑器时出现的加载失败问题，我们已将应用配置为使用本地的 Pyodide 源，而不再依赖 CDN。

## 改动说明

### 1. PythonRunner.ts 修改
- 移除了 CDN 加载逻辑
- 使用相对路径 `./pyodide/` 加载本地 Pyodide 文件
- 改进了错误处理和提示信息

### 2. 文件结构
Pyodide 文件位于 `public/pyodide/` 目录，包含：
- pyodide.js - 主要的 JavaScript 文件
- pyodide.asm.js - WebAssembly 的 JavaScript 部分
- pyodide.asm.wasm - WebAssembly 二进制文件
- python_stdlib.zip - Python 标准库
- pyodide-lock.json - 包依赖信息
- repodata.json - 包仓库元数据

### 3. 构建配置
Webpack 配置会自动将 `public/pyodide/` 目录复制到 `dist/pyodide/`，确保生产版本包含所有必要文件。

## 故障排除

### 问题：Python 环境加载失败

如果用户仍然遇到加载失败的问题，请检查：

1. **确保文件完整**
   - 检查 `dist/pyodide/` 目录是否包含所有必要文件
   - 特别是 `pyodide.asm.wasm` 文件（约 15MB）

2. **重新安装应用**
   - 有时文件可能在安装过程中损坏
   - 建议用户完全卸载后重新安装

3. **检查控制台错误**
   - 打开开发者工具（F12）
   - 查看控制台是否有具体的错误信息

4. **文件权限**
   - 确保应用有权限读取安装目录中的文件

## 开发注意事项

1. **下载 Pyodide 文件**
   如果 `public/pyodide/` 目录不存在或文件缺失，可以运行：
   ```bash
   npm run download-pyodide
   ```

2. **版本更新**
   当前使用的是 Pyodide v0.24.1。如需更新版本，需要：
   - 更新 `scripts/download-pyodide.js` 中的版本号
   - 重新下载文件
   - 测试兼容性

3. **打包大小**
   由于包含了完整的 Pyodide，应用体积会增加约 50MB。这是为了确保离线可用性和加载可靠性。

## 优势

1. **离线可用** - 不需要网络连接即可使用 Python 功能
2. **加载速度快** - 本地文件加载比 CDN 更快
3. **可靠性高** - 不受网络波动或 CDN 故障影响
4. **隐私保护** - 代码不会发送到外部服务器
