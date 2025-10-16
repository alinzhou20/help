// 这是临时预加载文件，实际使用时会由TypeScript编译生成
const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  openChat: () => ipcRenderer.invoke('open-chat'),
  closeChat: () => ipcRenderer.invoke('close-chat'),
  minimizeToFloat: () => ipcRenderer.invoke('minimize-to-float'),
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  moveFloatWindow: (offsetX, offsetY) => ipcRenderer.invoke('move-float-window', offsetX, offsetY),
  onReceiveMessage: (callback) => {
    ipcRenderer.on('receive-message', (event, message) => callback(message));
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
