@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║           Socket.io Server (HTTP Only)                   ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo 启动纯HTTP模式的Socket.io服务器...
echo.
echo 服务器地址: http://0.0.0.0:3001
echo.

node socketio-server.js

pause
