<template>
  <section class="teacher-demo">
    <div class="grid show-process">
      <div class="left-col">
        <CodePanelFlowDemo class="panel code-panel" />
        <div class="panel process-btn-container">
          <el-button class="broadcast-btn" @click="broadcastToStudents">下发学生</el-button>
        </div>
      </div>
      <div class="panel viz">
        <div class="panel-title row">
          <span>流程图</span>
          <div class="ctrl-buttons">
            <el-button @click="store.nextStep" :disabled="!store.canNext" class="custom-btn">下一步</el-button>
            <el-button @click="store.playToggle" :disabled="!store.canPlay" class="custom-btn">{{ store.playing ? '暂停' : '自动播放' }}</el-button>
            <el-button @click="handleReset" class="custom-btn">重置运行</el-button>
          </div>
        </div>
        <BruteFlowChartDemo />
      </div>
      <div class="panel ctrl">
        <div class="panel-title row">
          <span>枚举过程</span>
        </div>
        <div class="table-container">
          <ResultsTableDemo :rows="store.rows" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import CodePanelFlowDemo from '@/views/components/CodePanelFlowDemo.vue'
import ResultsTableDemo from '@/views/components/ResultsTableDemo.vue'
import BruteFlowChartDemo from '@/views/teacher/widgets/BruteFlowChartDemo.vue'
import { useBruteDemoStore } from '@/stores/useBruteDemoStore'
import { ref, onMounted, onUnmounted } from 'vue'
import { emit, subscribe, type RealtimeEvent } from '@/utils/realtime'
import { ElMessage } from 'element-plus'

const store = useBruteDemoStore()

// 缓存最近的广播内容
let lastBroadcastData: RealtimeEvent | null = null
let unsubscribe: (() => void) | null = null

// 处理重置运行
function handleReset() {
  store.resetRuntime()
  store.justSwitchedToEnhanced = false
}

// 获取当前代码
function getCurrentCode(): string {
  const savedCode = localStorage.getItem('va_teacher_demo_code')
  if (savedCode) {
    return savedCode
  }
  // 返回默认代码
  return `tu = 0
while tu < ${store.totalHeads || 5} + 1:
    ji = ${store.totalHeads || 5} - tu
    if ji * 2 + tu * 4 == ${store.totalLegs || 9}:
        print(ji, "只鸡，", tu, "只兔。")
    tu = tu + 1`
}

// 下发给学生
async function broadcastToStudents() {
  try {
    const code = getCurrentCode()
    const broadcastData: RealtimeEvent = {
      type: 'teacher:broadcast' as const,
      activity: 'a2',
      data: {
        code,
        codeInfo: store.codeInfo,
        totalHeads: store.totalHeads || 5,
        totalLegs: store.totalLegs || 9,
        version: Date.now()  // 添加版本号（时间戳）
      } as any
    }
    console.log('[Teacher Demo] Broadcasting to students:', broadcastData)
    
    // 缓存最近的广播内容
    lastBroadcastData = broadcastData
    
    // 发送广播（多次发送以提高可靠性）
    await emit(broadcastData)
    // 延迟100ms再发送一次，确保所有客户端都能收到
    setTimeout(() => emit(broadcastData), 100)
    // 延迟500ms再发送一次，处理网络延迟较大的情况
    setTimeout(() => emit(broadcastData), 500)
    
    ElMessage.success('已成功下发给学生')
    console.log('[Teacher Demo] Broadcast completed successfully')
  } catch (error) {
    ElMessage.error('下发失败，请重试')
    console.error('[Teacher Demo] Broadcast error:', error)
  }
}

// 监听学生的广播请求
onMounted(() => {
  unsubscribe = subscribe((evt: RealtimeEvent) => {
    // 响应学生的广播请求
    if (evt.type === 'student:request-broadcast' && evt.activity === 'a2') {
      console.log('[Teacher Demo] Student requested broadcast:', evt.groupId)
      // 如果有缓存的广播内容，立即发送给请求的学生
      if (lastBroadcastData) {
        console.log('[Teacher Demo] Responding with cached broadcast')
        // 延迟一小段时间发送，确保学生端已经准备好接收
        setTimeout(() => emit(lastBroadcastData!), 50)
        setTimeout(() => emit(lastBroadcastData!), 200)
      }
    }
  })
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<style scoped>
.grid {
  --left-col: clamp(31.25rem, 34vw, 36.25rem);
  --center-col: 1fr;
  --right-col: clamp(22.5rem, 22vw, 26.25rem);
  display: grid;
  grid-template-columns: var(--left-col) var(--center-col) var(--right-col);
  grid-template-rows: 80vh;
  gap: 1rem;
  align-items: start;
}
.grid:not(.show-process) {
  --center-col: 0;
  --right-col: 0;
}
.panel { 
  background: var(--color-surface); 
  border: 1px solid var(--color-border); 
  border-radius: .75rem; 
  padding: 0; 
  overflow: hidden;
}
.panel-title { 
  padding: .45rem .75rem; 
  font-weight: 700; 
  font-size: 0.875rem;
  color: #111827; 
  background: #f3f4f6; 
  border-bottom: 1px solid rgba(0,0,0,.08); 
  display:flex; 
  align-items:center; 
  justify-content: space-between; 
  gap: .5rem; 
  border-radius: .75rem .75rem 0 0;
}
/* 流程图和枚举表格的内容区域需要适当的内边距 */
.viz > div:not(.panel-title) {
  padding: .85rem;
}
.table-container {
  padding: .85rem;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.panel-title.row { 
  display:flex; 
  align-items:center; 
  justify-content: space-between; 
  gap: .5rem; 
}

/* 分别控制不同区域的标题高度 */
.viz .panel-title {
  /* 流程图标题高度 - 可单独调整 */
  padding: .45rem .75rem;
}

.ctrl .panel-title {
  /* 枚举过程标题高度 - 可单独调整 */
  padding: .9rem .75rem;  /* 例如改为 .6rem .75rem 增加高度 */
}
.ctrl-buttons { display:flex; gap:.5rem; flex-wrap: nowrap; }
.ctrl-buttons > button, .ctrl-buttons :deep(.custom-btn) { 
  padding: .35rem .7rem; 
  border-radius: .5rem; 
  border: 1px solid var(--color-primary); 
  background: var(--color-primary); 
  color: #fff; 
  cursor: pointer; 
  font-size: 0.8125rem;
  height: auto;
  min-width: auto;
}
.ctrl-buttons > button:hover:not(:disabled), .ctrl-buttons :deep(.custom-btn:hover:not(:disabled)) { 
  filter: brightness(0.95); 
  background: var(--color-primary); 
  color: #fff; 
  border-color: var(--color-primary);
}
.ctrl-buttons > button:disabled, .ctrl-buttons :deep(.custom-btn:disabled) { 
  opacity: .6; 
  cursor: not-allowed; 
  background: var(--color-primary); 
  color: #fff; 
  border-color: var(--color-primary);
}
.viz { 
  grid-column: 2; 
  grid-row: 1; 
  height: 80vh; 
  overflow: hidden; 
  position: relative; 
  min-width: 0; 
}
.grid .viz { grid-column: 2; grid-row: 1; }
.grid .ctrl { 
  grid-column: 3; 
  grid-row: 1; 
  height: 80vh; 
  overflow: hidden; 
  min-width: 0; 
  display: flex;
  flex-direction: column;
}
.left-col { 
  display: flex; 
  flex-direction: column; 
  height: 80vh; 
  min-height: 0; 
}
.left-col .code-panel { flex: 1 1 auto; min-height: 0; overflow: auto; }
.left-col .process-btn-container { flex: 0 0 auto; }
.process-btn-container { 
  padding: 1rem; 
  text-align: center; 
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}
.process-btn, .broadcast-btn,
:deep(.process-btn), :deep(.broadcast-btn) { 
  padding: .35rem .7rem; 
  border-radius: .5rem; 
  border: 1px solid var(--color-primary); 
  background: var(--color-primary); 
  color: #fff; 
  cursor: pointer; 
  font-size: 0.8125rem;
  height: auto;
  min-width: auto;
}
.broadcast-btn, :deep(.broadcast-btn) {
  background: #16a34a;
  border-color: #16a34a;
}
.process-btn:hover, .broadcast-btn:hover,
:deep(.process-btn:hover), :deep(.broadcast-btn:hover) { 
  filter: brightness(0.95); 
  background: var(--color-primary); 
  color: #fff; 
  border-color: var(--color-primary);
}
.broadcast-btn:hover, :deep(.broadcast-btn:hover) {
  background: #16a34a;
  border-color: #16a34a;
}
:deep(.viz) :deep(.flowchart) svg { width: 100%; height: auto; display: block; }
</style>
