<template>
  <div class="app">
    <!-- 教师端路由直接渲染，不受学生登录态影响 -->
    <template v-if="isTeacherRoute">
      <router-view />
    </template>
    <!-- 学生端界面（操作员和记录员共用） -->
    <template v-else-if="loggedIn">
      <header class="app-header">
        <div class="toolbar">
          <div class="nav-title">
            <Icon icon="material-symbols:data-object" class="title-icon" />
            <span class="title-text">算法的执行</span>
          </div>
          
          <nav class="tabs">
            <button class="btn" :class="{ active: route.name === 'activity1' }" @click="go('activity1')">
              <span class="btn-text">活动一</span>
              <div class="btn-stars" v-if="userRole === 'recorder' && starsA1 > 0">
                <Icon v-for="n in starsA1" :key="n" icon="material-symbols:star" class="star-icon" />
              </div>
            </button>
            <button class="btn" :class="{ active: route.name === 'activity2' }" @click="go('activity2')">
              <span class="btn-text">活动二</span>
              <div class="btn-stars" v-if="userRole === 'recorder' && starsA2 > 0">
                <Icon v-for="n in starsA2" :key="n" icon="material-symbols:star" class="star-icon" />
              </div>
            </button>
            <button class="btn" :class="{ active: route.name === 'activity3' }" @click="go('activity3')">
              <span class="btn-text">活动三</span>
              <div class="btn-stars" v-if="userRole === 'recorder' && starsA3 > 0">
                <Icon v-for="n in starsA3" :key="n" icon="material-symbols:star" class="star-icon" />
              </div>
            </button>
          </nav>
          
          <div class="spacer"></div>
          
          <div class="user-ops">
            <div class="group-info-container">
              <Icon icon="material-symbols:group" class="group-icon" />
              <span class="group-label">第</span>
              <span class="group-number">{{ groupLabel }}</span>
              <span class="group-label">组</span>
              <span class="role-badge">{{ userRole === 'operator' ? '操作员' : '记录员' }}</span>
            </div>
            <div class="total-stars-container" v-if="userRole === 'recorder'">
              <span class="total-label">总星数</span>
              <span class="total-value">{{ totalStars }}</span>
            </div>
            <button class="btn-menu" @click="onLogout">
              <Icon icon="material-symbols:logout" class="menu-icon" />
            </button>
          </div>
        </div>
      </header>
      <main class="app-main">
        <router-view />
      </main>
    </template>
    <template v-else>
      <LoginStudent />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '@/stores/useSessionStore'
import LoginStudent from './views/login/student.vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { subscribe, emit, type RealtimeEvent } from '@/utils/realtime'

type TabKey = 'activity1' | 'activity2' | 'activity3'
const store = useSessionStore()

const loggedIn = computed(() => store.isLoggedIn())
const isTeacherRoute = computed(() => route.path.startsWith('/teacher') || route.path.startsWith('/login/teacher'))
const groupLabel = computed(() => store.persisted.groupId ?? '-')
const userRole = computed(() => store.persisted.role || 'recorder')

// 获取各活动的星星数
const starsA1 = computed(() => store.getRecords<number>('stars_a1', 0))
const starsA2 = computed(() => store.getRecords<number>('stars_a2', 0))
const starsA3 = computed(() => store.getRecords<number>('stars_a3', 0))
const totalStars = computed(() => starsA1.value + starsA2.value + starsA3.value)

const route = useRoute()
const router = useRouter()
function go(tab: TabKey) { router.push({ name: tab }) }
function onLogout() { 
  store.logout(); 
  // 清除活动二保存的教师下发内容
  localStorage.removeItem('va_student_activity2_broadcast');
  // 清除活动二的新数据格式
  localStorage.removeItem('va_student_activity2_data');
  localStorage.removeItem('va_student_activity2_version');
  // 清除活动三保存的内容
  localStorage.removeItem('va_student_activity3_directions');
  localStorage.removeItem('va_student_activity3_selections');
  router.push({ name: 'login' }) 
}

// 全局监听器，用于响应教师端的ping
let unsubscribe: (() => void) | null = null

// 发送活动三的数据给教师端
function sendActivity3Data() {
  if (!store.isLoggedIn() || store.persisted.role !== 'recorder' || !store.persisted.groupId) {
    return
  }

  // 读取活动三的保存数据
  const savedSelections = localStorage.getItem('va_student_activity3_selections')
  if (savedSelections) {
    try {
      const selections = JSON.parse(savedSelections)
      const savedDirections = localStorage.getItem('va_student_activity3_directions')
      let directions: string[] = []
      
      if (savedDirections) {
        const dirData = JSON.parse(savedDirections)
        if (Array.isArray(dirData)) {
          directions = dirData
        } else if (dirData.directions) {
          directions = dirData.directions
        }
      }
      
      // 计算选中的方向
      let selectedDirs: string[] = []
      if (selections.selectedDirection !== undefined && selections.selectedDirection >= 0) {
        // 新版单选格式
        selectedDirs = [directions[selections.selectedDirection]]
      } else if (selections.selectedDirections && Array.isArray(selections.selectedDirections)) {
        // 兼容旧版多选格式
        selectedDirs = directions.filter((_, i) => selections.selectedDirections[i])
      }
      
      // 构建记录数据
      const records = {
        selectedDirections: selectedDirs,
        usedAI: selections.usedAI || false,
        analyzedCode: selections.analyzedCode || false
      }
      
      // 计算星数
      const hasSelectedDirection = selectedDirs.length > 0
      const stars = (hasSelectedDirection ? 1 : 0) + 
                    (selections.usedAI ? 1 : 0) + 
                    (selections.analyzedCode ? 1 : 0)
      
      // 发送更新
      emit({
        type: 'student:update',
        groupId: store.persisted.groupId!,
        activity: 'a3',
        stars: stars,
        payload: records
      })
    } catch (e) {
      console.error('Failed to send activity3 data:', e)
    }
  }
}

onMounted(() => {
  // 监听教师端的ping事件
  unsubscribe = subscribe((evt: RealtimeEvent) => {
    if (evt.type === 'teacher:ping') {
      // 延迟发送，确保各个活动页面先发送自己的数据
      setTimeout(() => {
        sendActivity3Data()
      }, 200)
    }
  })
  
  // 如果已登录，立即发送活动三的数据
  if (store.isLoggedIn() && store.persisted.role === 'recorder') {
    setTimeout(() => {
      sendActivity3Data()
    }, 500)
  }
})

// 监听登录状态变化
watch(loggedIn, (newLoggedIn, oldLoggedIn) => {
  if (!oldLoggedIn && newLoggedIn && store.persisted.role === 'recorder') {
    // 新登录时，延迟发送活动三数据
    setTimeout(() => {
      sendActivity3Data()
    }, 500)
  }
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #E8EAF6 0%, #E1F5FE 100%);
  position: relative;
}

.app::before {
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

.btn-stars {
  display: flex;
  gap: 1px;
  height: 16px;
  align-items: center;
}

.star-icon {
  font-size: 14px;
  color: #FFD700;
  filter: drop-shadow(0 0 3px rgba(255, 215, 0, 0.8));
  animation: twinkle 2s ease-in-out infinite;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.btn.active .star-icon {
  color: #FFA000;
  filter: drop-shadow(0 0 4px rgba(255, 160, 0, 0.8));
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

.group-info-container {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 25px;
  backdrop-filter: blur(12px);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.group-info-container:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.12) 100%);
  transform: translateY(-1px);
  box-shadow: 
    0 6px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    inset 0 -1px 0 rgba(0, 0, 0, 0.15);
}

.group-icon {
  font-size: 20px;
  color: #81d4fa;
  filter: drop-shadow(0 0 6px rgba(129, 212, 250, 0.7));
}

.group-label {
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  font-weight: 500;
}

.group-number {
  color: #81d4fa;
  font-size: 18px;
  font-weight: bold;
  min-width: 20px;
  text-align: center;
  text-shadow: 
    0 0 10px rgba(129, 212, 250, 0.8),
    0 0 20px rgba(129, 212, 250, 0.5);
  font-family: 'Courier New', monospace;
  animation: pulse-glow 2s ease-in-out infinite;
}

.role-badge {
  margin-left: 0.5rem;
  padding: 0.2rem 0.6rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  backdrop-filter: blur(8px);
}

@keyframes pulse-glow {
  0%, 100% { 
    filter: brightness(1);
    transform: scale(1);
  }
  50% { 
    filter: brightness(1.2);
    transform: scale(1.05);
  }
}

.total-stars-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  backdrop-filter: blur(10px);
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.2);
}

.total-label {
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.total-value {
  color: #FFD700;
  font-size: 20px;
  font-weight: bold;
  min-width: 24px;
  text-align: center;
  text-shadow: 0 0 12px rgba(255, 215, 0, 0.6);
  font-family: 'Courier New', monospace;
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
  
  .group-info-container {
    padding: 0.4rem 0.8rem;
  }
  
  .group-label {
    font-size: 12px;
  }
  
  .group-number {
    font-size: 16px;
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
  
  .group-info-container {
    padding: 0.35rem 0.6rem;
    gap: 0.3rem;
  }
  
  .group-icon {
    font-size: 18px;
  }
  
  .group-label {
    font-size: 11px;
  }
  
  .group-number {
    font-size: 14px;
  }
  
  .total-stars-container {
    padding: 0.4rem 0.8rem;
  }
  
  .total-label {
    font-size: 12px;
  }
  
  .total-value {
    font-size: 16px;
  }
}
</style>