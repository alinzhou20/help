<template>
  <section class="activity3">
    <!-- 学习评价（置顶，标签样式，完成项高亮显示星标） -->
    <div class="evaluation-top">
      <div class="eval-header">
        <span class="label">评价标准</span>
      </div>
      <ol class="criteria-list">
        <li :class="{ done: eval1 }">
          <span>1. 能思考解决问题的畅想</span>
          <span class="star" v-if="eval1">★</span>
        </li>
        <li :class="{ done: eval2 }">
          <span>2. 能借助智能体实现算法的完善</span>
          <span class="star" v-if="eval2">★</span>
        </li>
        <li :class="{ done: eval3 }">
          <span>3. 能理解算法从特定问题到通用解法的转变</span>
          <span class="star" v-if="eval3">★</span>
        </li>
      </ol>
    </div>

    <!-- 主要内容区 -->
    <div class="main-container">
      <!-- 选择优化方向区域 -->
      <div class="panel direction-panel">
        <div class="panel-title">选择合适优化方向</div>
        <div class="panel-content">
          <div v-if="hasReceivedDirections" class="directions-list" style="width: 100%">
            <el-radio-group v-model="selectedDirection" @change="handleDirectionChange" style="width: 100%">
              <div v-for="(direction, index) in directions" :key="index" class="direction-item">
                <el-radio :label="index" class="step-radio">
                  {{ direction }}
                </el-radio>
        </div>
            </el-radio-group>
          </div>
          <el-empty v-else description="等待教师下发优化方向..." :image-size="60"></el-empty>
        </div>
      </div>

      <!-- 完成记录区域 -->
      <div class="panel task-panel" v-if="hasReceivedDirections">
        <div class="panel-title">完成记录</div>
        <div class="panel-content">
          <div class="task-item">
            <el-checkbox v-model="usedAI" @change="handleTaskChange" class="task-checkbox">
              借助智能体，按照所选的优化方向实现算法的完善
            </el-checkbox>
          </div>
          <div class="task-item">
            <el-checkbox v-model="analyzedCode" @change="handleTaskChange" class="task-checkbox">
              观察算法，尝试分析程序修改内容
            </el-checkbox>
        </div>
      </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '@/stores/useSessionStore'
import { subscribe, type RealtimeEvent, emit } from '@/utils/realtime'

const session = useSessionStore()

// localStorage keys
const DIRECTIONS_KEY = 'va_student_activity3_directions'
const SELECTIONS_KEY = 'va_student_activity3_selections'

// 优化方向相关
const directions = ref<string[]>([])
const selectedDirection = ref<number>(-1)  // -1 表示未选择
const hasReceivedDirections = ref(false)

// 任务完成情况
const usedAI = ref(false)
const analyzedCode = ref(false)

// 评价逻辑
const eval1 = computed(() => {
  // 评价1：选择了一个优化方向
  return selectedDirection.value >= 0
})

const eval2 = computed(() => {
  // 评价2：勾选了"借助智能体"
  return usedAI.value
})

const eval3 = computed(() => {
  // 评价3：勾选了"观察算法"
  return analyzedCode.value
})

const stars = computed(() => {
  return (eval1.value ? 1 : 0) + (eval2.value ? 1 : 0) + (eval3.value ? 1 : 0)
})

// 处理方向选择变化
function handleDirectionChange() {
  saveSelections()
  updateTeacher()
}

// 处理任务完成变化
function handleTaskChange() {
  saveSelections()
  updateTeacher()
}

// 保存选择到localStorage
function saveSelections() {
  const selections = {
    selectedDirection: selectedDirection.value,
    usedAI: usedAI.value,
    analyzedCode: analyzedCode.value
  }
  localStorage.setItem(SELECTIONS_KEY, JSON.stringify(selections))
}

// 从localStorage恢复选择
function restoreSelections() {
  const saved = localStorage.getItem(SELECTIONS_KEY)
  if (saved) {
    try {
      const selections = JSON.parse(saved)
      if (selections.selectedDirection !== undefined) {
        selectedDirection.value = selections.selectedDirection
      } else if (selections.selectedDirections && Array.isArray(selections.selectedDirections)) {
        // 兼容旧版本：如果有多选数据，取第一个选中的
        const firstSelected = selections.selectedDirections.findIndex((v: boolean) => v)
        selectedDirection.value = firstSelected >= 0 ? firstSelected : -1
      }
      usedAI.value = selections.usedAI || false
      analyzedCode.value = selections.analyzedCode || false
    } catch (e) {
      console.error('Failed to restore selections:', e)
    }
  }
}

// 更新教师端
function updateTeacher() {
  // 保存到session
  const selectedDirs = selectedDirection.value >= 0 ? [directions.value[selectedDirection.value]] : []
  const records = {
    selectedDirections: selectedDirs,
    usedAI: usedAI.value,
    analyzedCode: analyzedCode.value
  }
  
  session.setRecords('a3', records)
  session.setRecords('stars_a3', stars.value)
  
  // 广播给教师端
  if (session.persisted.groupId != null) {
    emit({
      type: 'student:update',
      groupId: session.persisted.groupId,
      activity: 'a3',
      stars: stars.value,
      payload: records
    })
  }
}

// 清理数据
function clearData() {
  localStorage.removeItem(DIRECTIONS_KEY)
  localStorage.removeItem(SELECTIONS_KEY)
  directions.value = []
  selectedDirection.value = -1
  hasReceivedDirections.value = false
  usedAI.value = false
  analyzedCode.value = false
  // 清理后立即更新教师端
  updateTeacher()
}

// 监听教师下发
let unsubscribe: (() => void) | null = null

onMounted(() => {
  // 尝试恢复保存的方向
  const savedDirections = localStorage.getItem(DIRECTIONS_KEY)
  if (savedDirections) {
    try {
      const data = JSON.parse(savedDirections)
      // 兼容旧格式（可能是直接的directions数组或包含directions的对象）
      if (Array.isArray(data)) {
        directions.value = data
      } else if (data.directions) {
        directions.value = data.directions
      } else {
        directions.value = []
      }
      hasReceivedDirections.value = directions.value.length > 0
      // 恢复选择状态
      restoreSelections()
      // 恢复后立即更新教师端，确保星星显示正确
      setTimeout(() => {
        updateTeacher()
      }, 100)
    } catch (e) {
      console.error('Failed to restore directions:', e)
    }
  }
  
  // 立即请求最新的教师下发内容
  const session = useSessionStore()
  if (session.persisted.groupId != null) {
    console.log('[Activity3] Requesting latest broadcast from teacher')
    emit({ 
      type: 'student:request-broadcast', 
      activity: 'a3', 
      groupId: session.persisted.groupId 
    })
  }
  
  // 监听教师下发
  unsubscribe = subscribe((evt: RealtimeEvent) => {
    if (evt.type === 'teacher:activity3:broadcast' && evt.activity === 'a3') {
      const data = evt.data
      if (data && data.directions) {
        // 检查是否是全新的方向（通过timestamp判断）
        const oldDirections = localStorage.getItem(DIRECTIONS_KEY)
        let isNewContent = true
        if (oldDirections) {
          try {
            const oldData = JSON.parse(oldDirections)
            // 如果timestamp相同，说明是重复接收，不需要更新
            if (oldData.timestamp === data.timestamp) {
              return
            }
          } catch (e) {}
        }
        
        // 保存旧的选择状态
        const oldUsedAI = usedAI.value
        const oldAnalyzedCode = analyzedCode.value
        
        // 更新方向
        directions.value = data.directions
        selectedDirection.value = -1  // 重置选择
        hasReceivedDirections.value = true
        
        // 保存到localStorage
        localStorage.setItem(DIRECTIONS_KEY, JSON.stringify(data))
        
        // 保持任务完成状态不变（只更新优化方向）
        usedAI.value = oldUsedAI
        analyzedCode.value = oldAnalyzedCode
        saveSelections()
        
        // 延迟更新教师端，确保状态已经稳定
        setTimeout(() => {
          updateTeacher()
        }, 100)
      }
    }
    
    // 响应教师端的ping请求，发送当前状态
    if (evt.type === 'teacher:ping') {
      // 如果有保存的状态，立即发送给教师端
      if (hasReceivedDirections.value || (usedAI.value || analyzedCode.value)) {
        setTimeout(() => {
          updateTeacher()
        }, 100)
      }
    }
    
    // 处理教师清除下发内容事件
    if (evt.type === 'teacher:broadcasts-cleared') {
      console.log('[Activity3] Teacher cleared broadcasts, resetting local content')
      // 清除本地保存的内容
      clearData()
    }
  })
  
  // 如果没有收到内容，延迟再次请求
  setTimeout(() => {
    if (!hasReceivedDirections.value && session.persisted.groupId != null) {
      console.log('[Activity3] Retrying broadcast request after 500ms')
      emit({ 
        type: 'student:request-broadcast', 
        activity: 'a3',
        groupId: session.persisted.groupId 
      })
    }
  }, 500)
  
  // 1.5秒后再次尝试
  setTimeout(() => {
    if (!hasReceivedDirections.value && session.persisted.groupId != null) {
      console.log('[Activity3] Final broadcast request attempt')
    emit({ 
        type: 'student:request-broadcast', 
      activity: 'a3', 
        groupId: session.persisted.groupId 
      })
    }
  }, 1500)
})

// 监听退出事件
watch(() => session.isLoggedIn(), (newLoggedIn, oldLoggedIn) => {
  if (oldLoggedIn && !newLoggedIn) {
    // 用户退出时清理数据
    clearData()
  }
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<style scoped>
@import '@/assets/styles/evaluation.css';

.activity3 {
  min-height: 100vh;
  padding-bottom: 2rem;
}

/* 主容器 */
.main-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
  min-height: 400px;
}

/* 面板样式 */
.panel {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  overflow: hidden;
}

.panel-title {
  padding: 0.5rem 0.75rem;
  font-weight: 600;
  font-size: 0.875rem;
  color: #111827;
  background: #f3f4f6;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}

.panel-content {
  padding: 1rem;
  width: 100%;
  box-sizing: border-box;
}

/* 优化方向面板 */
.direction-panel {
  min-height: 300px;
}

.directions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.direction-item {
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #F0F7FF 0%, #E6F4FF 100%);
  border: 1px solid #D3E3FD;
  border-radius: 0.5rem;
  transition: all 0.2s;
  display: block;  /* 确保每个选项独占一行 */
  width: 100%;  /* 确保宽度占满容器 */
  box-sizing: border-box;
  overflow: hidden;  /* 防止内容溢出 */
}

.direction-item:hover {
  background: linear-gradient(135deg, #E6F4FF 0%, #D3E3FD 100%);
  border-color: #B8D3FC;
}

/* 自定义radio样式 - 参照活动一 */
:deep(.el-radio-group) {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.step-radio {
  font-size: 18px;
  font-weight: 500;
  width: 100%;
  display: flex !important;
  align-items: flex-start !important;
  margin-right: 0 !important;
  text-align: left !important;
  padding-right: 0.5rem;  /* 防止文字贴边 */
}

.step-radio :deep(.el-radio__label) {
  font-size: 16px !important;
  color: #303133;
  font-weight: 400;
  padding-left: 10px;
  line-height: 1.6;
  white-space: normal;
  word-break: break-word;
  text-align: left;
  flex: 1;  /* 让label占据剩余空间 */
  margin-right: 0.5rem;  /* 右侧留白防止遮挡 */
}

.step-radio :deep(.el-radio__input) {
  line-height: 1;
  flex-shrink: 0;
}

.step-radio :deep(.el-radio__inner) {
  width: 22px;
  height: 22px;
  border: 2px solid #303133;
  margin-top: 0;
  flex-shrink: 0;
}

.step-radio :deep(.el-radio__input.is-checked .el-radio__inner) {
  background-color: #E6F4FF;
  border-color: #303133;
}

.step-radio :deep(.el-radio__input.is-checked .el-radio__inner::after) {
  width: 12px;
  height: 12px;
  background-color: #303133;
}

.step-radio :deep(.el-radio__input.is-checked + .el-radio__label) {
  color: #10b981;
  font-weight: 500;
}

/* 任务面板 */
.task-panel {
  min-height: 200px;
}

.task-item {
  padding: 1rem;
  background: linear-gradient(135deg, #F0F7FF 0%, #E6F4FF 100%);
  border: 1px solid #D3E3FD;
  border-radius: 8px;
  margin-bottom: 0.75rem;
}

.task-item:last-child {
  margin-bottom: 0;
}

/* 自定义checkbox样式 - 参照活动一 */
.task-checkbox {
  font-size: 18px;
  font-weight: 500;
  width: 100%;
  display: flex !important;
  align-items: flex-start !important;
}

.task-checkbox :deep(.el-checkbox__label) {
  font-size: 16px !important;
  color: #303133;
  font-weight: 400;
  padding-left: 10px;
  line-height: 1.6;
  white-space: normal;
  word-break: break-word;
}

.task-checkbox :deep(.el-checkbox__inner) {
  width: 22px;
  height: 22px;
  border: 2px solid #303133;
  border-radius: 4px;
  margin-top: 0;
  flex-shrink: 0;
}

.task-checkbox :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #E6F4FF;
  border-color: #303133;
}

.task-checkbox :deep(.el-checkbox__input.is-checked .el-checkbox__inner::after) {
  border: 3px solid #303133;
  border-left: 0;
  border-top: 0;
  left: 8px;
  top: 7px;
  width: 6px;
  height: 10px;
}

.task-checkbox :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: #10b981;
  font-weight: 500;
}

/* Element UI Empty 组件样式 */
:deep(.el-empty) {
  padding: 2rem 0;
}

:deep(.el-empty__description) {
  color: #6b7280;
  font-size: 0.875rem;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .main-container {
    grid-template-columns: 1fr;
  }
  
  .direction-panel,
  .task-panel {
    min-height: 200px;
  }
}
</style>