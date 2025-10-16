import React from 'react';
import ReactDOM from 'react-dom/client';
import FloatWindow from './FloatWindow';
import './styles.css';

// 创建根节点并渲染应用
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <FloatWindow />
    </React.StrictMode>
  );
} else {
  console.error('找不到根节点元素');
}
