import { contextBridge, ipcRenderer } from 'electron';

// 定义API接口类型
interface ElectronAPI {
  openChat: () => Promise<void>;
  toggleChat: () => Promise<void>;
  closeChat: () => Promise<void>;
  minimizeToFloat: () => Promise<void>;
  sendMessage: (message: string) => Promise<any>;
  moveFloatWindow: (offsetX: number, offsetY: number) => Promise<void>;
  showContextMenu: () => Promise<void>;
  onReceiveMessage: (callback: (message: any) => void) => void;
  removeAllListeners: (channel: string) => void;
}

// 暴露安全的API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  openChat: () => ipcRenderer.invoke('open-chat'),
  toggleChat: () => ipcRenderer.invoke('toggle-chat'),
  closeChat: () => ipcRenderer.invoke('close-chat'),
  minimizeToFloat: () => ipcRenderer.invoke('minimize-to-float'),
  sendMessage: (message: string) => ipcRenderer.invoke('send-message', message),
  moveFloatWindow: (offsetX: number, offsetY: number) => ipcRenderer.invoke('move-float-window', offsetX, offsetY),
  showContextMenu: () => ipcRenderer.invoke('show-context-menu'),
  onReceiveMessage: (callback: (message: any) => void) => {
    ipcRenderer.on('receive-message', (_event, message) => callback(message));
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
} as ElectronAPI);

// 声明全局类型
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
