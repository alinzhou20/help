<template>
  <section class="activity1">
    <!-- 顶部评价（与活动2/3/4一致的标签样式） -->
    <div class="evaluation-top">
      <div class="eval-header"><span class="label">评价标准</span></div>
      <ol class="criteria-list">
        <li :class="{ done: eval1 }">
          <span>1.能调试程序中的错误并运行</span>
          <Icon v-if="eval1" icon="material-symbols:star" class="star-icon" />
        </li>
        <li :class="{ done: eval2 }">
          <span>2.能发现程序中的错误</span>
          <Icon v-if="eval2" icon="material-symbols:star" class="star-icon" />
        </li>
      </ol>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 步骤区域 -->
      <div class="steps-panel">
        <!-- 步骤1 -->
        <el-card class="step-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="step-title">步骤1：记录程序运行是否成功</span>
            </div>
          </template>
          <div class="radio-container">
            <el-radio-group v-model="runSuccess" size="large">
              <el-radio label="yes" class="step-radio">是</el-radio>
              <el-radio label="no" class="step-radio">否</el-radio>
            </el-radio-group>
          </div>
        </el-card>

        <!-- 步骤2 -->
        <el-card class="step-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="step-title">步骤2：记录错误的数量</span>
            </div>
          </template>
          
          <div class="error-count-container">
            <span class="error-count-label">小敏老师帮助我们改正了程序中的</span>
            <el-input-number 
              v-model="errorCount" 
              :min="0" 
              :max="10"
              size="large"
              controls-position="right"
              class="error-count-input"
            />
            <span class="error-count-label">个错误</span>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 小锦囊提示（如果需要） -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="showTips" class="tips-overlay" @click="showTips = false">
          <div class="tips-content" @click.stop>
            <img v-for="(img, i) in tips" :key="i" :src="img" alt="小锦囊">
            <el-button type="primary" @click="showTips = false">关闭</el-button>
          </div>
        </div>
      </transition>
    </teleport>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, onUnmounted, ref, computed, watch } from 'vue'
import { useSessionStore } from '@/stores/useSessionStore'
import { emit, subscribe, type RealtimeEvent } from '@/utils/realtime'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus'
import tipsImg1 from '@/img/tips-1.png'
import tipsImg2 from '@/img/tips-2.png'

// 小锦囊图片
const tips = ref<string[]>([tipsImg1, tipsImg2])
const showTips = ref(false)

// 步骤1运行成功状态
const runSuccess = ref<'yes' | 'no' | ''>('')

// 步骤2错误数量
const errorCount = ref(0)

// 评价完成状态
const eval1 = computed(() => runSuccess.value === 'yes')  // 步骤1：程序运行是否成功（选择"是"）
const eval2 = computed(() => errorCount.value === 3)  // 步骤2：能发现程序中的错误（正确答案是3个）

// 保存和恢复状态
const session = useSessionStore()
let unsubscribe: (() => void) | null = null

onMounted(() => {
  const saved = session.getRecords('a1_state', {
    runSuccess: '',
    errorCount: 0
  }) as any
  
  if (saved) {
    runSuccess.value = saved.runSuccess ?? ''
    errorCount.value = saved.errorCount ?? 0
  }
  
  // 监听事件
  unsubscribe = subscribe((evt: RealtimeEvent) => {
    // 响应教师端的ping请求
    if (evt.type === 'teacher:ping') {
      // 如果有保存的状态，立即发送给教师端
      const stars = (eval1.value ? 1 : 0) + (eval2.value ? 1 : 0)
      if (stars > 0 && session.persisted.groupId != null && session.persisted.role === 'recorder') {
        setTimeout(() => {
          emit({ 
            type: 'student:update', 
            groupId: session.persisted.groupId!, 
            activity: 'a1', 
            stars: stars,
            payload: {
              runSuccess: runSuccess.value,
              errorCount: errorCount.value
            }
          })
        }, 100)
      }
    }
  })
})

watch([runSuccess, errorCount], () => {
  session.setRecords('a1_state', {
    runSuccess: runSuccess.value,
    errorCount: errorCount.value
  })
  
  // 保存星星数（只有记录员才保存）
  const stars = (eval1.value ? 1 : 0) + (eval2.value ? 1 : 0)
  if (session.persisted.role === 'recorder') {
    session.setRecords('stars_a1', stars)
  }
  
  // 广播更新（只有记录员才向教师端发送）
  if (session.persisted.groupId != null && session.persisted.role === 'recorder') {
    emit({
      type: 'student:update',
      groupId: session.persisted.groupId,
      activity: 'a1',
      stars: stars,
      payload: {
        runSuccess: runSuccess.value,
        errorCount: errorCount.value
      }
    })
  }
}, { deep: true })

// 键盘快捷键
function onKey(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === '?') {
    showTips.value = !showTips.value
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<style scoped>
@import '@/assets/styles/evaluation.css';

.activity1 { 
  padding: 0; 
  font-size: 16px;
}

/* 活动一不需要特殊的 margin-top 调整 */

/* 主内容区域 */
.main-content {
  margin-top: 1rem;
  height: calc(100vh - 200px); /* 减去顶部评价和padding的高度 */
  max-height: 600px;
  min-height: 480px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

/* 步骤面板 */
.steps-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 1000px;
  width: 95%;
  padding: 0 1rem;
}

/* 卡片样式 */
.step-card {
  background: white;
  border: 1px solid #E4E7ED;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  flex: 1 1 50%;
}

.step-card :deep(.el-card__body) {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #F0F2F5 0%, #E4E7ED 100%);
  border-bottom: 2px solid #DCDFE6;
  padding: 16px 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.step-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
  letter-spacing: 0.5px;
}

/* 步骤1样式 */
.radio-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #F0F7FF 0%, #E6F4FF 100%);
  border: 1px solid #D3E3FD;
  border-radius: 8px;
  width: 100%;
}

.radio-container .el-radio-group {
  display: flex;
  gap: 40px;
}

.step-radio {
  font-size: 20px;
  font-weight: 500;
}

.step-radio :deep(.el-radio__label) {
  font-size: 20px !important;
  color: #303133;
  font-weight: 500;
  padding-left: 10px;
  line-height: 1.5;
}

.step-radio :deep(.el-radio__inner) {
  width: 26px;
  height: 26px;
  border: 2.5px solid #303133;
}

.step-radio :deep(.el-radio__input.is-checked .el-radio__inner) {
  background-color: #E6F4FF;
  border-color: #303133;
}

.step-radio :deep(.el-radio__input.is-checked .el-radio__inner::after) {
  width: 14px;
  height: 14px;
  background-color: #303133;
}

/* 步骤2错误数量样式 */
.error-count-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  background: linear-gradient(135deg, #F0F7FF 0%, #E6F4FF 100%);
  border: 1px solid #D3E3FD;
  border-radius: 8px;
  width: 100%;
}

.error-count-label {
  font-size: 20px;
  color: #303133;
  font-weight: 500;
}

.error-count-input {
  width: 120px;
}

.error-count-input :deep(.el-input-number__increase),
.error-count-input :deep(.el-input-number__decrease) {
  width: 36px;
}

.error-count-input :deep(.el-input__inner) {
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  height: 40px;
  line-height: 40px;
}


/* 提示框样式 */
.tips-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.tips-content {
  background: white;
  padding: 20px;
  border-radius: 12px;
  max-width: 90%;
  max-height: 90%;
  overflow: auto;
  text-align: center;
}

.tips-content img {
  max-width: 100%;
  margin: 10px 0;
}

/* 过渡动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .steps-panel {
    padding: 0 0.5rem;
  }
  
  .step-title {
    font-size: 17px;
  }
  
  .radio-container {
    padding: 15px 10px;
  }
  
  .radio-container .el-radio-group {
    gap: 20px;
  }
  
  .step-radio :deep(.el-radio__label) {
    font-size: 18px !important;
  }
  
  .error-count-container {
    flex-wrap: wrap;
    padding: 15px 10px;
  }
  
  .error-count-label {
    font-size: 18px;
  }
  
  .error-count-input {
    width: 100px;
  }
}
</style>