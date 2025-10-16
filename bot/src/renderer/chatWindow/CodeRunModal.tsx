import React, { useState, useEffect } from 'react';

interface CodeRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  onRun: (inputs?: string[]) => Promise<{ output: string; error?: string; executionTime: number; needsInput?: boolean; inputPrompts?: string[] }>;
}

const CodeRunModal: React.FC<CodeRunModalProps> = ({ isOpen, onClose, code, onRun }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [executionTime, setExecutionTime] = useState(0);
  const [needsInput, setNeedsInput] = useState(false);
  const [inputPrompts, setInputPrompts] = useState<string[]>([]);
  const [inputValues, setInputValues] = useState<string[]>([]);
  const [hasRun, setHasRun] = useState(false); // 标记是否已经运行过

  useEffect(() => {
    if (isOpen) {
      // 打开时自动运行代码
      handleRun();
    } else {
      // 关闭时清理状态
      setOutput('');
      setError('');
      setExecutionTime(0);
      setNeedsInput(false);
      setInputPrompts([]);
      setInputValues([]);
      setHasRun(false);
    }
  }, [isOpen]);

  const handleRun = async (inputs?: string[]) => {
    setIsRunning(true);
    setOutput('');
    setError('');
    setNeedsInput(false);
    setHasRun(false);
    
    try {
      const result = await onRun(inputs);
      
      if (result.needsInput) {
        // 需要输入
        setNeedsInput(true);
        setInputPrompts(result.inputPrompts || []);
        setInputValues(new Array(result.inputPrompts?.length || 0).fill(''));
      } else {
        // 正常输出
        setOutput(result.output);
        setError(result.error || '');
        setExecutionTime(result.executionTime);
        setHasRun(true); // 标记已运行完成
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '运行失败');
      setHasRun(true); // 即使出错也标记为已运行
    } finally {
      setIsRunning(false);
    }
  };
  
  const handleSubmitInputs = () => {
    handleRun(inputValues);
  };
  
  const handleInputChange = (index: number, value: string) => {
    const newValues = [...inputValues];
    newValues[index] = value;
    setInputValues(newValues);
  };

  if (!isOpen) return null;

  return (
    <div className="code-run-modal-overlay" onClick={onClose}>
      <div className="code-run-modal" onClick={(e) => e.stopPropagation()}>
        <div className="code-run-header">
          <h3>程序运行窗口</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="code-run-content">
          {isRunning ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>正在运行 Python 代码...</p>
            </div>
          ) : (
            <>
              {/* 代码预览 */}
              <div className="code-preview">
                <div className="section-title">代码：</div>
                <pre className="code-display">{code}</pre>
              </div>
              
              {/* 需要输入时显示输入界面 */}
              {needsInput && (
                <div className="input-section">
                  <div className="section-title">程序需要输入：</div>
                  {inputPrompts.map((prompt, index) => (
                    <div key={index} className="input-item">
                      <label className="input-label">{prompt}</label>
                      <input
                        type="text"
                        className="input-field"
                        value={inputValues[index] || ''}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && index === inputPrompts.length - 1) {
                            handleSubmitInputs();
                          }
                        }}
                        placeholder="请输入..."
                        autoFocus={index === 0}
                      />
                    </div>
                  ))}
                  <button 
                    className="btn-primary submit-btn" 
                    onClick={handleSubmitInputs}
                  >
                    提交输入并运行
                  </button>
                </div>
              )}
              
              {/* 运行结果 - 始终显示（当已运行且不需要输入时） */}
              {!needsInput && hasRun && (
                <div className="run-results">
                  {/* 输出区域 - 始终显示，即使为空 */}
                  <div className="output-section">
                    <div className="section-title">输出：</div>
                    <pre className="output-display">{output || ''}</pre>
                  </div>
                  
                  {error && (
                    <div className="error-section">
                      <div className="section-title error">错误：</div>
                      <pre className="error-display">{error}</pre>
                    </div>
                  )}
                  
                  <div className="execution-info">
                    <span className="execution-status">
                      {error ? '❌ 运行失败' : '✅ 运行成功'}
                    </span>
                    <span className="execution-time">执行时间：{executionTime.toFixed(2)} ms</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="code-run-footer">
          <button 
            className="btn-secondary" 
            onClick={() => handleRun()} 
            disabled={isRunning}
          >
            重新运行
          </button>
          <button className="btn-primary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeRunModal;
