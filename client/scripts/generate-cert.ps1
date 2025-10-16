# PowerShell脚本 - 自动生成包含当前IP的证书

# 获取所有本地IP地址
$ips = Get-NetIPAddress -AddressFamily IPv4 | 
       Where-Object { $_.IPAddress -match "^(192\.168\.|10\.|172\.)" } | 
       Select-Object -ExpandProperty IPAddress

# 构建mkcert命令
$hosts = @("localhost", "127.0.0.1", "::1")
$hosts += $ips

Write-Host "生成证书，包含以下地址：" -ForegroundColor Green
$hosts | ForEach-Object { Write-Host "  - $_" }

# 生成证书
& mkcert $hosts

Write-Host "`n证书生成成功！" -ForegroundColor Green
Write-Host "请更新 vite.config.https.ts 中的证书文件名" -ForegroundColor Yellow

