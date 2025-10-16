# Python 运行环境设置指南

## 概述

本应用使用 Pyodide 在浏览器中运行 Python 代码。为了提升加载速度和稳定性，支持两种模式：
1. **本地模式**（推荐）：从本地加载 Pyodide，速度快且稳定
2. **CDN 模式**（备用）：从网络加载 Pyodide，需要网络连接

## 本地模式设置（推荐）

### 方法一：自动下载（推荐）

1. 在项目根目录下运行下载脚本：
```bash
npm run download-pyodide
```

或手动运行：
```bash
node scripts/download-pyodide.js
```

2. 脚本会自动下载 Pyodide 文件到 `public/pyodide` 目录

3. 重新构建应用：
```bash
npm run build
```

### 方法二：手动下载

如果自动下载失败，可以手动下载：

1. 创建目录：
```bash
mkdir -p public/pyodide
```

2. 从以下地址下载必要文件：
- https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js
- https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.asm.js
- https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.asm.wasm
- https://cdn.jsdelivr.net/pyodide/v0.24.1/full/python_stdlib.zip
- https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide-lock.json

3. 将下载的文件放入 `public/pyodide` 目录

## 功能特性

### 1. 智能加载策略

- **优先本地加载**：首先尝试从本地加载 Pyodide
- **自动回退**：如果本地文件不存在，自动切换到 CDN
- **多 CDN 备份**：支持多个 CDN 源，确保可用性

### 2. 预加载机制

- 应用启动 2 秒后自动开始预加载
- 不影响应用初始加载速度
- 后台静默加载，用户无感知

### 3. 进度显示

- 实时显示加载进度
- 用户点击运行代码时，如果未加载完成会显示进度
- 加载完成后自动运行代码

### 4. 错误处理

- 本地加载失败自动切换 CDN
- CDN 加载失败自动尝试备用 CDN
- 友好的错误提示信息

## 添加 npm 脚本

在 `package.json` 中添加下载脚本：

```json
{
  "scripts": {
    "download-pyodide": "node scripts/download-pyodide.js",
    "postinstall": "npm run download-pyodide"
  }
}
```

这样在 `npm install` 后会自动下载 Pyodide 文件。

## 验证安装

1. 启动开发服务器：
```bash
npm run dev
```

2. 打开应用，查看控制台输出：
   - 如果看到"从本地加载 Pyodide..."，说明本地模式生效
   - 如果看到"从 CDN 加载 Pyodide..."，说明使用 CDN 模式

3. 测试 Python 代码运行：
```python
print("Hello, World!")
import sys
print(f"Python version: {sys.version}")
```

## 常见问题

### Q1: 下载脚本执行失败
**A**: 检查网络连接，或使用代理。也可以手动下载文件。

### Q2: 本地文件存在但无法加载
**A**: 确保文件在正确的目录（`public/pyodide`），并且构建后复制到了 `dist/pyodide`。

### Q3: Python 代码运行很慢
**A**: 首次加载需要时间，后续运行会更快。建议使用本地模式以提升速度。

### Q4: 提示"无法加载 Python 运行环境"
**A**: 
1. 检查网络连接
2. 尝试刷新页面
3. 清除浏览器缓存
4. 确认防火墙没有阻止相关请求

## 性能优化建议

1. **使用本地模式**：显著提升加载速度
2. **预加载**：应用会自动预加载，无需手动干预
3. **缓存利用**：Pyodide 实例会在内存中缓存，避免重复加载
4. **按需加载包**：只在需要时加载额外的 Python 包

## 技术细节

- Pyodide 版本：0.24.1
- 支持的 Python 版本：3.11
- 核心文件大小：约 20MB（压缩后）
- 加载时间：
  - 本地模式：2-5 秒
  - CDN 模式：5-15 秒（取决于网络速度）

## 更新 Pyodide 版本

如需更新 Pyodide 版本：

1. 修改 `scripts/download-pyodide.js` 中的版本号
2. 修改 `src/renderer/chatWindow/PythonRunner.ts` 中的版本号
3. 重新运行下载脚本
4. 重新构建应用

## 支持与反馈

如有问题或建议，请联系开发团队或提交 issue。
