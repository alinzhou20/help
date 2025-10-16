/**
 * Python 代码运行器
 * 使用 Pyodide 在浏览器中运行 Python 代码
 */

export interface PythonRunResult {
  output: string;
  error?: string;
  executionTime: number;
  needsInput?: boolean;
  inputPrompts?: string[];
}

export class PythonRunner {
  private pyodide: any = null;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;
  private static instance: PythonRunner | null = null;
  private loadProgress = 0;
  private onProgressCallback?: (progress: number) => void;
  
  /**
   * 获取单例实例
   */
  static getInstance(): PythonRunner {
    if (!PythonRunner.instance) {
      PythonRunner.instance = new PythonRunner();
    }
    return PythonRunner.instance;
  }
  
  /**
   * 设置进度回调
   */
  setProgressCallback(callback: (progress: number) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * 初始化 Pyodide
   */
  async initialize(): Promise<void> {
    if (this.pyodide) {
      return;
    }
    
    if (this.isLoading) {
      // 如果正在加载，等待加载完成
      if (this.loadPromise) {
        await this.loadPromise;
        return;
      }
    }
    
    this.isLoading = true;
    this.loadProgress = 0;
    
    // 创建加载 Promise
    this.loadPromise = this.loadPyodide();
    
    try {
      await this.loadPromise;
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * 预加载 Pyodide（在应用启动时调用）
   */
  async preload(): Promise<void> {
    if (!this.pyodide && !this.isLoading) {
      console.log('预加载 Pyodide...');
      await this.initialize();
    }
  }
  
  /**
   * 加载 Pyodide
   */
  private async loadPyodide(): Promise<void> {
    try {
      console.log('开始加载 Pyodide...');
      
      // 检查是否已经加载了 Pyodide
      if ((window as any).pyodide) {
        this.pyodide = (window as any).pyodide;
        console.log('使用已缓存的 Pyodide 实例');
        this.updateProgress(100);
        return;
      }
      
      this.updateProgress(10);
      
      // 使用本地 Pyodide
      let pyodideIndexURL = './pyodide/';
      
      // 加载本地 Pyodide
      console.log('从本地加载 Pyodide...');
      const script = document.createElement('script');
      script.src = pyodideIndexURL + 'pyodide.js';
      script.async = true;
      
      await new Promise((resolve, reject) => {
        script.onload = () => {
          console.log('本地 Pyodide 脚本加载成功');
          resolve(null);
        };
        script.onerror = (error) => {
          console.error('本地 Pyodide 加载失败:', error);
          reject(new Error('无法加载本地 Python 运行环境。请确保应用完整安装。'));
        };
        document.head.appendChild(script);
      });
      
      this.updateProgress(40);
      
      // 等待全局 loadPyodide 函数可用
      let waitCount = 0;
      while (!(window as any).loadPyodide && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
      
      if (!(window as any).loadPyodide) {
        throw new Error('Pyodide 加载超时');
      }
      
      this.updateProgress(50);
      
      // 加载 Pyodide
      this.pyodide = await (window as any).loadPyodide({
        indexURL: pyodideIndexURL,
        stdout: (text: string) => {
          console.log('Python stdout:', text);
        },
        stderr: (text: string) => {
          console.error('Python stderr:', text);
        },
      });
      
      this.updateProgress(80);
      
      // 将 pyodide 实例保存到全局，以便复用
      (window as any).pyodide = this.pyodide;
      
      // 设置标准输出捕获
      await this.pyodide.runPythonAsync(`
        import sys
        from io import StringIO
        
        # 创建一个字符串缓冲区来捕获输出
        _stdout_buffer = StringIO()
        _stderr_buffer = StringIO()
        
        # 保存原始的 stdout 和 stderr
        _original_stdout = sys.stdout
        _original_stderr = sys.stderr
      `);
      
      console.log('Pyodide 加载成功');
      this.updateProgress(100);
    } catch (error) {
      console.error('加载 Pyodide 失败:', error);
      this.updateProgress(0);
      
      // 提供更详细的错误信息
      let errorMessage = '无法加载 Python 运行环境。';
      if (error instanceof Error) {
        if (error.message.includes('无法加载本地')) {
          errorMessage = error.message + '\n请确保应用完整安装，或尝试重新安装应用。';
        } else {
          errorMessage += `\n错误详情: ${error.message}`;
        }
      }
      
      throw new Error(errorMessage);
    }
  }
  
  /**
   * 更新加载进度
   */
  private updateProgress(progress: number): void {
    this.loadProgress = progress;
    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }
  }
  
  /**
   * 获取加载进度
   */
  getLoadProgress(): number {
    return this.loadProgress;
  }
  
  /**
   * 运行 Python 代码
   */
  async runCode(code: string, inputs?: string[]): Promise<PythonRunResult> {
    const startTime = performance.now();
    
    try {
      // 确保已初始化
      await this.initialize();
      
      // 检测代码中是否有 input() 调用
      const hasInput = /\binput\s*\(/.test(code);
      
      // 如果有 input() 但没有提供输入，返回需要输入的提示
      if (hasInput && (!inputs || inputs.length === 0)) {
        // 提取 input() 的提示信息
        const inputPrompts = this.extractInputPrompts(code);
        return {
          output: '',
          error: undefined,
          executionTime: 0,
          needsInput: true,
          inputPrompts,
        };
      }
      
      // 重置输出缓冲区并重定向输出
      await this.pyodide.runPythonAsync(`
        _stdout_buffer = StringIO()
        _stderr_buffer = StringIO()
        sys.stdout = _stdout_buffer
        sys.stderr = _stderr_buffer
        
        # 如果有输入，创建模拟的 input 函数
        ${hasInput && inputs ? `
        _input_values = ${JSON.stringify(inputs)}
        _input_index = 0
        
        def input(prompt=''):
            global _input_index
            if prompt:
                print(prompt, end='')
            if _input_index < len(_input_values):
                value = _input_values[_input_index]
                _input_index += 1
                print(value)  # 模拟用户输入的回显
                return value
            else:
                raise EOFError('没有更多的输入值')
        ` : ''}
      `);
      
      // 运行用户代码
      await this.pyodide.runPythonAsync(code);
      
      // 获取输出
      const output = await this.pyodide.runPythonAsync(`
        sys.stdout = _original_stdout
        sys.stderr = _original_stderr
        _stdout_buffer.getvalue()
      `);
      
      const error = await this.pyodide.runPythonAsync(`
        _stderr_buffer.getvalue()
      `);
      
      const executionTime = performance.now() - startTime;
      
      return {
        output: output || '',
        error: error || undefined,
        executionTime,
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      // 恢复原始输出
      try {
        await this.pyodide.runPythonAsync(`
          sys.stdout = _original_stdout
          sys.stderr = _original_stderr
        `);
      } catch {}
      
      return {
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }
  
  /**
   * 提取代码中的 input() 提示信息
   */
  private extractInputPrompts(code: string): string[] {
    const prompts: string[] = [];
    const inputRegex = /\binput\s*\(\s*(['"](.*?)['"]|([^)]*?))\s*\)/g;
    let match;
    
    while ((match = inputRegex.exec(code)) !== null) {
      const prompt = match[2] || match[3] || '请输入:';
      prompts.push(prompt.trim());
    }
    
    // 如果没有找到提示，但有 input()，添加默认提示
    if (prompts.length === 0 && /\binput\s*\(/.test(code)) {
      prompts.push('请输入:');
    }
    
    return prompts;
  }
  
  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.pyodide !== null;
  }
  
  /**
   * 安装 Python 包
   */
  async installPackage(packageName: string): Promise<void> {
    if (!this.pyodide) {
      throw new Error('Pyodide 未初始化');
    }
    
    try {
      await this.pyodide.loadPackage(packageName);
      console.log(`包 ${packageName} 安装成功`);
    } catch (error) {
      console.error(`安装包 ${packageName} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 获取已安装的包列表
   */
  async getInstalledPackages(): Promise<string[]> {
    if (!this.pyodide) {
      return [];
    }
    
    try {
      const packages = await this.pyodide.runPythonAsync(`
        import micropip
        list(micropip.list())
      `);
      return packages;
    } catch {
      return [];
    }
  }
  
  /**
   * 清理资源
   */
  destroy(): void {
    this.pyodide = null;
    this.isLoading = false;
    this.loadPromise = null;
  }
}

// 创建单例实例
export const pythonRunner = new PythonRunner();
