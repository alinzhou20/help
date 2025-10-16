# 右键菜单光标位置修复方案 v2

## 问题描述

用户需求：
- 左键点击可以正常设置光标位置
- 右键点击只用于打开菜单，不应改变光标位置

## 解决方案

### 核心原理

通过在更底层的事件（`onMouseDown`）中拦截右键点击，完全阻止浏览器移动光标的默认行为。

### 实现细节

1. **onMouseDown 事件处理**
   ```typescript
   const handleMouseDown = (e) => {
     if (e.button === 2) { // 右键
       e.preventDefault();
       e.stopPropagation();
       
       // 保存当前光标位置
       const currentSelectionStart = e.currentTarget.selectionStart;
       const currentSelectionEnd = e.currentTarget.selectionEnd;
       
       // 显示菜单
       setContextMenu({ x: e.clientX, y: e.clientY });
       
       // 恢复光标位置
       requestAnimationFrame(() => {
         textareaRef.current?.setSelectionRange(
           currentSelectionStart, 
           currentSelectionEnd
         );
       });
     }
   };
   ```

2. **onMouseUp 事件处理**
   ```typescript
   const handleMouseUp = (e) => {
     if (e.button === 2) { // 右键
       e.preventDefault();
       e.stopPropagation();
     }
   };
   ```

3. **onContextMenu 事件处理**
   ```typescript
   const handleContextMenu = (e) => {
     e.preventDefault(); // 仅用于阻止默认右键菜单
     e.stopPropagation();
     return false;
   };
   ```

### 关键点

1. **事件顺序**
   - `mousedown` → `mouseup` → `contextmenu`
   - 在 `mousedown` 阶段就阻止默认行为，防止光标移动

2. **鼠标按钮识别**
   - `e.button === 0`：左键
   - `e.button === 1`：中键
   - `e.button === 2`：右键

3. **光标恢复时机**
   - 使用 `requestAnimationFrame` 确保在浏览器下一帧恢复光标
   - 比 `setTimeout` 更可靠，性能更好

## 测试验证

### 左键功能
- ✅ 左键点击可正常设置光标位置
- ✅ 左键拖动可正常选择文本
- ✅ 左键双击可选中单词

### 右键功能
- ✅ 右键点击不改变光标位置
- ✅ 右键菜单正常显示
- ✅ 文本选择状态保持不变
- ✅ 输入框焦点保持

## 浏览器兼容性

该方案在以下浏览器中测试通过：
- Chrome/Edge (Chromium)
- Firefox
- Safari

## 与 v1 方案的区别

### v1 方案问题
- 在 `contextmenu` 事件中处理，此时光标已经移动
- 恢复光标会有闪烁

### v2 方案优势
- 在 `mousedown` 阶段拦截，完全阻止光标移动
- 用户体验更流畅，无闪烁
- 更符合用户预期
