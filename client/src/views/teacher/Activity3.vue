<template>
  <section class="teacher-activity3">
    <h2>活动三 - 程序完善方向</h2>
    
    <div class="main-container">
      <!-- 输入区域 -->
      <div class="input-panel">
        <div class="panel-title">输入程序完善的方向</div>
        <div class="panel-content">
          <el-input
            v-model="improvementDirections"
            type="textarea"
            :autosize="{ minRows: 8, maxRows: 15 }"
            placeholder="请输入程序完善的方向，例如：
1. 总头数 15 和总脚数 28 直接写在代码里，想换个题目数字得改好几处地方。
2. 没有对计算出的鸡和兔数量进行合理性校验，可能出现负数或非整数的动物数量。
3. 程序在尝试不同数量的时候，有时候会瞎猜，明明兔子太多了肯定不对，还在一直试。
4. 程序找着答案了，也不马上停下，还在那儿继续算。"
          />
          <div class="button-container">
            <el-button type="primary" @click="broadcastToStudents" :disabled="!improvementDirections.trim()">
              下发学生
            </el-button>
            <el-button type="warning" @click="clearBroadcasts">
              清除下发内容
            </el-button>
          </div>
        </div>
      </div>

      <!-- 学生记录汇总 -->
      <div class="records-panel">
        <div class="panel-title">学生记录汇总</div>
        <div class="panel-content">
          <table class="records-table">
            <thead>
              <tr>
                <th width="80">小组</th>
                <th width="80">星数</th>
                <th>选择的优化方向</th>
                <th>完成情况</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.group">
                <td class="center">{{ r.group }} 组</td>
                <td class="center">
                  <span class="stars">{{ '★'.repeat(r.stars) || '-' }}</span>
                </td>
                <td>{{ r.selectedDirections || '-' }}</td>
                <td>
                  <div class="status-items">
                    <span v-if="r.usedAI" class="status-tag ai">✓ 借助智能体</span>
                    <span v-if="r.analyzedCode" class="status-tag analyze">✓ 分析程序</span>
                    <span v-if="!r.usedAI && !r.analyzedCode" class="status-tag empty">-</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useTeacherDataStore } from '@/stores/useTeacherDataStore'
import { emit, subscribe, type RealtimeEvent } from '@/utils/realtime'
import { ElMessage } from 'element-plus'

const tds = useTeacherDataStore()
const improvementDirections = ref('')
let unsubscribe: (() => void) | null = null
let lastBroadcastData: any = null

// localStorage key
const TEACHER_A3_KEY = 'va_teacher_activity3_state'

// 处理学生数据
const rows = computed(() => tds.groups.map(g => {
  const k = String(g)
  const d = tds.dataByGroup[k]
  const stars = d?.stars?.a3 ?? 0
  const rec = d?.records?.a3
  
  // 解析记录
  let selectedDirections = ''
  let usedAI = false
  let analyzedCode = false
  
  if (rec) {
    selectedDirections = rec.selectedDirections?.join(', ') || ''
    usedAI = rec.usedAI || false
    analyzedCode = rec.analyzedCode || false
  }
  
  return { 
    group: g, 
    stars, 
    selectedDirections,
    usedAI,
    analyzedCode
  }
}))

// 保存状态到localStorage
function saveState() {
  const state = {
    improvementDirections: improvementDirections.value,
    lastBroadcastData: lastBroadcastData
  }
  localStorage.setItem(TEACHER_A3_KEY, JSON.stringify(state))
}

// 从localStorage恢复状态
function restoreState() {
  const saved = localStorage.getItem(TEACHER_A3_KEY)
  if (saved) {
    try {
      const state = JSON.parse(saved)
      improvementDirections.value = state.improvementDirections || ''
      lastBroadcastData = state.lastBroadcastData || null
    } catch (e) {
      console.error('Failed to restore teacher activity3 state:', e)
    }
  }
}

// 下发给学生
function broadcastToStudents() {
  if (!improvementDirections.value.trim()) {
    ElMessage.warning('请输入程序完善的方向')
    return
  }

  // 解析输入的方向（按行分割，自动编号）
  const directions = improvementDirections.value
    .split('\n')
    .filter(line => line.trim())
    .map((line, index) => {
      // 如果行已经有序号，保留原序号；否则添加序号
      const match = line.match(/^\d+[\.\、\s]/)
      if (match) {
        return line.trim()
      }
      return `${index + 1}. ${line.trim()}`
    })

  const broadcastData = {
    type: 'teacher:activity3:broadcast' as const,
    activity: 'a3' as const,
    data: {
      directions: directions,
      timestamp: Date.now()
    }
  }
  
  // 发送广播
  emit(broadcastData)
  lastBroadcastData = broadcastData
  
  // 保存状态
  saveState()
  
  ElMessage.success('已下发给学生')
}

// 清除下发内容
function clearBroadcasts() {
  // 发送清除广播事件
  emit({ type: 'teacher:clear-broadcasts' })
  
  // 清除本地状态
  improvementDirections.value = ''
  lastBroadcastData = null
  localStorage.removeItem(TEACHER_A3_KEY)
  
  ElMessage.success('已清除所有下发内容')
}

// 监听输入变化，自动保存
watch(improvementDirections, () => {
  saveState()
})

onMounted(() => {
  tds.start()
  
  // 恢复保存的状态
  restoreState()
  
  // 监听学生请求
  unsubscribe = subscribe((evt: RealtimeEvent) => {
    if (evt.type === 'student:request-broadcast' && evt.activity === 'a3') {
      // 如果有缓存的广播内容，重新发送
      if (lastBroadcastData) {
        emit(lastBroadcastData)
      }
    }
  })
  
  // 发送ping消息，请求所有学生更新其状态
  emit({ type: 'teacher:ping' })
})

onUnmounted(() => {
  tds.stop()
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<style scoped>
.teacher-activity3 {
  padding: 1rem;
  min-height: 100vh;
}

h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #111827;
}

.main-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  height: calc(100vh - 100px);
}

/* 输入面板 */
.input-panel {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 记录面板 */
.records-panel {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  flex: 1;
  padding: 1rem;
  overflow: auto;
}

/* 输入框样式 */
:deep(.el-textarea__inner) {
  font-size: 0.875rem;
  line-height: 1.6;
  font-family: inherit;
}

/* 按钮容器 */
.button-container {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
}

/* 记录表格 */
.records-table {
  width: 100%;
  border-collapse: collapse;
}

.records-table th,
.records-table td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
}

.records-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.records-table td.center {
  text-align: center;
}

.stars {
  color: #fbbf24;
  font-size: 1rem;
}

/* 状态标签 */
.status-items {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-tag {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-tag.ai {
  background: #dbeafe;
  color: #1e40af;
}

.status-tag.analyze {
  background: #dcfce7;
  color: #166534;
}

.status-tag.empty {
  background: #f3f4f6;
  color: #9ca3af;
}

/* 响应式 */
@media (max-width: 1024px) {
  .main-container {
    grid-template-columns: 1fr;
    height: auto;
  }
  
  .input-panel,
  .records-panel {
    min-height: 400px;
  }
}
</style>