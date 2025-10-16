const express = require('express');
const http = require('http');
const https = require('https');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

const PORT = process.env.SOCKET_PORT || 3001;
const HTTPS_PORT = process.env.SOCKET_HTTPS_PORT || 3002;

// 检查是否有SSL证书
let httpsServer = null;
let useHttps = false;

// 查找证书文件
function findCertFiles() {
  // 先在当前目录查找
  let searchDir = __dirname;
  let files = fs.readdirSync(searchDir);
  let certFiles = files.filter(f => f.endsWith('.pem') && f.includes('localhost'));
  
  // 如果当前目录没有，再查找上级目录
  if (certFiles.length === 0) {
    searchDir = path.join(__dirname, '..');
    files = fs.readdirSync(searchDir);
    certFiles = files.filter(f => f.endsWith('.pem') && f.includes('localhost'));
  }
  
  // 如果还没有，查找vue-algo-tutor目录
  if (certFiles.length === 0) {
    searchDir = path.join(__dirname, '..', 'vue-algo-tutor');
    if (fs.existsSync(searchDir)) {
      files = fs.readdirSync(searchDir);
      certFiles = files.filter(f => f.endsWith('.pem') && f.includes('localhost'));
    }
  }
  
  if (certFiles.length === 0) {
    console.log('[Socket.io] No SSL certificates found, running HTTP only');
    return null;
  }
  
  const keyFile = certFiles.find(f => f.includes('-key.pem'));
  const certFile = certFiles.find(f => !f.includes('-key.pem'));
  
  if (!keyFile || !certFile) {
    console.log('[Socket.io] Incomplete SSL certificates, running HTTP only');
    return null;
  }
  
  console.log(`[Socket.io] Found SSL certificates in ${searchDir}:`);
  console.log(`  - Key:  ${keyFile}`);
  console.log(`  - Cert: ${certFile}`);
  
  return {
    key: fs.readFileSync(path.join(searchDir, keyFile)),
    cert: fs.readFileSync(path.join(searchDir, certFile))
  };
}

// 创建HTTP服务器
const httpServer = http.createServer(app);

// 尝试创建HTTPS服务器
const sslOptions = findCertFiles();
if (sslOptions) {
  httpsServer = https.createServer(sslOptions, app);
  useHttps = true;
  console.log('[Socket.io] SSL certificates found, HTTPS support enabled');
}

// 创建Socket.io实例
const io = socketIo({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 同时附加到HTTP和HTTPS服务器
io.attach(httpServer);
if (httpsServer) {
  io.attach(httpsServer);
}

// 存储活跃的学生会话
const activeSessions = new Map();

// 存储教师下发的内容（持久化在内存中）
const teacherBroadcasts = new Map();

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connected: io.engine.clientsCount,
    protocols: {
      http: true,
      https: useHttps
    }
  });
});

// Socket.io 连接处理
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  
  // 转发所有事件
  socket.on('event', (data) => {
    console.log(`[Socket.io] Event received:`, data.type, data.groupId || '');
    
    // 处理学生登录事件
    if (data.type === 'session:login' && data.groupId) {
      activeSessions.set(socket.id, { groupId: data.groupId, role: data.role });
      console.log(`[Socket.io] Student logged in: Group ${data.groupId}, Role: ${data.role}`);
    }
    
    // 处理学生退出事件
    if (data.type === 'session:logout' && data.groupId) {
      activeSessions.delete(socket.id);
      console.log(`[Socket.io] Student logged out: Group ${data.groupId}`);
    }
    
    // 处理教师下发活动二内容 - 保存并广播
    if (data.type === 'teacher:broadcast' && data.activity === 'a2') {
      console.log(`[Socket.io] Teacher broadcast for Activity 2 received, saving and broadcasting`);
      teacherBroadcasts.set('activity2', {
        type: data.type,
        activity: data.activity,
        data: data.data,
        timestamp: Date.now()
      });
      socket.broadcast.emit('event', data);
      return;
    }
    
    // 处理教师下发活动三内容 - 保存并广播
    if (data.type === 'teacher:activity3:broadcast' && data.activity === 'a3') {
      console.log(`[Socket.io] Teacher broadcast for Activity 3 received, saving and broadcasting`);
      teacherBroadcasts.set('activity3', {
        type: data.type,
        activity: data.activity,
        data: data.data,
        timestamp: Date.now()
      });
      socket.broadcast.emit('event', data);
      return;
    }
    
    // 处理学生请求最新下发内容
    if (data.type === 'student:request-broadcast') {
      console.log(`[Socket.io] Student requesting broadcast for activity: ${data.activity}`);
      const key = data.activity === 'a2' ? 'activity2' : data.activity === 'a3' ? 'activity3' : null;
      if (key && teacherBroadcasts.has(key)) {
        const broadcast = teacherBroadcasts.get(key);
        console.log(`[Socket.io] Sending saved broadcast to student`);
        socket.emit('event', broadcast);
      }
      return;
    }
    
    // 处理教师清除下发内容事件
    if (data.type === 'teacher:clear-broadcasts') {
      console.log(`[Socket.io] Teacher clearing all broadcasts`);
      teacherBroadcasts.clear();
      // 通知所有学生清除本地保存的内容
      io.emit('event', { type: 'teacher:broadcasts-cleared' });
      return;
    }
    
    // 处理教师退出事件 - 清除所有下发内容
    if (data.type === 'teacher:logout') {
      console.log(`[Socket.io] Teacher logged out, clearing all broadcasts`);
      teacherBroadcasts.clear();
      // 通知所有学生清除本地保存的内容
      io.emit('event', { type: 'teacher:broadcasts-cleared' });
      return;
    }
    
    // 处理教师ping事件 - 通知所有学生更新状态
    if (data.type === 'teacher:ping') {
      console.log(`[Socket.io] Teacher ping received, broadcasting to all clients`);
      // 广播给所有客户端（包括发送者）
      io.emit('event', data);
      return;
    }
    
    // 其他事件正常广播给所有其他客户端
    socket.broadcast.emit('event', data);
  });
  
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    // 清理断开连接的会话
    if (activeSessions.has(socket.id)) {
      const session = activeSessions.get(socket.id);
      console.log(`[Socket.io] Cleaning up session for Group ${session.groupId}`);
      activeSessions.delete(socket.id);
    }
  });
});

// 启动HTTP服务器
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[Socket.io Server] HTTP running on http://0.0.0.0:${PORT}`);
});

// 启动HTTPS服务器（如果有证书）
if (httpsServer) {
  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`[Socket.io Server] HTTPS running on https://0.0.0.0:${HTTPS_PORT}`);
  });
}
