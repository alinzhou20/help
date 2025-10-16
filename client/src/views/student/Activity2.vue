<template>
  <section class="activity3flow">
    <!-- 学习评价（置顶，标签样式，完成项高亮显示星标） -->
    <div class="evaluation-top">
      <div class="eval-header">
        <span class="label">评价标准</span>
      </div>
      <ol class="criteria-list">
        <li :class="{ done: eval1 }">
          <span>1.能理解新增变量的作用</span>
          <Icon v-if="eval1" icon="material-symbols:star" class="star-icon" />
        </li>
        <li :class="{ done: eval2 }" v-if="store.codeInfo.hasNoSolution">
          <span>2.能理解变量的初始值</span>
          <Icon v-if="eval2" icon="material-symbols:star" class="star-icon" />
        </li>
        <li :class="{ done: eval3 }" v-if="store.codeInfo.hasNoSolution">
          <span>3.通过观察算法执行的过程，能理解完善后的算法</span>
          <Icon v-if="eval3" icon="material-symbols:star" class="star-icon" />
        </li>
      </ol>
    </div>

    <div class="grid show-process">
      <div class="left-col">
        <!-- 活动步骤区域 -->
        <div class="panel steps-panel">
          <div class="panel-title">活动步骤</div>
          <div class="steps-content">
            <div class="step-item">
              <span class="step-number">步骤1</span>
              <span class="step-text">复制智能体中生成的程序粘贴到程序区域</span>
            </div>
            <div class="step-item">
              <span class="step-number">步骤2</span>
              <span class="step-text">观察程序的运行过程</span>
            </div>
            <div class="step-item">
              <span class="step-number">步骤3</span>
              <span class="step-text">修改代码中的参数：总头数为5，总脚数为14</span>
            </div>
            <div class="step-item">
              <span class="step-number">步骤4</span>
              <span class="step-text">观察修改参数后程序的运行结果，完成思考中的题目</span>
            </div>
          </div>
        </div>
        <!-- 代码区域 -->
        <CodePanelFlowStudent class="panel code-panel" :store="store" :showProcess="true" :waitingForContent="!hasReceivedContent" />
      </div>
      <div class="panel viz">
        <div class="panel-title row">
          <span>流程图</span>
          <div class="ctrl-buttons">
            <el-button @click="handleNextStep" :disabled="!store.canNext" class="custom-btn">下一步</el-button>
            <el-button @click="handlePlayToggle" :disabled="!store.canPlay" class="custom-btn">{{ store.playing ? '暂停' : '自动播放' }}</el-button>
            <el-button @click="handleResetRuntime" class="custom-btn">重置运行</el-button>
          </div>
        </div>
        <BruteFlowChartStudent v-if="hasReceivedContent" />
        <div class="empty-flowchart" v-else>
          <el-empty description="等待教师下发内容..." :image-size="60"></el-empty>
        </div>
      </div>
      <div class="panel ctrl">
        <div class="panel-title row">
          <span>枚举过程</span>
        </div>
        <div class="table-container" v-if="hasReceivedContent">
          <ResultsTableStudent :rows="store.rows" />
        </div>
        <div class="empty-table" v-else>
          <el-empty description="等待教师下发内容..." :image-size="60"></el-empty>
        </div>
      </div>
    </div>
    
    <!-- 完成以下思考 -->
    <div class="panel test-records">
      <div class="panel-title">
        <span>完成以下思考</span>
      </div>
      <div v-if="hasReceivedContent" class="questions-container">
        <!-- 题目1：合并原题目1和题目2 -->
        <div class="question-item">
          <div class="question-line">
            <span class="question-text">1. {{ store.codeInfo.varName }}={{ formatQuestionValue(store.codeInfo.defaultValue, store.codeInfo.isBool) }}表示</span>
            <el-radio-group v-model="question1Answer" size="default">
              <el-radio label="A">有解</el-radio>
              <el-radio label="B">无解</el-radio>
            </el-radio-group>
            <span class="question-text">，{{ store.codeInfo.varName }}={{ formatQuestionValue(store.codeInfo.successValue, store.codeInfo.isBool) }}表示</span>
            <el-radio-group v-model="question2Answer" size="default">
              <el-radio label="A">有解</el-radio>
              <el-radio label="B">无解</el-radio>
            </el-radio-group>
          </div>
        </div>
        
        <!-- 题目2：原题目3（仅在增强版显示） -->
        <div class="question-item" v-if="store.codeInfo.hasNoSolution">
          <div class="question-line">
            <span class="question-text">2. {{ store.codeInfo.varName }}的初始值是</span>
            <el-radio-group v-model="question3InitValue" size="default">
              <el-radio v-if="store.codeInfo.isBool" label="True">True</el-radio>
              <el-radio v-if="store.codeInfo.isBool" label="False">False</el-radio>
              <el-radio v-if="!store.codeInfo.isBool" label="0">0</el-radio>
              <el-radio v-if="!store.codeInfo.isBool" label="1">1</el-radio>
            </el-radio-group>
          </div>
        </div>
        
        <!-- 题目3：原题目4（仅在增强版显示） -->
        <div class="question-item" v-if="store.codeInfo.hasNoSolution">
          <div class="question-line">
            <span class="question-text">3. 在代码运行的过程中{{ store.codeInfo.varName }}的值是否发生了改变</span>
            <el-radio-group v-model="question3Changed" size="default">
              <el-radio label="yes">是</el-radio>
              <el-radio label="no">否</el-radio>
            </el-radio-group>
            <span class="question-text" v-if="question3Changed === 'yes'">，{{ store.codeInfo.varName }}的值在tu=</span>
            <el-input v-if="question3Changed === 'yes'" v-model="question4TuValue" size="small" style="width: 4rem; margin: 0 0.25rem;" />
            <span class="question-text" v-if="question3Changed === 'yes'">时发生改变</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-questions">
        <el-empty description="等待教师下发内容..." :image-size="60"></el-empty>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'Activity2' })
import CodePanelFlowStudent from '@/views/components/CodePanelFlowStudent.vue'
import BruteFlowChartStudent from '@/views/student/widgets/BruteFlowChartStudent.vue'
import ResultsTableStudent from '@/views/student/widgets/ResultsTableStudent.vue'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSessionStore } from '@/stores/useSessionStore'
import { useBruteStudentStore } from '@/stores/useBruteStudentStore'
import { emit, subscribe, type RealtimeEvent } from '@/utils/realtime'
import { Icon } from '@iconify/vue'

const store = useBruteStudentStore()
// 是否展示"流程图2 + 枚举过程"区域（现在始终显示）
const showProcess = ref(true)
// 标记是否已接收教师下发的内容
const hasReceivedContent = ref(false)

// localStorage key - 使用统一的key存储所有数据
const ACTIVITY2_DATA_KEY = 'va_student_activity2_data'
const ACTIVITY2_VERSION_KEY = 'va_student_activity2_version'  // 用于版本控制

// 清理活动数据
function clearActivityData() {
  localStorage.removeItem(ACTIVITY2_DATA_KEY)
  localStorage.removeItem(ACTIVITY2_VERSION_KEY)
  store.clearContent()
  hasReceivedContent.value = false
  clearAllAnswers()
}

// 保存完整的活动数据（包括内容、答案、运行时状态）
function saveActivityData(source: 'teacher' | 'student', version?: number) {
  const data = {
    // 内容数据
    content: {
      code: store.code,
      codeInfo: store.codeInfo,
      totalHeads: store.totalHeads,
      totalLegs: store.totalLegs
    },
    // 来源、时间戳和版本号
    source: source,
    timestamp: Date.now(),
    version: version || Date.now(),  // 使用时间戳作为版本号
    // 思考题答案
    answers: {
      question1Answer: question1Answer.value,
      question2Answer: question2Answer.value,
      question3InitValue: question3InitValue.value,
      question3Changed: question3Changed.value,
      question4TuValue: question4TuValue.value
    },
    // 运行时状态
    runtimeState: {
      currentStep: store.currentStep,
      rows: store.rows,
      tu: store.tu,
      ji: store.ji,
      activeEdge: store.activeEdge,
      cond1FalsePending: store.cond1FalsePending
    }
  }
  localStorage.setItem(ACTIVITY2_DATA_KEY, JSON.stringify(data))
  
  // 如果是教师下发，保存版本号
  if (source === 'teacher' && version) {
    localStorage.setItem(ACTIVITY2_VERSION_KEY, String(version))
  }
}

// 恢复活动数据
function restoreActivityData() {
  const saved = localStorage.getItem(ACTIVITY2_DATA_KEY)
  if (saved) {
    try {
      const data = JSON.parse(saved)
      
      // 恢复内容
      if (data.content) {
        store.receiveFromTeacher(data.content)
        hasReceivedContent.value = true
      }
      
      // 恢复思考题答案
      if (data.answers) {
        question1Answer.value = data.answers.question1Answer || ''
        question2Answer.value = data.answers.question2Answer || ''
        question3InitValue.value = data.answers.question3InitValue || ''
        question3Changed.value = data.answers.question3Changed || ''
        question4TuValue.value = data.answers.question4TuValue || ''
      }
      
      // 恢复运行时状态
      if (data.runtimeState) {
        store.currentStep = data.runtimeState.currentStep || 0
        store.rows = data.runtimeState.rows || []
        store.tu = data.runtimeState.tu
        store.ji = data.runtimeState.ji
        store.activeEdge = data.runtimeState.activeEdge
        store.cond1FalsePending = data.runtimeState.cond1FalsePending || false
      }
      
      return true // 成功恢复
    } catch (e) {
      console.error('Failed to restore activity data:', e)
    }
  }
  return false // 没有恢复数据
}
// 题目答案
const question1Answer = ref<'A' | 'B' | ''>('')
const question2Answer = ref<'A' | 'B' | ''>('')
const question3InitValue = ref('')
const question3Changed = ref<'yes' | 'no' | ''>('')
const question4TuValue = ref('')

// 格式化题目中的值显示
function formatQuestionValue(value: string, isBool: boolean): string {
  if (isBool) {
    // 布尔值保持大写首字母
    return value === '1' || value === 'true' || value === 'True' ? 'True' : 'False'
  }
  return value
}

// 清空所有题目答案
function clearAllAnswers() {
  question1Answer.value = ''
  question2Answer.value = ''
  question3InitValue.value = ''
  question3Changed.value = ''
  question4TuValue.value = ''
}

// 执行完整的算法以生成结果数据
function executeAlgorithmCompletely() {
  store.resetRuntime()
  // 执行所有步骤直到结束
  while (store.canNext) {
    store.nextStep()
  }
}

// 评价逻辑：正确回答题目得星
const eval1 = computed(() => {
  // 题目1（合并后的）全部答对得一星
  // 默认值代表无解，成功值代表有解
  return question1Answer.value === 'B' && question2Answer.value === 'A'
})

// 评价逻辑：题目2正确得第二星（仅限增强版）
const eval2 = computed(() => {
  // 只有增强版（有无解判断）才需要评价题目2
  if (!store.codeInfo.hasNoSolution) {
    return false
  }
  
  // 需要正确填写初始值
  const correctInitValue = formatQuestionValue(store.codeInfo.defaultValue, store.codeInfo.isBool)
  return question3InitValue.value === correctInitValue
})

// 评价逻辑：题目3正确得第三星（仅限增强版）
const eval3 = computed(() => {
  // 只有增强版（有无解判断）才需要评价题目3
  if (!store.codeInfo.hasNoSolution) {
    return false
  }
  
  // 基于总头数和总腿数计算是否有解
  const totalHeads = store.totalHeads ?? 0
  const totalLegs = store.totalLegs ?? 0
  let hasSolution = false
  let solutionJi = 0
  let solutionTu = 0
  
  // 使用循环查找解
  for (let tu = 0; tu <= totalHeads; tu++) {
    const ji = totalHeads - tu
    if (ji * 2 + tu * 4 === totalLegs && ji >= 0) {
      hasSolution = true
      solutionJi = ji
      solutionTu = tu
      break
    }
  }
  
  const correctChanged = hasSolution ? 'yes' : 'no'
  
  // 首先判断是否改变的选择是否正确
  if (question3Changed.value !== correctChanged) {
    return false
  }
  
  // 如果没有改变（无解），则只需要选择"否"即可
  if (!hasSolution) {
    return true
  }
  
  // 如果有改变（有解），还需要判断tu值是否正确
  const correctTu = String(solutionTu)
  return question4TuValue.value === correctTu
})
const stars = computed(() => {
  // 基础版只有1颗星，增强版有3颗星
  const star1 = eval1.value ? 1 : 0
  const star2 = store.codeInfo.hasNoSolution && eval2.value ? 1 : 0
  const star3 = store.codeInfo.hasNoSolution && eval3.value ? 1 : 0
  return star1 + star2 + star3
})

// —— 记录测试结果持久化 ——
const session = useSessionStore()
// 监听教师下发的内容
let unsubscribe: (() => void) | null = null

// 监听store的变化来自动保存活动数据
let saveTimer: number | null = null
function debouncedSaveActivityData(source: 'teacher' | 'student' = 'student') {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    saveActivityData(source)
  }, 500) as unknown as number
}

// 监听store变化
watch(() => [store.currentStep, store.rows.length], () => {
  if (hasReceivedContent.value) {
    debouncedSaveActivityData('student')
  }
})

// 监听代码变化（学生修改代码时触发）
watch(() => store.code, () => {
  if (hasReceivedContent.value && store.code) {
    debouncedSaveActivityData('student')
  }
})

// 监听store的hasContent变化，同步更新hasReceivedContent
watch(() => store.hasContent, (newVal) => {
  if (newVal && !hasReceivedContent.value) {
    hasReceivedContent.value = true
    // 学生修改代码时保存
    saveActivityData('student')
  }
})

// 当前教师广播版本（用于避免重复处理）
let currentBroadcastVersion: number | null = null

// 页面可见性监听器
function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && session.persisted.groupId != null) {
    // 页面变为可见时，请求最新的教师广播（如果有的话）
    console.log('[Activity2] Page became visible, checking for updates')
    emit({ 
      type: 'student:request-broadcast', 
      activity: 'a2', 
      groupId: session.persisted.groupId 
    })
  }
}

onMounted(() => {
  // 恢复保存的活动数据（包括内容、答案、运行时状态）
  const restored = restoreActivityData()
  
  // 如果恢复了数据，获取当前版本号
  if (restored) {
    const savedVersion = localStorage.getItem(ACTIVITY2_VERSION_KEY)
    if (savedVersion) {
      currentBroadcastVersion = parseInt(savedVersion)
    }
  }
  
  // 如果没有保存的数据，尝试迁移旧数据
  if (!restored) {
    // 尝试加载旧的教师下发内容或学生自定义代码
    const savedBroadcast = localStorage.getItem('va_student_activity2_broadcast')
    const savedCustomCode = localStorage.getItem('va_student_activity2_custom_code')
    
    if (savedBroadcast) {
      try {
        const broadcastData = JSON.parse(savedBroadcast)
        store.receiveFromTeacher({
          code: broadcastData.code || '',
          codeInfo: broadcastData.codeInfo,
          totalHeads: broadcastData.totalHeads,
          totalLegs: broadcastData.totalLegs
        })
        hasReceivedContent.value = true
        // 保存到新格式并清理旧数据
        saveActivityData('teacher')
        localStorage.removeItem('va_student_activity2_broadcast')
        localStorage.removeItem('va_student_activity2_runtime')
      } catch (e) {
        console.error('Failed to migrate old broadcast:', e)
      }
    } else if (savedCustomCode) {
      try {
        const customData = JSON.parse(savedCustomCode)
        store.receiveFromTeacher({
          code: customData.code || '',
          codeInfo: customData.codeInfo,
          totalHeads: customData.totalHeads,
          totalLegs: customData.totalLegs
        })
        hasReceivedContent.value = true
        // 保存到新格式并清理旧数据
        saveActivityData('student')
        localStorage.removeItem('va_student_activity2_custom_code')
      } catch (e) {
        console.error('Failed to migrate old custom code:', e)
      }
    }
  }
  
  // 监听教师下发的内容
  unsubscribe = subscribe((evt: RealtimeEvent) => {
    console.log('[Activity2] Received event:', evt.type, evt)
    if (evt.type === 'teacher:broadcast' && evt.activity === 'a2') {
      console.log('[Activity2] Processing teacher broadcast:', evt.data)
      
      // 获取下发内容的版本号
      const newVersion = (evt.data as any).version || Date.now()
      const currentData = localStorage.getItem(ACTIVITY2_DATA_KEY)
      
      // 如果版本号相同，跳过更新（避免重复处理）
      if (currentBroadcastVersion && newVersion === currentBroadcastVersion) {
        console.log('[Activity2] Skip update: same version')
        return
      }
      
      // 判断是否需要更新
      let shouldUpdate = true
      if (currentData) {
        try {
          const savedData = JSON.parse(currentData)
          // 如果当前是学生修改的内容，且修改时间晚于教师下发
          if (savedData.source === 'student' && savedData.timestamp > newVersion) {
            shouldUpdate = false
            console.log('[Activity2] Skip update: student has newer modifications')
          }
        } catch (e) {
          console.error('Failed to check current data:', e)
        }
      }
      
      if (shouldUpdate) {
        store.receiveFromTeacher({
          code: evt.data.code || '',
          codeInfo: evt.data.codeInfo,
          totalHeads: evt.data.totalHeads,
          totalLegs: evt.data.totalLegs
        })
        hasReceivedContent.value = true
        
        // 清空所有题目答案
        clearAllAnswers()
        
        // 重置流程图运行状态，清空枚举表格
        store.resetRuntime()
        
        // 保存教师下发的内容（带版本号）
        saveActivityData('teacher', newVersion)
        currentBroadcastVersion = newVersion  // 记录当前版本号
        console.log('[Activity2] Teacher broadcast processed successfully, version:', newVersion)
      }
    }
    
    // 响应教师端的ping请求
    if (evt.type === 'teacher:ping') {
      // 如果有保存的状态，立即发送给教师端（只有记录员才发送）
      if (hasReceivedContent.value && session.persisted.groupId != null && session.persisted.role === 'recorder') {
        setTimeout(() => {
          const currentStars = stars.value
          emit({
            type: 'student:update',
            groupId: session.persisted.groupId!,
            activity: 'a2',
            stars: currentStars,
            payload: {
              question1Answer: question1Answer.value,
              question2Answer: question2Answer.value,
              question3InitValue: question3InitValue.value,
              question3Changed: question3Changed.value,
              question4TuValue: question4TuValue.value,
            }
          })
        }, 100)
      }
    }
    
    // 处理教师清除下发内容事件
    if (evt.type === 'teacher:broadcasts-cleared') {
      console.log('[Activity2] Teacher cleared broadcasts, resetting local content')
      // 清除所有活动数据
      clearActivityData()
    }
  })
  
  // 只有在没有本地数据时才请求最新的广播内容
  if (!restored && session.persisted.groupId != null) {
    console.log('[Activity2] No local data, requesting latest broadcast from teacher')
    emit({ 
      type: 'student:request-broadcast', 
      activity: 'a2', 
      groupId: session.persisted.groupId 
    })
    
    // 订阅成功后，如果还没有内容，再次请求
    setTimeout(() => {
      if (!hasReceivedContent.value && session.persisted.groupId != null) {
        console.log('[Activity2] Retrying broadcast request')
        emit({ 
          type: 'student:request-broadcast', 
          activity: 'a2', 
          groupId: session.persisted.groupId 
        })
      }
    }, 1000)
  }
  
  // 监听页面可见性变化
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

// 页面卸载时清理监听器
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  
  // 如果用户已退出登录，清除活动数据
  if (!session.isLoggedIn()) {
    console.log('[Activity2] Component unmounting while logged out, clearing activity data')
    clearActivityData()
  }
})

watch([question1Answer, question2Answer, question3InitValue, question3Changed, question4TuValue], () => {
  // 思考题答案变化时保存到localStorage
  if (hasReceivedContent.value) {
    debouncedSaveActivityData('student')
  }
  
  // 保存星星数（修复导航栏不显示星星的问题）（只有记录员才保存）
  if (session.persisted.role === 'recorder') {
    session.setRecords('stars_a2', stars.value)
  }
  // 广播更新（只有记录员才向教师端发送）
  if (session.persisted.groupId != null && session.persisted.role === 'recorder') {
    emit({ type: 'student:update', groupId: session.persisted.groupId, activity: 'a2', stars: stars.value, payload: {
      question1Answer: question1Answer.value,
      question2Answer: question2Answer.value,
      question3InitValue: question3InitValue.value,
      question3Changed: question3Changed.value,
      question4TuValue: question4TuValue.value,
    } })
  }
}, { deep: true })

// 控制按钮的处理函数
function handleNextStep() {
  store.nextStep()
  debouncedSaveActivityData('student')  // 保存状态
}

function handlePlayToggle() {
  store.playToggle()
  if (!store.playing) {
    debouncedSaveActivityData('student')  // 暂停时保存状态
  }
}

function handleResetRuntime() {
  store.resetRuntime()
  debouncedSaveActivityData('student')  // 重置后保存状态
}

// 监听退出事件 - 主动退出时清除数据
watch(() => session.persisted.groupId, (newGroupId, oldGroupId) => {
  // 只有在主动退出（groupId从有值变为null）时才清除数据
  if (oldGroupId != null && newGroupId == null) {
    console.log('[Activity2] User logged out, clearing activity data')
    clearActivityData()
  }
})
</script>

<style scoped>
@import '@/assets/styles/evaluation.css';
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

.grid {
  --left-col: clamp(31.25rem, 34vw, 36.25rem);
  --center-col: 1fr;
  --right-col: clamp(22.5rem, 22vw, 26.25rem);
  display: grid;
  grid-template-columns: var(--left-col) var(--center-col) var(--right-col);
  grid-template-rows: 60vh;
  gap: 0.75rem;
  align-items: start;
}
.grid:not(.show-process) {
  --center-col: 0;
  --right-col: 0;
}

.panel, :deep(.el-card) {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: .75rem;
  padding: 0;
  overflow: hidden;
}
:deep(.el-card__body) {
  padding: 0;
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
/* 空白状态的容器也需要适当高度 */
.empty-flowchart, .empty-table {
  min-height: 12.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
}
.panel-title { display:flex; align-items:center; justify-content: space-between; gap: .5rem; }

/* 分别控制不同区域的标题高度 */
.viz .panel-title {
  /* 流程图标题高度 - 可单独调整 */
  padding: .45rem .75rem;
}

.ctrl .panel-title {
  /* 枚举过程标题高度 - 可单独调整 */
  padding: .67rem .75rem;  /* 例如改为 .6rem .75rem 增加高度 */
}
.viz { 
  grid-column: 2; 
  grid-row: 1; 
  height: 60vh; 
  overflow: hidden; 
  position: relative; 
  min-width: 0; 
}
.grid .viz { grid-column: 2; grid-row: 1; }
.grid .ctrl { 
  grid-column: 3; 
  grid-row: 1; 
  height: 60vh; 
  overflow: hidden; 
  min-width: 0; 
  display: flex;
  flex-direction: column;
}
.left-col { 
  display: flex; 
  flex-direction: column; 
  height: 60vh; 
  min-height: 0; 
  gap: 0.4rem;  /* 减少步骤和代码区域间距 */
}

/* 步骤区域样式 */
.steps-panel {
  flex: 0 0 auto;
  height: auto; /* 自适应高度 */
}

/* 步骤区域标题更紧凑 */
.steps-panel .panel-title {
  padding: 0.35rem 0.75rem;  /* 减少标题内边距 */
  font-size: 0.8125rem;  /* 稍微减小标题字体 */
}

.steps-content {
  padding: 0.35rem 0.75rem;  /* 进一步减少内边距 */
  display: flex;
  flex-direction: column;
  gap: 0.25rem;  /* 进一步减少步骤间距 */
  overflow: hidden; /* 不需要滚动 */
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;  /* 减少间距 */
  line-height: 1.2;  /* 进一步减少行高 */
}

.step-number {
  flex-shrink: 0;
  background: var(--color-primary, #3b82f6);
  color: white;
  padding: 0.05rem 0.3rem;  /* 进一步减少内边距 */
  border-radius: 0.2rem;
  font-size: 0.7rem;  /* 进一步减小字体 */
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.3;
}

.step-text {
  font-size: 0.75rem;  /* 进一步减小字体 */
  color: #374151;
  line-height: 1.25;  /* 进一步减少行高 */
  flex: 1;
}

/* 代码区域高度调整 - 灵活占用剩余空间 */
.left-col .code-panel { 
  flex: 1 1 auto; 
  min-height: 0; 
  overflow: auto; 
}

/* 表格样式与活动2一致（表头白底） */
.records-table { width: 100%; border-collapse: collapse; background: #fff; }
.records-table th, .records-table td { border: 1px solid var(--color-border); padding: .5rem .6rem; text-align: center; }
.records-table th { background: #fff; font-weight: 800; }
.choice { white-space: nowrap; }
.choice > label { margin: 0 .5rem 0 0; cursor: pointer; }
.choice input[type="radio"] { margin-right: .25rem; }


/* 题目样式 */
.questions-container { padding: 1rem 1.5rem; }
.question-item { margin-bottom: 1.2rem; }
.question-item:last-child { margin-bottom: 0.5rem; }
.question-line { 
  display: flex; 
  align-items: center; 
  flex-wrap: wrap; 
  gap: 0.5rem;
  line-height: 1.8;
}
.question-text { 
  font-weight: 600; 
  font-size: 0.875rem; 
}
/* 单选按钮组样式 */
.question-line :deep(.el-radio-group) {
  margin: 0 0.25rem;
}
.question-line :deep(.el-radio) {
  margin-right: 0.75rem;
}
/* 输入框样式 */
.question-line :deep(.el-input) {
  vertical-align: middle;
}
.question-title { font-weight: 600; margin-bottom: 0.75rem; font-size: 0.875rem; }
.question-options { padding-left: 1rem; }
.empty-questions { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  min-height: 9.375rem; 
  font-size: 1rem;
  color: #999;
}

/* 顶部学习评价（标签样式） */
/* 评价标准样式已在 evaluation.css 中定义 */

/* 空白面板样式 */
.empty-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 18.75rem;
}
.empty-flowchart, .empty-table {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.empty-message {
  font-size: 1rem;
  color: #999;
}
/* Element UI Empty 组件样式覆盖 */
:deep(.el-empty) {
  padding: 1rem 0;
}
:deep(.el-empty__description) {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #999;
}
:deep(.el-empty__image) {
  width: auto;
  height: auto;
}

/* 记录测试结果样式 */
.test-records {
  margin-top: 0.5rem;
  width: 100%;
}
/* 测试记录面板的内容需要内边距 */
.test-records table {
  margin: .85rem;
}
.test-records .judge {
  padding: 0 .85rem .85rem;
}

@media (max-width: 56.25rem) {
  .grid { grid-template-columns: 1fr; }
  .viz { grid-row: auto; grid-column: auto; }
}

:deep(.viz) :deep(.flowchart) svg { width: 100%; height: auto; display: block; }
</style>
