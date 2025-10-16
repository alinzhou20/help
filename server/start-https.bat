@echo off
echo.
echo ========================================
echo   Starting Socket.io Server with HTTPS
echo ========================================
echo.

:: 复制SSL证书到服务器目录
echo Copying SSL certificates...
copy /Y ..\vue-algo-tutor\localhost*.pem . >nul 2>&1

if %errorlevel% neq 0 (
    echo [ERROR] SSL certificates not found in vue-algo-tutor directory!
    echo Please generate certificates first by running:
    echo   cd ..\vue-algo-tutor
    echo   generate-cert.bat
    echo.
    pause
    exit /b 1
)

echo SSL certificates copied successfully.
echo.

:: 启动支持HTTPS的Socket.io服务器
echo Starting Socket.io server...
echo   HTTP:  http://0.0.0.0:3001
echo   HTTPS: https://0.0.0.0:3002
echo.

node socketio-server-https.js

pause

