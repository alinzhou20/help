import React, { useState, useEffect, useRef } from 'react';
import VoiceInputModal from './VoiceInputModal';
import { SimpleSpeechRecognition } from './SimpleSpeechRecognition';
import { CozeVoiceRecognition } from './CozeVoiceRecognition';
import { pythonRunner } from './PythonRunner';
import CodeRunModal from './CodeRunModal';
const cartoonImage = require('../../../assets/cartoon.png');

// 消息类型定义
interface CustomMessage {
  id: string;
  content: string;
  code?: string; // 代码内容（可选）
  role: 'user' | 'assistant';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<CustomMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [tempVoiceText, setTempVoiceText] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [useCozeVoice] = useState(true); // 使用 Coze 语音识别
  const [cozeReady, setCozeReady] = useState(false); // Coze 客户端是否就绪
  const [codeRunModal, setCodeRunModal] = useState<{ isOpen: boolean; code: string }>({ isOpen: false, code: '' });
  const [pythonReady, setPythonReady] = useState(false);
  const [pythonLoadProgress, setPythonLoadProgress] = useState(0);
  const [isPythonInitializing, setIsPythonInitializing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speechRecognitionRef = useRef<SimpleSpeechRecognition | null>(null);
  const cozeVoiceRef = useRef<CozeVoiceRecognition | null>(null);
  const lastTranscriptRef = useRef<string>(''); // 记录上次的转录文本
  const messagesEndRef = useRef<HTMLDivElement>(null); // 用于自动滚动
  const originalInputRef = useRef<string>(''); // 记录语音输入前的原始内容

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 添加欢迎消息
  useEffect(() => {
    // 初始化时添加开场白
    const welcomeMessage: CustomMessage = {
      id: 'welcome',
      content: '大家好，我是小敏老师，我可以帮助你解决Python相关问题。',
      role: 'assistant',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // 监听消息变化，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化 Python 运行环境 - 预加载
  useEffect(() => {
    // 设置进度回调
    pythonRunner.setProgressCallback((progress) => {
      setPythonLoadProgress(progress);
    });

    // 延迟预加载，避免影响应用启动速度
    const timer = setTimeout(() => {
      console.log('开始预加载 Python 环境');
      setIsPythonInitializing(true);
      
      pythonRunner.preload()
        .then(() => {
          setPythonReady(true);
          setIsPythonInitializing(false);
          console.log('Python 运行环境预加载完成');
        })
        .catch(error => {
          console.error('Python 运行环境初始化失败:', error);
          setPythonReady(false);
          setIsPythonInitializing(false);
          
          // 显示更详细的错误信息
          const errorMessage = error instanceof Error ? error.message : 'Python 运行环境加载失败';
          alert(errorMessage);
        });
    }, 2000); // 延迟 2 秒后开始预加载

    return () => clearTimeout(timer);
  }, []);

  // 初始化语音识别
  useEffect(() => {
    speechRecognitionRef.current = new SimpleSpeechRecognition();

    // 设置回调函数
    speechRecognitionRef.current.onResult((text, isFinal) => {
      if (isFinal) {
        // 最终结果，追加到输入框
        setInputValue(prev => {
          const newValue = prev ? prev + ' ' + text : text;
          return newValue;
        });
        setTempVoiceText(''); // 清空临时文本
      } else {
        // 中间结果，显示在临时区域
        setTempVoiceText(text);
      }
    });

    speechRecognitionRef.current.onError((error) => {
      console.error('语音识别错误:', error);
      // 显示错误信息
      alert(error);
      setIsListening(false);
    });

    speechRecognitionRef.current.onStatus((status) => {
      console.log('语音识别状态:', status);
      if (status === 'stopped' || status === 'error') {
        setIsListening(false);
      }
    });

    // 清理函数
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.dispose();
      }
    };
  }, []);

  // 自动调整文本框高度
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // 限制最大高度为120px（约5行）
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  };

  // 监听输入值变化，调整高度
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);
  
  // 清理语音识别资源
  useEffect(() => {
    return () => {
      // 组件卸载时清理
      if (cozeVoiceRef.current) {
        cozeVoiceRef.current.destroy();
        cozeVoiceRef.current = null;
      }
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
    };
  }, []);

  // 点击其他地方时关闭右键菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleContextMenu = (e: MouseEvent) => {
      // 如果右键点击的不是输入框，关闭菜单
      if (!textareaRef.current?.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    
    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // 生成消息ID
  const generateMessageId = () => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // 发送消息
  const handleSend = async (_innerHtml: string, textContent: string) => {
    const trimmedInput = textContent.trim();
    if (!trimmedInput || isLoading) return;

    // 创建用户消息
    const userMessage: CustomMessage = {
      id: generateMessageId(),
      content: trimmedInput,
      role: 'user',
      timestamp: new Date(),
      status: 'sending',
    };

    // 添加用户消息到列表
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // 调用Electron API发送消息
      const response = await window.electronAPI.sendMessage(trimmedInput);
      
      // 更新用户消息状态
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'sent' }
            : msg
        )
      );

      // 添加助手回复
      if (response.success) {
        const data = response.data;
        
        // 处理响应数据
        let content = '';
        let code = '';
        
        if (data.output1) {
          content = data.output1; // 文本内容
        }
        
        if (data.output2) {
          // 清理代码字符串（移除多余的转义）
          code = data.output2.replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
        
        const assistantMessage: CustomMessage = {
          id: generateMessageId(),
          content: content || '没有文本响应',
          code: code,
          role: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(response.error || '发送失败');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 更新用户消息状态为错误
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'error' }
            : msg
        )
      );
      
      // 添加错误提示消息
      const errorMessage: CustomMessage = {
        id: generateMessageId(),
        content: '抱歉，消息发送失败。请检查网络连接并重试。',
        role: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // 清空聊天记录
  const handleClearChat = () => {
    if (window.confirm('确定要清空所有聊天记录吗？')) {
      const welcomeMessage: CustomMessage = {
        id: 'welcome-new',
        content: '大家好，我是小敏老师，我可以帮助你解决Python相关问题。',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  };

  // 最小化到浮窗
  const handleMinimize = () => {
    window.electronAPI.minimizeToFloat();
  };

  // 复制代码到剪贴板
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      // 可以添加复制成功的提示
      console.log('代码已复制到剪贴板');
    }).catch((err) => {
      console.error('复制失败:', err);
    });
  };

  // 运行 Python 代码
  const handleRunCode = async (code: string) => {
    if (!pythonReady && !isPythonInitializing) {
      // 如果未初始化且不在初始化中，立即开始初始化
      setIsPythonInitializing(true);
      try {
        await pythonRunner.initialize();
        setPythonReady(true);
        setIsPythonInitializing(false);
      } catch (error) {
        console.error('Python 环境初始化失败:', error);
        const errorMessage = error instanceof Error ? error.message : '无法加载 Python 运行环境';
        alert(errorMessage);
        setIsPythonInitializing(false);
        return;
      }
    } else if (!pythonReady && isPythonInitializing) {
      alert(`Python 运行环境正在加载中 (${pythonLoadProgress}%)，请稍后...`);
      return;
    }
    
    // 只打开模态框，让模态框自己运行代码
    setCodeRunModal({ isOpen: true, code });
  };

  // 初始化 Coze 语音识别
  const initCozeVoice = async () => {
    if (!cozeVoiceRef.current) {
      // Coze API Token
      const COZE_TOKEN = 'pat_qEi7EbLQ58XZ5rOfCmunL0jgu73OfbFtHMPG6p0EBehkFDZ0j97r3wfMGgjlnX0F';
      
      cozeVoiceRef.current = new CozeVoiceRecognition({
        token: COZE_TOKEN,
        onTranscript: (text) => {
          // 实时更新识别结果到输入框（在原有内容基础上追加）
          const newValue = originalInputRef.current + (originalInputRef.current && text ? ' ' : '') + text;
          setInputValue(newValue);
          setTempVoiceText(text);
          // 保存完整的值（包含原始内容），而不是只保存语音部分
          lastTranscriptRef.current = newValue;
        },
        onError: (error) => {
          console.error('Coze语音识别错误:', error);
          setIsListening(false);
          setCozeReady(false);
          // 使用模态框作为备选方案
          setShowVoiceModal(true);
        },
        onStatusChange: (status) => {
          console.log('语音识别状态变化:', status);
          if (status === 'idle') {
            setIsListening(false);
            // 停止时保留最后的识别文本在输入框
            if (lastTranscriptRef.current) {
              setInputValue(lastTranscriptRef.current);
              lastTranscriptRef.current = '';
            }
            setTempVoiceText('');
          }
        }
      });
      
      try {
        await cozeVoiceRef.current.initialize();
        setCozeReady(true);
        console.log('Coze 语音识别已就绪');
        return cozeVoiceRef.current;
      } catch (error) {
        console.error('初始化 Coze 语音识别失败:', error);
        setCozeReady(false);
        throw error;
      }
    }
    return cozeVoiceRef.current;
  };

  // 预加载 Coze 语音识别（组件加载时初始化）
  useEffect(() => {
    if (useCozeVoice) {
      // 延迟初始化，避免阻塞界面
      const timer = setTimeout(() => {
        initCozeVoice().catch(error => {
          console.error('预加载 Coze 失败:', error);
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    // 返回空函数，确保所有代码路径都有返回值
    return () => {};
  }, [useCozeVoice]);

  // 处理语音输入
  const handleVoiceInput = async () => {
    if (useCozeVoice) {
      // 使用 Coze 语音识别
      if (isListening) {
        // 停止录音
        if (cozeVoiceRef.current) {
          cozeVoiceRef.current.stop();
        }
        setIsListening(false);
        
        // 确保最终内容正确
        // lastTranscriptRef.current 已经包含了完整内容（原始内容+语音内容）
        if (lastTranscriptRef.current) {
          setInputValue(lastTranscriptRef.current);
        }
        
        setTempVoiceText('');
        originalInputRef.current = ''; // 清空原始内容引用
        lastTranscriptRef.current = ''; // 清空转录引用
      } else {
        // 开始录音
        try {
          // 保存当前输入框内容，清空临时内容
          originalInputRef.current = inputValue;
          lastTranscriptRef.current = '';
          setTempVoiceText('');
          
          // 如果已经初始化，直接开始
          if (cozeReady && cozeVoiceRef.current) {
            setIsListening(true);
            await cozeVoiceRef.current.start();
          } else {
            // 未初始化则先初始化
            setIsListening(true);
            const coze = await initCozeVoice();
            await coze.start();
          }
        } catch (error) {
          console.error('启动 Coze 语音识别失败:', error);
          setIsListening(false);
          // 使用模态框作为备选方案
          setShowVoiceModal(true);
        }
      }
    } else {
      // 使用原有的语音识别
      if (!speechRecognitionRef.current || !speechRecognitionRef.current.isSupported()) {
        // 如果语音识别不可用，使用模态框
        setShowVoiceModal(true);
        return;
      }

      if (isListening) {
        // 停止录音
        speechRecognitionRef.current.stop();
        setIsListening(false);
        
        // 如果有临时文本，添加到输入框
        if (tempVoiceText) {
          setInputValue(prev => {
            const newValue = prev ? prev + ' ' + tempVoiceText : tempVoiceText;
            return newValue;
          });
          setTempVoiceText('');
        }
      } else {
        try {
          // 开始录音
          await speechRecognitionRef.current.start();
          setIsListening(true);
        } catch (error: any) {
          console.error('启动语音识别失败:', error);
          // 如果启动失败，使用模态框作为备选方案
          setShowVoiceModal(true);
        }
      }
    }
  };

  // 处理语音输入模态框确认
  const handleVoiceModalConfirm = (text: string) => {
    setInputValue(prev => {
      // 如果输入框已有内容，追加一个空格
      return prev ? prev + ' ' + text : text;
    });
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // 处理鼠标按下事件（用于右键菜单）
  const handleMouseDown = (e: React.MouseEvent<HTMLTextAreaElement>): void => {
    // 只处理右键点击（button === 2）
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      
      // 保存当前光标位置
      const currentSelectionStart = e.currentTarget.selectionStart;
      const currentSelectionEnd = e.currentTarget.selectionEnd;
      
      // 估算菜单高度（5个项目 + 分隔线）
      const menuHeight = 180; 
      const menuWidth = 150;
      
      // 获取窗口尺寸
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      
      // 计算菜单位置
      let x = e.clientX;
      let y = e.clientY;
      
      // 如果菜单会超出底部边界，向上显示
      if (y + menuHeight > windowHeight) {
        y = y - menuHeight;
      }
      
      // 如果菜单会超出右侧边界，向左显示
      if (x + menuWidth > windowWidth) {
        x = x - menuWidth;
      }
      
      // 确保菜单不会超出左侧和顶部边界
      x = Math.max(5, x);
      y = Math.max(5, y);
      
      setContextMenu({ x, y });
      
      // 立即恢复光标位置
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(currentSelectionStart, currentSelectionEnd);
        }
      });
    }
    // 左键点击正常处理，不做任何阻止
  };
  
  // 处理鼠标抬起事件
  const handleMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>): void => {
    // 只处理右键（button === 2）
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  
  // 处理右键菜单事件（仅用于阻止默认菜单）
  const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // 剪切
  const handleCut = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = inputValue.substring(start, end);
      
      if (selectedText) {
        navigator.clipboard.writeText(selectedText);
        const newValue = inputValue.substring(0, start) + inputValue.substring(end);
        setInputValue(newValue);
      }
    }
    setContextMenu(null);
  };

  // 复制
  const handleCopy = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = inputValue.substring(start, end);
      
      if (selectedText) {
        navigator.clipboard.writeText(selectedText);
      }
    }
    setContextMenu(null);
  };

  // 粘贴
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (textareaRef.current && text) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const newValue = inputValue.substring(0, start) + text + inputValue.substring(end);
        setInputValue(newValue);
        
        // 设置光标位置
        setTimeout(() => {
          if (textareaRef.current) {
            const newPosition = start + text.length;
            textareaRef.current.setSelectionRange(newPosition, newPosition);
            textareaRef.current.focus();
          }
        }, 0);
      }
    } catch (err) {
      console.error('粘贴失败:', err);
    }
    setContextMenu(null);
  };

  // 全选
  const handleSelectAll = () => {
    if (textareaRef.current) {
      textareaRef.current.select();
      textareaRef.current.focus();
    }
    setContextMenu(null);
  };

  // 格式化文本，处理序号换行
  const formatMessageContent = (content: string): React.ReactNode => {
    // 正则匹配序号模式：1. 2. 3. 或 1) 2) 3) 或 (1) (2) (3) 或 一、二、三、
    const patterns = [
      /(\d+)\.\s/g,           // 1. 2. 3.
      /(\d+)\)\s/g,           // 1) 2) 3)
      /\((\d+)\)\s/g,         // (1) (2) (3)
      /[一二三四五六七八九十]+、/g,  // 一、二、三、
    ];
    
    let formattedContent = content;
    
    // 对每个模式进行替换，在序号前添加换行
    patterns.forEach(pattern => {
      formattedContent = formattedContent.replace(pattern, (match, _p1, offset) => {
        // 如果不是字符串开头，则在前面加换行
        if (offset > 0) {
          return '\n' + match;
        }
        return match;
      });
    });
    
    // 将文本分割成段落
    const paragraphs = formattedContent.split('\n').filter(p => p.trim());
    
    return (
      <>
        {paragraphs.map((paragraph, index) => (
          <React.Fragment key={index}>
            {paragraph}
            {index < paragraphs.length - 1 && <br />}
          </React.Fragment>
        ))}
      </>
    );
  };

  // 渲染代码块
  const renderCodeBlock = (code: string) => {
    // 处理代码字符串，移除多余的转义和引号
    let cleanCode = code;
    // 如果代码以```python开始，提取代码内容
    if (cleanCode.includes('```python')) {
      cleanCode = cleanCode.replace(/```python\n?/g, '').replace(/```\n?/g, '');
    }
    // 移除多余的转义字符
    cleanCode = cleanCode.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    
    return (
      <div className="code-block-container">
        <div className="code-header">
          <span className="code-language">Python</span>
          <div className="code-actions">
            <button 
              onClick={() => handleRunCode(cleanCode)}
              className="run-btn"
              type="button"
              disabled={!pythonReady && isPythonInitializing}
              title={
                pythonReady 
                  ? "运行代码" 
                  : isPythonInitializing 
                    ? `Python 环境加载中... (${pythonLoadProgress}%)` 
                    : "点击加载 Python 环境"
              }
            >
              {pythonReady ? '▶️ 运行' : '⏳ 加载中'}
            </button>
            <button 
              onClick={() => handleCopyCode(cleanCode)}
              className="copy-btn"
              type="button"
            >
              📋 复制
            </button>
          </div>
        </div>
        <pre className="code-content">
          <code>{cleanCode}</code>
        </pre>
      </div>
    );
  };

  return (
    <div className="chat-window-container">
      {/* 语音输入模态框 */}
      <VoiceInputModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onConfirm={handleVoiceModalConfirm}
      />
      
      {/* 代码运行模态框 */}
      <CodeRunModal
        isOpen={codeRunModal.isOpen}
        onClose={() => setCodeRunModal({ isOpen: false, code: '' })}
        code={codeRunModal.code}
        onRun={(inputs) => pythonRunner.runCode(codeRunModal.code, inputs)}
      />
      
      {/* 右键菜单 */}
      {contextMenu && (
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000
          }}
          onMouseDown={(e) => e.preventDefault()} // 阻止鼠标按下事件，避免影响输入框焦点
        >
          <div className="context-menu-item" onClick={handleCut}>
            ✂️ 剪切
          </div>
          <div className="context-menu-item" onClick={handleCopy}>
            📋 复制
          </div>
          <div className="context-menu-item" onClick={handlePaste}>
            📄 粘贴
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={handleSelectAll}>
            🔤 全选
          </div>
        </div>
      )}
      
      {/* 自定义顶部栏 */}
      <div className="custom-header">
        <div className="header-drag-region">
          <div className="header-logo">
            <img src={cartoonImage} alt="Logo" className="logo-image" />
            <span className="header-title">小敏老师</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={handleClearChat} title="清空聊天">
            🗑️
          </button>
          <button className="header-btn" onClick={handleMinimize} title="最小化">
            ➖
          </button>
        </div>
      </div>


      {/* 聊天容器 */}
      <div className={`chat-main-container`}>
        <div className="chat-content">
          <div className="message-list-container">
            {messages.map((message, index) => (
              <React.Fragment key={message.id}>
                {/* 添加日期分隔符 */}
                {index === 0 || 
                 new Date(message.timestamp).toDateString() !== 
                 new Date(messages[index - 1].timestamp).toDateString() ? (
                  <div className="date-separator">
                    {new Date(message.timestamp).toLocaleDateString('zh-CN')}
                  </div>
                ) : null}
                
                {/* 消息内容 */}
                <div className={`message-wrapper ${message.role}`}>
                  {message.role === 'assistant' && (
                    <div className="message-avatar">
                      <img src={cartoonImage} alt="AI" className="avatar-image" />
                    </div>
                  )}
                  
                  <div className="message-content-wrapper">
                    {/* 如果有代码，先渲染代码块 */}
                    {message.code && message.role === 'assistant' && (
                      <div className="code-wrapper">
                        {renderCodeBlock(message.code)}
                      </div>
                    )}
                    
                    <div className={`message-bubble ${message.role}`}>
                      <span className="message-text">{formatMessageContent(message.content)}</span>
                      {message.status === 'error' && (
                        <span className="error-indicator">❌</span>
                      )}
                    </div>
                    
                    <div className="message-time">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="message-avatar user">
                      <div className="avatar-icon">👤</div>
                    </div>
                  )}
                </div>
              </React.Fragment>
            ))}
            {/* 输入提示 */}
            {isTyping && (
              <div className="typing-indicator">
                <span>小敏老师正在思考...</span>
              </div>
            )}
            {/* 滚动定位元素 */}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* 自定义输入框 */}
        <div className="custom-input-container">
          {/* 语音识别状态显示 */}
          {isListening && useCozeVoice && (
            <div className="voice-status-bar">
              <span className="voice-status-icon">🎙️</span>
              <span className="voice-status-text">正在聆听中...</span>
              <span className="voice-status-pulse"></span>
            </div>
          )}
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              className="message-input-field"
              placeholder={isListening ? "正在聆听..." : "请输入你的问题..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend('', inputValue);
                }
              }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onContextMenu={handleContextMenu}
              disabled={isLoading || isListening}
              rows={1}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
            <div className="input-buttons">
              <button 
                className="input-button attach-btn"
                onClick={() => {}}
                disabled={isLoading}
                title="添加附件"
              >
                ➕
              </button>
              <button 
                className={`input-button mic-btn ${isListening ? 'recording' : ''} ${useCozeVoice && !cozeReady && !isListening ? 'loading' : ''}`}
                onClick={handleVoiceInput}
                disabled={isLoading}
                title={
                  isListening ? "停止录音" : 
                  (useCozeVoice && !cozeReady ? "正在准备语音识别..." : "语音输入")
                }
              >
                {isListening ? '🔴' : 
                 (useCozeVoice && !cozeReady ? '⏳' : '🎤')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;