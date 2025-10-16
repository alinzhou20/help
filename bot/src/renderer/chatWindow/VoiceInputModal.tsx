import React, { useState, useRef, useEffect } from 'react';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (text: string) => void;
}

const VoiceInputModal: React.FC<VoiceInputModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [tempText, setTempText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (tempText.trim()) {
      onConfirm(tempText.trim());
      setTempText('');
      onClose();
    }
  };

  const handleCancel = () => {
    setTempText('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="voice-modal-overlay" onClick={handleCancel}>
      <div className="voice-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="voice-modal-header">
          <h3>语音输入</h3>
          <button className="voice-modal-close" onClick={handleCancel}>
            ✕
          </button>
        </div>
        <div className="voice-modal-body">
          <div className="voice-modal-tips">
            🎤 请在下方输入您想说的内容
          </div>
          <textarea
            ref={textareaRef}
            className="voice-modal-textarea"
            placeholder="请输入您的问题或想说的话..."
            value={tempText}
            onChange={(e) => setTempText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleConfirm();
              }
            }}
            rows={5}
          />
          <div className="voice-modal-hint">
            按 Ctrl+Enter 快速发送
          </div>
        </div>
        <div className="voice-modal-footer">
          <button className="voice-modal-btn cancel" onClick={handleCancel}>
            取消
          </button>
          <button 
            className="voice-modal-btn confirm" 
            onClick={handleConfirm}
            disabled={!tempText.trim()}
          >
            确认输入
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceInputModal;
