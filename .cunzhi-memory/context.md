# 项目上下文信息

- 这是一个算法教学系统，包含前端(Vue3)和后端(Node.js/Socket.IO)。前端运行在HTTPS(5173端口)，后端Socket.IO服务可运行在HTTP(3001端口)或同时支持HTTP/HTTPS(3001/3002端口)。系统使用Socket.IO进行实时通信，支持教师与学生之间的互动。
- 算法教学系统项目已精简完成。主启动脚本位于help/start-all-https.bat，使用vite.config.auto-https.ts作为统一配置，删除了所有不必要的文档、测试文件和冗余配置。系统通过HTTPS在5173端口运行Vue前端，3001端口运行Socket.io服务器。
