/**
 * 百度实时语音识别 WebSocket 客户端
 * 基于百度智能云语音识别 WebSocket API
 */

import { AudioProcessor } from './AudioProcessor';

interface BaiduSpeechConfig {
  accessToken: string;
  appId?: string;
}

interface RecognitionResult {
  corpus_no: number;
  err_msg: string;
  err_no: number;
  result: string;
  sn: string;
  start_time: string;
  end_time: string;
  is_final?: number;
  res_type?: string;
}

export class BaiduSpeechRecognition {
  private ws: WebSocket | null = null;
  private config: BaiduSpeechConfig;
  private audioProcessor: AudioProcessor | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private isRecording = false;
  private onResultCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStatusCallback: ((status: string) => void) | null = null;

  constructor(config: BaiduSpeechConfig) {
    this.config = config;
  }

  /**
   * 开始录音和识别
   */
  async start(): Promise<void> {
    try {
      // 1. 获取麦克风权限并开始录音
      await this.startRecording();
      
      // 2. 连接 WebSocket
      await this.connectWebSocket();
      
      // 3. 发送开始帧
      this.sendStartFrame();
      
      this.isRecording = true;
      this.onStatusCallback?.('recording');
      
    } catch (error) {
      console.error('启动语音识别失败:', error);
      this.onErrorCallback?.('启动语音识别失败');
      throw error;
    }
  }

  /**
   * 停止录音和识别
   */
  stop(): void {
    this.isRecording = false;
    
    // 发送结束帧
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendEndFrame();
    }
    
    // 停止录音器
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
    
    // 停止音频流
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    // 清理音频处理器
    if (this.audioProcessor) {
      this.audioProcessor.dispose();
      this.audioProcessor = null;
    }
    
    // 延迟关闭 WebSocket，等待最后的结果
    setTimeout(() => {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    }, 1000);
    
    this.onStatusCallback?.('stopped');
  }

  /**
   * 开始录音
   */
  private async startRecording(): Promise<void> {
    try {
      // 获取麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // 创建音频处理器
      this.audioProcessor = new AudioProcessor();

      // 创建MediaRecorder并处理音频数据
      this.mediaRecorder = await this.audioProcessor.createPCMRecorder(
        this.mediaStream,
        (pcmData: ArrayBuffer) => {
          if (this.isRecording && this.ws && this.ws.readyState === WebSocket.OPEN) {
            // 发送PCM数据
            this.sendAudioFrame(pcmData);
          }
        }
      );
    } catch (error) {
      console.error('开始录音失败:', error);
      throw error;
    }
  }

  /**
   * 连接 WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 百度实时语音识别 WebSocket URL
      const wsUrl = 'wss://vop.baidu.com/realtime_asr';
      
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('WebSocket 连接成功');
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
        this.onErrorCallback?.('WebSocket 连接错误');
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket 连接关闭:', event.code, event.reason);
        if (event.code !== 1000) {
          this.onErrorCallback?.('连接意外断开');
        }
      };
    });
  }

  /**
   * 发送开始帧
   */
  private sendStartFrame(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const startFrame = {
      type: 'START',
      data: {
        appid: 104702393, // 应用ID
        appkey: '6tYKlGfRFpqYG84jxI7lDzxf', // 应用密钥（需要替换为实际的）
        dev_pid: 15372, // 中文普通话输入法模型
        cuid: 'baidu_speech_' + Date.now(),
        format: 'pcm',
        sample: 16000,
        token: this.config.accessToken
      }
    };

    this.ws.send(JSON.stringify(startFrame));
    console.log('发送开始帧', startFrame);
  }

  /**
   * 发送音频帧
   */
  private sendAudioFrame(audioData: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isRecording) return;

    // 直接发送二进制数据，不需要转换为JSON
    this.ws.send(audioData);
  }

  /**
   * 发送结束帧
   */
  private sendEndFrame(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const endFrame = {
      type: 'FINISH'
    };

    this.ws.send(JSON.stringify(endFrame));
    console.log('发送结束帧');
  }

  /**
   * 处理服务器消息
   */
  private handleMessage(data: any): void {
    try {
      const message: RecognitionResult = JSON.parse(data);
      
      if (message.err_no !== 0) {
        console.error('识别错误:', message.err_msg);
        this.onErrorCallback?.(message.err_msg);
        return;
      }

      if (message.result && message.result.length > 0) {
        const text = message.result;
        const isFinal = message.is_final === 1;
        
        console.log('识别结果:', text, '是否最终:', isFinal);
        this.onResultCallback?.(text, isFinal);
      }
    } catch (error) {
      console.error('处理消息失败:', error);
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
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onStatusCallback = null;
  }
}
