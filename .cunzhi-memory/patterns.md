# 常用模式和最佳实践

- Socket.IO连接问题解决方案：当通过局域网IP访问时，客户端应始终连接到localhost:3001而不是IP:3001，这样可以避免防火墙和跨域问题。HTTPS页面可以连接到localhost的HTTP服务。如遇连接问题，需要配置Windows防火墙允许3001端口。
