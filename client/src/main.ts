import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/styles/global.css'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './utils/clearLock' // 加载锁清理工具

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')

// 智能缩放设置：仅在桌面端且屏幕高度较小时应用默认缩放
function setAdaptiveScale() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const screenHeight = window.screen.height
  
  // 只在非移动设备且屏幕高度小于900px时调整缩放
  if (!isMobile && screenHeight < 900) {
    const viewport = document.querySelector('meta[name="viewport"]')
    if (viewport) {
      // 根据屏幕高度动态设置初始缩放比例
      let scale = 1.0
      if (screenHeight < 800) scale = 0.8
      if (screenHeight < 700) scale = 0.75
      if (screenHeight < 600) scale = 0.7
      
      viewport.setAttribute('content', 
        `width=device-width, initial-scale=${scale}, minimum-scale=0.5, maximum-scale=2.0, user-scalable=yes`
      )
    }
  }
}

// 页面加载时执行
setAdaptiveScale()
