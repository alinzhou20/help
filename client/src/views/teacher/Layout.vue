<template>
  <div class="teacher-app">
    <header class="app-header">
      <div class="toolbar">
        <div class="nav-title">
          <Icon icon="material-symbols:data-object" class="title-icon" />
          <span class="title-text">教师端管理</span>
        </div>
        
        <nav class="tabs">
          <RouterLink class="btn" :class="{active: route.name==='teacher-demo'}" :to="{name:'teacher-demo'}">
            <span class="btn-text">演示</span>
          </RouterLink>
          <RouterLink class="btn" :class="{active: route.name==='teacher-activity3'}" :to="{name:'teacher-activity3'}">
            <span class="btn-text">活动三</span>
          </RouterLink>
          <RouterLink class="btn" :class="{active: route.name==='teacher-watch'}" :to="{name:'teacher-watch'}">
            <span class="btn-text">看板</span>
          </RouterLink>
        </nav>
        
        <div class="spacer"></div>
        
        <div class="user-ops">
          <button class="btn-menu" @click="onLogout">
            <Icon icon="material-symbols:logout" class="menu-icon" />
          </button>
        </div>
      </div>
    </header>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useTeacherStore } from '@/stores/useTeacherStore'
import { useBruteDemoStore } from '@/stores/useBruteDemoStore'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
const store = useTeacherStore()
const demoStore = useBruteDemoStore()
const route = useRoute()
const router = useRouter()
function onLogout(){ 
  store.logout(); 
  demoStore.clearSavedCode();
  router.replace({name:'login-teacher'}) 
}
</script>

<style scoped>
.teacher-app {
  min-height: 100vh;
  background: linear-gradient(135deg, #E8EAF6 0%, #E1F5FE 100%);
  position: relative;
}

.teacher-app::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(25, 118, 210, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(13, 71, 161, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(100, 181, 246, 0.03) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.app-header { 
  position: sticky; 
  top: 0; 
  background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%);
  box-shadow: 0 4px 20px rgba(13, 71, 161, 0.4);
  z-index: 100;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.toolbar { 
  display: flex; 
  align-items: center; 
  gap: 1rem; 
  padding: 0.75rem 1.5rem;
  height: 70px;
  max-width: 1440px;
  margin: 0 auto;
}

.tabs { 
  display: flex; 
  gap: 0.5rem; 
}

.btn { 
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0.5rem 1.25rem;
  min-width: 90px;
  height: 50px;
  border-radius: 8px; 
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  color: white;
  cursor: pointer; 
  font-size: 14px; 
  font-weight: 600;
  text-align: center; 
  white-space: nowrap;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.btn:hover::before {
  width: 300px;
  height: 300px;
}

.btn.active { 
  background: rgba(255, 255, 255, 0.95);
  color: #0d47a1;
  border-color: white;
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.4), inset 0 1px 3px rgba(13, 71, 161, 0.1);
  font-weight: 700;
}

.btn-text {
  font-size: 14px;
  font-weight: 600;
}

.nav-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 2rem;
  border-right: 2px solid rgba(255, 255, 255, 0.2);
  margin-right: 1.5rem;
}

.title-icon {
  font-size: 28px;
  color: #64b5f6;
  filter: drop-shadow(0 0 8px rgba(100, 181, 246, 0.6));
}

.title-text {
  font-size: 22px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.5px;
}

.spacer { 
  flex: 1 1 auto; 
}

.user-ops { 
  display: flex; 
  align-items: center; 
  gap: 1rem; 
}

.btn-menu {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.btn-menu:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.btn-menu::after {
  content: '';
  position: absolute;
  inset: -2px;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s;
}

.btn-menu:hover::after {
  transform: translateX(100%);
}

.menu-icon {
  font-size: 24px;
}

.app-main { 
  padding: 2rem;
  min-height: calc(100vh - 70px);
  position: relative;
  z-index: 1;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .nav-title {
    display: none;
  }
  
  .btn {
    min-width: 80px;
    padding: 0.5rem 1rem;
  }
}

@media (max-width: 768px) {
  .toolbar {
    padding: 0.75rem 1rem;
  }
  
  .tabs {
    gap: 0.25rem;
  }
  
  .btn {
    min-width: 70px;
    padding: 0.5rem 0.75rem;
  }
  
  .btn-text {
    font-size: 12px;
  }
}
</style>
