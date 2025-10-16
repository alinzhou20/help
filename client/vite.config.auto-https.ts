import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { URL } from 'node:url'
import fs from 'fs'
import path from 'path'

// 自动查找最新的证书文件
function findLatestCertFiles() {
  const files = fs.readdirSync('.')
  const certFiles = files.filter(f => f.endsWith('.pem') && f.includes('localhost'))
  
  if (certFiles.length === 0) {
    throw new Error('未找到证书文件！请先运行 generate-cert.bat 生成证书')
  }
  
  // 查找匹配的证书和密钥对
  const keyFile = certFiles.find(f => f.includes('-key.pem'))
  const certFile = certFiles.find(f => !f.includes('-key.pem'))
  
  if (!keyFile || !certFile) {
    throw new Error('证书文件不完整！')
  }
  
  console.log(`\n使用证书文件:`)
  console.log(`  证书: ${certFile}`)
  console.log(`  密钥: ${keyFile}\n`)
  
  return { keyFile, certFile }
}

// 自动检测证书文件
const { keyFile, certFile } = findLatestCertFiles()

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  assetsInclude: ['**/*.mp4'],
  server: {
    https: {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile),
    },
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts'
  }
})

