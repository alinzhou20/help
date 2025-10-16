@echo off
chcp 65001 >nul
:: Windows批处理文件 - 自动生成包含当前IP的SSL证书

echo.
echo ========================================
echo   Auto SSL Certificate Generator
echo ========================================
echo.

:: Check if mkcert is installed
where mkcert >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] mkcert is not installed!
    echo.
    echo Please install mkcert first:
    echo   1. Install Chocolatey package manager
    echo   2. Run: choco install mkcert
    echo.
    pause
    exit /b 1
)

echo [1/3] Getting local IP addresses...
echo.

:: Get IP addresses and generate certificate
powershell -Command "& { $ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^(192\.168\.|10\.|172\.)' } | Select-Object -ExpandProperty IPAddress; $hosts = @('localhost', '127.0.0.1', '::1') + $ips; Write-Host 'Including addresses:' -ForegroundColor Green; $hosts | ForEach-Object { Write-Host '  -' $_ }; Write-Host ''; & mkcert $hosts }"

echo.
echo [2/3] Finding generated certificate files...
echo.

:: Show generated certificate files
dir /b *.pem 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No certificate files found!
    pause
    exit /b 1
)

echo.
echo [3/3] Certificate generated successfully!
echo.
echo Please note:
echo   1. Update certificate filename in vite.config.https.ts
echo   2. Run 'npm run dev:https' to start HTTPS server
echo.
pause
