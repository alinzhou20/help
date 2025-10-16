import React, { useState, useEffect, useRef } from 'react';
const cartoonImage = require('../../../assets/cartoon.png');

const FloatWindow: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dragRef = useRef({ 
    startX: 0, 
    startY: 0, 
    hasMoved: false // 添加标记，区分拖动和点击
  });

  useEffect(() => {
    // 每隔一段时间播放动画
    const animationTimer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }, 10000); // 每10秒动画一次

    return () => clearInterval(animationTimer);
  }, []);

  // 处理点击事件 - 切换聊天窗口
  const handleClick = () => {
    // 只有在没有拖动的情况下才切换聊天窗口
    if (!dragRef.current.hasMoved) {
      window.electronAPI.toggleChat();
    }
  };
  
  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    window.electronAPI.showContextMenu();
  };

  // 处理鼠标按下 - 开始拖动
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // 阻止事件冒泡
    
    // 只有左键才能拖动
    if (e.button !== 0) return;
    
    setIsDragging(true);
    
    // 记录初始鼠标位置，重置移动标记
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.hasMoved = false;
  };

  // 处理鼠标移动 - 拖动窗口
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    e.preventDefault();
    
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    
    // 只有移动超过阈值才算拖动（降低阈值使响应更灵敏）
    if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
      dragRef.current.hasMoved = true;
      
      // 立即移动窗口，无需requestAnimationFrame
      window.electronAPI.moveFloatWindow(deltaX, deltaY);
      
      // 更新起始位置
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
    }
  };

  // 处理鼠标释放 - 结束拖动
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // 如果没有移动，触发点击事件
      if (!dragRef.current.hasMoved) {
        handleClick();
      }
    }
  };

  // 添加全局事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging]);

  return (
    <div 
      className={`float-container ${isHovered ? 'hovered' : ''} ${isAnimating ? 'animating' : ''} ${isDragging ? 'dragging' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      {/* 助手图标容器 */}
      <div className="assistant-icon">
        <img 
          src={cartoonImage} 
          alt="Assistant" 
          className="assistant-image"
          draggable={false}
        />
      </div>
    </div>
  );
};

export default FloatWindow;
