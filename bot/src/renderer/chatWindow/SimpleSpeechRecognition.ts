/**
 * 简单的语音识别实现
 * 优先使用 Web Speech API，不可用时降级到其他方案
 */

export class SimpleSpeechRecognition {
  private recognition: any = null;
  private isListening = false;
  private onResultCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStatusCallback: ((status: string) => void) | null = null;

  constructor() {
    this.initializeRecognition();
  }

  /**
   * 初始化语音识别
   */
  private initializeRecognition(): void {
    // 检查浏览器是否支持 Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('当前环境不支持 Web Speech API');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      
      // 配置语音识别
      this.recognition.continuous = true; // 持续监听
      this.recognition.interimResults = true; // 显示中间结果
      this.recognition.lang = 'zh-CN'; // 设置中文
      this.recognition.maxAlternatives = 1;

      // 处理识别结果
      this.recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        const isFinal = event.results[current].isFinal;
        
        console.log('识别结果:', transcript, '是否最终:', isFinal);
        this.onResultCallback?.(transcript, isFinal);
      };

      // 处理错误
      this.recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        this.isListening = false;
        this.onStatusCallback?.('error');
        
        // 错误处理
        let errorMessage = '语音识别出错';
        switch (event.error) {
          case 'no-speech':
            errorMessage = '没有检测到语音';
            break;
          case 'audio-capture':
            errorMessage = '无法访问麦克风';
            break;
          case 'not-allowed':
            errorMessage = '麦克风权限被拒绝';
            break;
          case 'network':
            errorMessage = '网络连接错误';
            break;
          default:
            errorMessage = `语音识别错误: ${event.error}`;
        }
        
        this.onErrorCallback?.(errorMessage);
      };

      // 识别开始
      this.recognition.onstart = () => {
        console.log('语音识别已启动');
        this.isListening = true;
        this.onStatusCallback?.('listening');
      };

      // 识别结束
      this.recognition.onend = () => {
        console.log('语音识别已结束');
        this.isListening = false;
        this.onStatusCallback?.('stopped');
      };

      // 检测到语音开始
      this.recognition.onspeechstart = () => {
        console.log('检测到语音');
        this.onStatusCallback?.('speaking');
      };

      // 检测到语音结束
      this.recognition.onspeechend = () => {
        console.log('语音结束');
      };

    } catch (error) {
      console.error('初始化语音识别失败:', error);
    }
  }

  /**
   * 检查是否支持语音识别
   */
  isSupported(): boolean {
    return this.recognition !== null;
  }

  /**
   * 开始录音
   */
  async start(): Promise<void> {
    if (!this.recognition) {
      throw new Error('语音识别不可用');
    }

    if (this.isListening) {
      console.warn('已经在录音中');
      return;
    }

    try {
      // 先请求麦克风权限
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // 权限获取成功，停止流（我们只是检查权限）
          stream.getTracks().forEach(track => track.stop());
        });

      // 启动语音识别
      this.recognition.start();
    } catch (error: any) {
      console.error('启动语音识别失败:', error);
      
      if (error.name === 'NotAllowedError') {
        throw new Error('麦克风权限被拒绝');
      } else if (error.name === 'NotFoundError') {
        throw new Error('未找到麦克风设备');
      } else {
        throw new Error('启动语音识别失败');
      }
    }
  }

  /**
   * 停止录音
   */
  stop(): void {
    if (!this.recognition || !this.isListening) {
      return;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      console.error('停止语音识别失败:', error);
    }
  }

  /**
   * 设置回调函数
   */
  onResult(callback: (text: string, isFinal: boolean) => void): void {
    this.onResultCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  onStatus(callback: (status: string) => void): void {
    this.onStatusCallback = callback;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stop();
    this.recognition = null;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onStatusCallback = null;
  }
}

