const fs = require('fs');
const path = require('path');

console.log('Current directory:', __dirname);
console.log('Files in current directory:');
fs.readdirSync(__dirname).forEach(file => {
    if (file.endsWith('.pem')) {
        console.log(`  - ${file}`);
    }
});

// 测试读取证书
try {
    const keyFile = 'localhost+3-key.pem';
    const certFile = 'localhost+3.pem';
    
    if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
        console.log('\nSSL certificates found!');
        const key = fs.readFileSync(keyFile);
        const cert = fs.readFileSync(certFile);
        console.log(`Key file size: ${key.length} bytes`);
        console.log(`Cert file size: ${cert.length} bytes`);
        
        // 测试创建HTTPS服务器
        const https = require('https');
        const express = require('express');
        const app = express();
        
        const server = https.createServer({ key, cert }, app);
        server.listen(3002, '0.0.0.0', () => {
            console.log('\nHTTPS server successfully started on port 3002!');
            console.log('Press Ctrl+C to exit');
        });
        
        server.on('error', (err) => {
            console.error('HTTPS server error:', err);
        });
    } else {
        console.log('\nSSL certificates not found in current directory!');
    }
} catch (err) {
    console.error('Error:', err);
}

