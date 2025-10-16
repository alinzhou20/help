@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║          配置Windows防火墙规则 (需要管理员权限)          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 此脚本需要管理员权限运行！
    echo.
    echo 请右键点击此文件，选择"以管理员身份运行"
    echo.
    pause
    exit /b 1
)

echo [1/3] 删除旧的防火墙规则...
netsh advfirewall firewall delete rule name="Socket.IO Server HTTP" >nul 2>&1

echo [2/3] 添加入站规则 (端口 3001)...
netsh advfirewall firewall add rule name="Socket.IO Server HTTP" dir=in action=allow protocol=TCP localport=3001

echo [3/3] 添加出站规则 (端口 3001)...
netsh advfirewall firewall add rule name="Socket.IO Server HTTP" dir=out action=allow protocol=TCP localport=3001

echo.
echo ✅ 防火墙规则配置完成！
echo.
echo Socket.IO服务器现在可以接受来自网络的连接了。
echo.
pause
