/**
 * 音频处理工具类
 * 用于将浏览器录制的音频转换为百度语音识别所需的PCM格式
 */

export class AudioProcessor {
  private audioContext: AudioContext;
  private sampleRate = 16000; // 百度API要求的采样率

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.sampleRate
    });
  }

  /**
   * 将Blob转换为PCM数据
   */
  async blobToPCM(blob: Blob): Promise<ArrayBuffer> {
    try {
      // 将Blob转换为ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();
      
      // 解码音频数据
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // 提取PCM数据
      const pcmData = this.extractPCM(audioBuffer);
      
      return pcmData;
    } catch (error) {
      console.error('音频转换失败:', error);
      throw error;
    }
  }

  /**
   * 从AudioBuffer提取PCM数据
   */
  private extractPCM(audioBuffer: AudioBuffer): ArrayBuffer {
    // 获取左声道数据（单声道）
    const channelData = audioBuffer.getChannelData(0);
    
    // 重采样到16kHz（如果需要）
    const resampledData = this.resample(channelData, audioBuffer.sampleRate, this.sampleRate);
    
    // 转换为16位PCM
    const pcm16 = this.float32ToPCM16(resampledData);
    
    return pcm16.buffer as ArrayBuffer;
  }

  /**
   * 重采样音频数据
   */
  private resample(data: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array {
    if (fromSampleRate === toSampleRate) {
      return data;
    }

    const ratio = fromSampleRate / toSampleRate;
    const newLength = Math.round(data.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const index = i * ratio;
      const indexFloor = Math.floor(index);
      const indexCeil = Math.min(indexFloor + 1, data.length - 1);
      const fraction = index - indexFloor;
      
      result[i] = data[indexFloor] * (1 - fraction) + data[indexCeil] * fraction;
    }

    return result;
  }

  /**
   * 将Float32Array转换为16位PCM
   */
  private float32ToPCM16(float32Array: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32Array.length);
    
    for (let i = 0; i < float32Array.length; i++) {
      // 限制在-1到1之间
      let sample = Math.max(-1, Math.min(1, float32Array[i]));
      // 转换为16位整数
      pcm16[i] = sample * 0x7FFF;
    }
    
    return pcm16;
  }

  /**
   * 将PCM数据转换为Base64
   */
  pcmToBase64(pcmData: ArrayBuffer): string {
    const bytes = new Uint8Array(pcmData);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * 直接从MediaStream获取PCM数据流（使用MediaRecorder方式）
   */
  async createPCMRecorder(stream: MediaStream, onData: (data: ArrayBuffer) => void): Promise<MediaRecorder> {
    // 使用MediaRecorder录音，并定期获取数据
    const recorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000
    });
    
    recorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        try {
          const pcmData = await this.blobToPCM(event.data);
          onData(pcmData);
        } catch (error) {
          console.error('处理音频数据失败:', error);
        }
      }
    };
    
    // 每100ms获取一次数据
    recorder.start(100);
    
    return recorder;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
