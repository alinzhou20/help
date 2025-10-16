@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║           算法教学系统 HTTPS 启动脚本                    ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: 检查证书
if not exist client\localhost*.pem (
    echo [警告] 未找到SSL证书文件，正在生成...
    echo.
    cd client
    call generate-cert.bat
    cd ..
    echo.
)

echo [1/2] 启动Socket.io服务器 (HTTP: 3001)...
start "Socket.io Server" cmd /k "cd server && node socketio-server.js"

timeout /t 2 >nul

echo [2/2] 启动Vue开发服务器 (HTTPS: 5173)...
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo   访问地址:
echo   - 本地: https://localhost:5173
echo   - 局域网: https://[您的IP]:5173
echo.
echo   服务器状态:
echo   - Socket.io: http://localhost:3001
echo.
echo ════════════════════════════════════════════════════════════
echo.

cd client
npm run dev:auto

pause
