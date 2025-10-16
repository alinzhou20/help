const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.SOCKET_PORT || 3001;

// 存储活跃的学生会话
const activeSessions = new Map();

// 存储教师下发的内容（持久化在内存中）
const teacherBroadcasts = new Map();
// 结构: { 
//   'activity2': { type: 'teacher:broadcast', data: {...}, timestamp: ... },
//   'activity3': { type: 'teacher:activity3:broadcast', data: {...}, timestamp: ... }
// }

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', connected: io.engine.clientsCount });
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Socket.io Server] Running on http://0.0.0.0:${PORT}`);
});
