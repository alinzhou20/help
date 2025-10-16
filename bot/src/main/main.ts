import { app, BrowserWindow, ipcMain, screen, Tray, Menu, session } from 'electron';
import * as path from 'path';
import { ChatAPI } from './api/chatApi';

// 启用语音识别API
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('enable-features', 'WebSpeechAPI');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');  // 自动允许媒体权限（用于开发）

// 修复Windows控制台中文乱码
if (process.platform === 'win32') {
  const { exec } = require('child_process');
  exec('chcp 65001', (error: any) => {
    if (error) {
      console.log('设置控制台编码失败:', error);
    }
  });
}

// 获取单实例锁
const gotTheLock = app.requestSingleInstanceLock();

// 如果没有获取到锁，说明已经有实例在运行，直接退出
if (!gotTheLock) {
  app.quit();
} else {
  // 当第二个实例启动时，将会触发这个事件
  app.on('second-instance', () => {
    // 如果用户尝试启动第二个实例，我们将聚焦于主窗口
    if (floatWindow) {
      if (floatWindow.isMinimized()) floatWindow.restore();
      floatWindow.focus();
      floatWindow.show();
    }
    if (chatWindow) {
      if (chatWindow.isMinimized()) chatWindow.restore();
      chatWindow.focus();
      chatWindow.show();
    }
  });
}

// 窗口管理
let floatWindow: BrowserWindow | null = null;
let chatWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// 开发模式检测 - 检查是否从webpack-dev-server加载
const isDev = !app.isPackaged;

// 创建浮窗
function createFloatWindow(): void {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  floatWindow = new BrowserWindow({
    width: 70,  // 缩小至70x70
    height: 70,
    x: width - 90,
    y: height - 90,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const floatWindowUrl = isDev 
    ? 'http://localhost:3000/floatWindow.html'
    : `file://${path.join(__dirname, 'floatWindow.html')}`;
  
  floatWindow.loadURL(floatWindowUrl);

  // 设置窗口可点击
  floatWindow.setIgnoreMouseEvents(false);

  floatWindow.on('closed', () => {
    floatWindow = null;
  });
}

// 创建聊天窗口
function createChatWindow(): void {
  if (chatWindow && !chatWindow.isDestroyed()) {
    // 如果窗口存在但被隐藏或最小化，显示并聚焦
    if (chatWindow.isMinimized()) {
      chatWindow.restore();
    }
    if (!chatWindow.isVisible()) {
      chatWindow.show();
    }
    chatWindow.focus();
    return;
  }

  // 获取屏幕尺寸，设置窗口显示在桌面中间右侧
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  const windowWidth = 510;  // 增加窗口宽度到480px
  const windowHeight = 800;  // 增加窗口高度到800px
  
  // 计算位置：更靠右显示
  const xPos = Math.round(width * 0.85 - windowWidth / 2); // 屏幕宽度85%的位置（更靠右）
  const yPos = Math.round((height - windowHeight) / 2); // 垂直居中

  chatWindow = new BrowserWindow({
    width: windowWidth,  // 调整宽度
    height: windowHeight, // 调整高度
    x: xPos,
    y: yPos,
    minWidth: 400,  // 增加最小宽度
    minHeight: 650,  // 增加最小高度
    frame: false, // 移除窗口边框
    show: false,
    alwaysOnTop: true,  // 窗口始终置顶
    titleBarStyle: 'hidden', // 隐藏标题栏
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // 添加媒体权限设置
      webSecurity: false,  // 在开发环境下可以禁用，生产环境建议开启
      allowRunningInsecureContent: true,
    },
  });

  const chatWindowUrl = isDev
    ? 'http://localhost:3000/chatWindow.html'
    : `file://${path.join(__dirname, 'chatWindow.html')}`;

  chatWindow.loadURL(chatWindowUrl);

  chatWindow.once('ready-to-show', () => {
    chatWindow?.show();
  });

  chatWindow.on('closed', () => {
    chatWindow = null;
  });
}

// 创建系统托盘
function createTray(): void {
  // 在开发模式下跳过托盘创建，避免图标缺失错误
  if (isDev) {
    console.log('[Development Mode] Skip tray creation');
    return;
  }
  
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  
  try {
    tray = new Tray(iconPath);
  } catch (error) {
    console.error('创建托盘失败，使用默认图标:', error);
    return;
  }
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示助手',
      click: () => {
        if (floatWindow) floatWindow.show();
      },
    },
    {
      label: '打开聊天',
      click: () => {
        createChatWindow();
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);
  
  if (tray) {
    tray.setToolTip('AI助手');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      createChatWindow();
    });
  }
}

// 应用初始化 - 只有获取到单实例锁才执行
app.whenReady().then(() => {
  if (!gotTheLock) {
    return;
  }
  
  // 设置权限请求处理器
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    // 自动允许媒体权限
    if (permission === 'media' || permission === 'mediaKeySystem') {
      callback(true);
    } else {
      callback(true); // 默认允许所有权限请求
    }
  });
  
  // 设置权限检查处理器
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    // 允许媒体相关权限
    if (permission === 'media') {
      return true;
    }
    return true; // 默认允许
  });
  
  createFloatWindow();
  createTray();
  
  // 初始化API
  const chatApi = new ChatAPI();
  
  // IPC通信处理
  // 打开聊天窗口
  ipcMain.handle('open-chat', () => {
    createChatWindow();
  });
  
  // 切换聊天窗口（打开或最小化）
  ipcMain.handle('toggle-chat', () => {
    if (chatWindow && !chatWindow.isDestroyed()) {
      if (chatWindow.isVisible()) {
        chatWindow.hide();
      } else {
        chatWindow.show();
        chatWindow.focus();
      }
    } else {
      createChatWindow();
    }
  });
  
  // 关闭聊天窗口
  ipcMain.handle('close-chat', () => {
    chatWindow?.close();
  });
  
  // 最小化到浮窗
  ipcMain.handle('minimize-to-float', () => {
    chatWindow?.hide();
    floatWindow?.show();
  });
  
  // 发送消息到Coze API
  ipcMain.handle('send-message', async (_event, message: string) => {
    try {
      const response = await chatApi.sendMessage(message);
      return { success: true, data: response };
    } catch (error) {
      console.error('发送消息失败:', error);
      return { success: false, error: error instanceof Error ? error.message : '未知错误' };
    }
  });
  
  // 移动浮窗
  ipcMain.handle('move-float-window', (_event, offsetX: number, offsetY: number) => {
    if (floatWindow && !floatWindow.isDestroyed()) {
      const [currentX, currentY] = floatWindow.getPosition();
      floatWindow.setPosition(currentX + offsetX, currentY + offsetY);
    }
  });
  
  // 显示悬浮窗右键菜单
  ipcMain.handle('show-context-menu', () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '打开聊天窗口',
        click: () => {
          createChatWindow();
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.quit();
        },
      },
    ]);
    
    if (floatWindow && !floatWindow.isDestroyed()) {
      contextMenu.popup({ window: floatWindow });
    }
  });
});

// 防止应用退出（除非用户主动退出）
app.on('window-all-closed', () => {
  // 在Windows上，即使所有窗口都关闭了，应用也继续运行（系统托盘）
  if (process.platform !== 'darwin') {
    // 不调用 app.quit()，保持应用运行
    return;
  }
});

app.on('activate', () => {
  // 在macOS上，当点击dock图标时重新创建窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createFloatWindow();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  // 清理托盘图标
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
    tray = null;
  }
  
  // 关闭所有窗口
  if (floatWindow && !floatWindow.isDestroyed()) {
    floatWindow.destroy();
    floatWindow = null;
  }
  
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.destroy();
    chatWindow = null;
  }
});
