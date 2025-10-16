/**
 * Coze 语音识别包装器
 * 使用动态导入来避免 webpack 编译时的警告
 */

export interface CozeVoiceConfig {
  token: string;
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: 'idle' | 'recording' | 'paused') => void;
}

export class CozeVoiceRecognitionWrapper {
  private client: any = null;
  private config: CozeVoiceConfig;
  private status: 'idle' | 'recording' | 'paused' = 'idle';
  private wsModules: any = null;
  private apiModules: any = null;

  constructor(config: CozeVoiceConfig) {
    this.config = config;
  }

  /**
   * 动态加载 Coze API 模块
   */
  private async loadModules() {
    if (!this.wsModules || !this.apiModules) {
      try {
        // 动态导入避免编译时警告
        const [wsTools, api] = await Promise.all([
          import(/* webpackChunkName: "coze-ws-tools" */ '@coze/api/ws-tools'),
          import(/* webpackChunkName: "coze-api" */ '@coze/api'),
        ]);
        this.wsModules = wsTools;
        this.apiModules = api;
      } catch (error) {
        console.error('加载 Coze API 模块失败:', error);
        throw new Error('无法加载语音识别模块，请检查网络连接');
      }
    }
    return { wsModules: this.wsModules, apiModules: this.apiModules };
  }

  /**
   * 检查麦克风权限
   */
  public async checkPermission(): Promise<boolean> {
    try {
      // 在 Electron 环境下，直接使用 navigator.mediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('浏览器不支持麦克风访问');
      }

      // 尝试获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 成功获取权限后立即释放资源
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('麦克风权限检查失败:', error);
      
      // 使用 WsToolsUtils 作为备选方案
      try {
        const { wsModules } = await this.loadModules();
        const permission = await wsModules.WsToolsUtils.checkDevicePermission();
        return !!permission.audio;
      } catch (fallbackError) {
        console.error('备选权限检查也失败:', fallbackError);
        return false;
      }
    }
  }

  /**
   * 初始化客户端
   */
  public async initialize(): Promise<void> {
    try {
      // 检查权限
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        throw new Error('麦克风权限未授予，请在设置中允许麦克风访问');
      }

      // 动态加载模块
      const { wsModules } = await this.loadModules();
      const { WsTranscriptionClient, AIDenoiserProcessorMode, AIDenoiserProcessorLevel } = wsModules;

      // 创建客户端
      this.client = new WsTranscriptionClient({
        token: this.config.token,
        allowPersonalAccessTokenInBrowser: true,
        // AI降噪配置
        aiDenoisingConfig: {
          mode: AIDenoiserProcessorMode.NSNG, // AI降噪模式
          level: AIDenoiserProcessorLevel.SOFT, // 软降噪
        },
        // 调试模式
        debug: process.env.NODE_ENV === 'development',
      });

      // 设置事件监听
      await this.setupListeners();
      
      console.log('Coze语音识别客户端初始化成功');
    } catch (error) {
      console.error('初始化失败:', error);
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  private async setupListeners(): Promise<void> {
    if (!this.client || !this.apiModules) return;

    const { WebsocketsEventType } = this.apiModules;

    // 监听识别结果
    this.client.on(
      WebsocketsEventType.TRANSCRIPTIONS_MESSAGE_UPDATE,
      (event: any) => {
        const text = event.data?.content;
        
        if (text && this.config.onTranscript) {
          console.log('识别结果:', text);
          this.config.onTranscript(text);
        }
      }
    );

    // 监听错误
    this.client.on(WebsocketsEventType.ERROR, (error: any) => {
      console.error('语音识别错误:', error);
      if (this.config.onError) {
        this.config.onError(new Error(String(error)));
      }
    });

    // 监听连接关闭
    this.client.on(WebsocketsEventType.CLOSED, () => {
      console.log('语音识别连接关闭');
      this.updateStatus('idle');
    });

    // 调试：监听所有事件
    if (process.env.NODE_ENV === 'development') {
      this.client.on(WebsocketsEventType.ALL, (event: any) => {
        console.debug('收到事件:', event);
      });
    }
  }

  /**
   * 更新状态
   */
  private updateStatus(status: 'idle' | 'recording' | 'paused'): void {
    this.status = status;
    if (this.config.onStatusChange) {
      this.config.onStatusChange(status);
    }
  }

  /**
   * 开始录音
   */
  public async start(): Promise<void> {
    if (!this.client) {
      await this.initialize();
    }

    if (this.status === 'recording') {
      console.warn('已经在录音中');
      return;
    }

    try {
      await this.client!.start();
      this.updateStatus('recording');
      console.log('开始语音识别');
    } catch (error) {
      console.error('开始录音失败:', error);
      throw error;
    }
  }

  /**
   * 停止录音
   */
  public stop(): void {
    if (!this.client || this.status === 'idle') {
      console.warn('没有正在进行的录音');
      return;
    }

    try {
      this.client.stop();
      this.updateStatus('idle');
      console.log('停止语音识别');
    } catch (error) {
      console.error('停止录音失败:', error);
      throw error;
    }
  }

  /**
   * 暂停录音
   */
  public pause(): void {
    if (!this.client || this.status !== 'recording') {
      console.warn('没有正在进行的录音');
      return;
    }

    try {
      this.client.pause();
      this.updateStatus('paused');
      console.log('暂停语音识别');
    } catch (error) {
      console.error('暂停录音失败:', error);
      throw error;
    }
  }

  /**
   * 恢复录音
   */
  public resume(): void {
    if (!this.client || this.status !== 'paused') {
      console.warn('没有暂停的录音');
      return;
    }

    try {
      this.client.resume();
      this.updateStatus('recording');
      console.log('恢复语音识别');
    } catch (error) {
      console.error('恢复录音失败:', error);
      throw error;
    }
  }

  /**
   * 销毁客户端
   */
  public destroy(): void {
    try {
      if (this.client) {
        this.stop();
        if (typeof this.client.destroy === 'function') {
          this.client.destroy();
        }
        this.client = null;
      }
      this.updateStatus('idle');
      console.log('语音识别客户端已销毁');
    } catch (error) {
      console.error('销毁客户端失败:', error);
    }
  }

  /**
   * 获取当前状态
   */
  public getStatus(): 'idle' | 'recording' | 'paused' {
    return this.status;
  }
}
