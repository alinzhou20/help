@echo off
echo.
echo ========================================
echo   Starting Socket.io Server
echo ========================================
echo.

:: 检查证书文件
if exist localhost*.pem (
    echo SSL certificates found, HTTPS will be enabled.
) else (
    echo No SSL certificates found, HTTP only mode.
)

echo.
echo Starting server...
echo.

node socketio-server-https.js

pause

