# Vue Algo Tutor

基于 Vue 3 + TypeScript + Pinia + Vite 的算法教学网站示例，包含"鸡兔同笼"算法的可视化演示。

## HTTPS配置（剪贴板功能必需）

为了支持剪贴板API等浏览器安全特性，建议使用HTTPS访问。查看 [HTTPS配置指南](./docs/https-setup.md) 了解详细配置方法。

快速开始（本地HTTPS开发）：
```bash
# 安装mkcert并生成证书
mkcert -install
mkcert localhost 127.0.0.1 ::1

# 如需局域网访问，包含您的IP地址
# mkcert localhost 127.0.0.1 192.168.x.x ::1

# 使用HTTPS模式启动
npm run dev:https
```

局域网访问：查看 [局域网快速部署指南](./docs/lan-quick-setup.md)

## 开发

```bash
# 安装依赖
pnpm i # 或 npm i / yarn

# 启动开发服务器
pnpm dev

# 类型检查
pnpm typecheck

# 运行单元测试
pnpm test
```

## 目录结构

```
/src
  /components
    Activity1.vue
    Activity3.vue
    /Activity2
      Activity2.vue
      /components
        FlowChart.vue
        InputForm.vue
        StepController.vue
  /stores
    useAlgorithmStore.ts
  /utils
    algorithm.ts
  /assets
    /styles
      flowchart.scss
      global.css
```

## 功能说明
- 使用 Composition API 与 Pinia 进行组件通信与状态管理。
- Activity2 提供完整流程：
  [开始] → [输入头脚数] → [计算兔子数量] → [计算鸡数量] → [验证结果] → [输出结果]
- SVG 自适应视口，节点高亮当前步骤，已通过节点标记为已完成。
- 变量区域采用过渡动画展示变化，含基本输入校验与错误提示。
- 支持逐步执行与自动播放控制。
