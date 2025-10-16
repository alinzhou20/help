# 右键菜单光标位置修复

## 问题描述

在输入框中右键点击打开自定义菜单时，光标会自动移动到鼠标点击的位置，这会破坏用户当前的编辑状态。

## 原因分析

浏览器在处理右键点击事件时的默认行为包括：
1. 将光标移动到点击位置
2. 显示浏览器默认的右键菜单

虽然 `e.preventDefault()` 阻止了默认右键菜单的显示，但光标移动行为在 `preventDefault()` 调用之前就已经发生。

## 解决方案

在 `handleContextMenu` 函数中：

1. **记录当前光标位置**
   ```typescript
   const selectionStart = textarea.selectionStart;
   const selectionEnd = textarea.selectionEnd;
   ```

2. **显示自定义菜单**
   正常计算并显示菜单位置

3. **恢复光标位置**
   使用 `setTimeout` 在下一个事件循环中恢复光标位置：
   ```typescript
   setTimeout(() => {
     if (textareaRef.current) {
       textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
       textareaRef.current.focus();
     }
   }, 0);
   ```

## 技术要点

- **事件循环时机**：使用 `setTimeout(..., 0)` 确保在浏览器完成默认行为后再恢复光标位置
- **保持选择区域**：不仅保持光标位置，还保持用户的文本选择状态
- **焦点管理**：确保输入框保持焦点状态

## 用户体验改善

- 右键点击时光标位置保持不变
- 保留用户的文本选择状态
- 菜单操作更加流畅自然
- 符合用户的操作预期

## 测试场景

1. 在输入框中间右键点击 - 光标应保持在原位
2. 选中部分文本后右键点击 - 选择状态应保持
3. 在输入框末尾右键点击 - 光标应保持在末尾
4. 执行菜单操作后 - 焦点应保持在输入框
