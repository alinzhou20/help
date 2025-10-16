<template>
  <div class="code-panel-container">
    <div class="panel code1">
      <div class="code1-title">
        <span>程序区域</span>
        <div class="title-buttons">
          <el-button class="run-btn" @click="runNow" :disabled="waitingForContent" v-show="false">运行</el-button>
          <el-button class="paste-btn" @click="pasteCode">粘贴</el-button>
        </div>
      </div>
      <!-- 显示模式 -->
      <div class="code1-pre" v-if="!waitingForContent">
        <!-- 基础代码（无"无解"判断） -->
        <template v-if="!codeInfo.hasNoSolution">
          <div :class="['code1-line', { active: activeCodeIdxs.includes(0) }]">
            <span>tu = </span><span class="num">0</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(1) }]">
            <span class="kw">while</span>
            <span> tu &lt; </span>
            <span class="num expr">{{ (heads ?? 0) + 1 }}</span>
            <span> :</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(2) }]">
            <span class="indent indent-4"></span><span>ji = </span>
            <input class="inline-num" type="number" :value="heads ?? 0" @input="onHeadsInput($event)" :disabled="waitingForContent" />
            <span> - tu</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(3) }]">
            <span class="indent indent-4"></span><span class="kw">if</span>
            <span> ji * 2 + tu * 4 == </span>
            <input class="inline-num" type="number" :value="legs ?? 0" @input="onLegsInput($event)" :disabled="waitingForContent" />
            <span> :</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(4) }]">
            <span class="indent indent-8"></span><span class="fn">print</span>(ji,<span class="str">"只鸡，"</span>,tu,<span class="str">"只兔。"</span>)
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(5) }]">
            <span class="indent indent-4"></span><span>tu = tu + </span><span class="num">1</span>
          </div>
        </template>
        
        <!-- 增强版代码（含"无解"判断） -->
        <template v-else>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(0) }]">
            <span>tu = </span><span class="num">0</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(1) }]">
            {{ codeInfo.varName }} = <span :class="codeInfo.isBool ? 'bool' : 'num'">{{ formatValue(codeInfo.defaultValue, codeInfo.isBool) }}</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(2) }]">
            <span class="kw">while</span>
            <span> tu &lt; </span>
            <span class="num expr">{{ (heads ?? 0) + 1 }}</span>
            <span> :</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(3) }]">
            <span class="indent indent-4"></span><span>ji = </span>
            <input class="inline-num" type="number" :value="heads ?? 0" @input="onHeadsInput($event)" :disabled="waitingForContent" />
            <span> - tu</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(4) }]">
            <span class="indent indent-4"></span><span class="kw">if</span>
            <span> ji * 2 + tu * 4 == </span>
            <input class="inline-num" type="number" :value="legs ?? 0" @input="onLegsInput($event)" :disabled="waitingForContent" />
            <span> :</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(5) }]">
            <span class="indent indent-8"></span><span class="fn">print</span>(ji,<span class="str">"只鸡，"</span>,tu,<span class="str">"只兔。"</span>)
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(6) }]">
            <span class="indent indent-8"></span>{{ codeInfo.varName }} = <span :class="codeInfo.isBool ? 'bool' : 'num'">{{ formatValue(codeInfo.successValue, codeInfo.isBool) }}</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(7) }]">
            <span class="indent indent-4"></span><span>tu = tu + </span><span class="num">1</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(8) }]">
            <span class="kw">if</span> <span v-html="formatCheckExpression(codeInfo.checkExpression)"></span>:
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(9) }]">
            <span class="indent indent-4"></span><span class="fn">print</span>(<span class="str">"{{ store.codeInfo.noSolutionText || '此题无解' }}"</span>)
          </div>
        </template>
      </div>
      <div class="code1-pre waiting-content" v-else>
        <div class="waiting-text">等待教师下发内容...</div>
      </div>
    </div>

    <div class="panel output-card">
      <div class="panel-title row">
        <span>输出</span>
      </div>
      <div class="output-body">
        <pre><code>{{ outputText }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import type { CodeInfo } from '@/stores/useBruteStudentStore'
import { useBruteStudentStore } from '@/stores/useBruteStudentStore'
import { useBruteDemoStore } from '@/stores/useBruteDemoStore'
import { ElMessage } from 'element-plus'

// 定义store类型
type StudentStore = ReturnType<typeof useBruteStudentStore>
type DemoStore = ReturnType<typeof useBruteDemoStore>

const props = defineProps<{
  store: StudentStore | DemoStore
  showProcess?: boolean
  waitingForContent?: boolean
}>()

// showProcess 的默认值
const showProcess = computed(() => props.showProcess ?? false)

// heads/legs 动态输入
const heads = computed(() => props.store.totalHeads)
const legs = computed(() => props.store.totalLegs)

// 代码信息
const codeInfo = computed(() => props.store.codeInfo)

// 当前代码
const currentCode = ref('')  // 保存当前代码

// 自定义输出
const manualText = ref('')
const useManual = ref(false)

// 实际输出文本
const outputText = computed(() => {
  if (props.waitingForContent) return ''
  if (useManual.value) return manualText.value
  if (props.store.rows.length === 0) return ''
  // 根据算法演示的输出数据
  return props.store.rows
    .map(r => (r.output || '').trim())
    .filter(Boolean)
    .join('\n')
})

function runNow() {
  if (props.waitingForContent) return
  
  const h = heads.value ?? 0
  const l = legs.value ?? 0
  let tu = 0
  const out: string[] = []
  let hasSolution = false
  
  while (tu < h + 1) {
    const ji = h - tu
    if (ji * 2 + tu * 4 === l) {
      out.push(`${ji}只鸡, ${tu}只兔`)
      hasSolution = true
    }
    tu = tu + 1
  }
  
    if (codeInfo.value.hasNoSolution && !hasSolution) {
      out.push(codeInfo.value.noSolutionText || '此题无解')
    }
  
  manualText.value = out.join('\n')
  useManual.value = true
}

// 与流程图步骤同步高亮
const activeCodeIdxs = computed<number[]>(() => {
  const step = props.store.currentStep
  const last = props.store.rows[props.store.rows.length - 1]
  
  if (!codeInfo.value.hasNoSolution) {
    // 基础版本的高亮逻辑
    switch (step) {
      case 1: return [0] // tu <- 0
      case 2: return [1] // while 判断
      case 3: return [2] // ji = heads - tu
      case 4: return [3] // if 判断
      case 5: return last && last.ok ? [4] : [3] // 命中时高亮打印
      case 6: return [5] // tu = tu + 1
      default: return []
    }
  } else {
    // 增强版本的高亮逻辑（根据V2版本调整）
    switch (step) {
      case 1: return [0, 1] // tu=0, jie=0
      case 2: return [2] // while 判断
      case 3: return [3] // ji = heads - tu
      case 4: return [4] // if 判断
      case 5: return last && last.ok ? [5] : [4] // 输出
      case 6: return [6] // jie = 1
      case 7: return [7] // tu = tu + 1
      case 8: return [8] // if jie == 0
      case 9: return [9] // print("此题无解")
      default: return []
    }
  }
})

// 格式化值的显示
function formatValue(value: string, isBool: boolean): string {
  if (isBool) {
    // 布尔值保持大写首字母
    return value
  }
  return value
}

// 格式化检查表达式，给数字添加样式
function formatCheckExpression(expr: string): string {
  // 将表达式中的数字替换为带样式的span
  return expr.replace(/\b(\d+)\b/g, '<span class="num">$1</span>')
}

// 基础代码模板
const baseCode = computed(() => `tu = 0
while tu < ${(heads.value ?? 5) + 1}:
    ji = ${heads.value ?? 5} - tu
    if ji * 2 + tu * 4 == ${legs.value ?? 9}:
        print(ji, "只鸡，", tu, "只兔。")
    tu = tu + 1`)

// 判断是否是学生端store
function isStudentStore(store: any): store is StudentStore {
  return 'receiveFromTeacher' in store
}

// 输入头数和脚数
function onHeadsInput(e: Event) {
  if (props.waitingForContent) return
  const v = Number((e.target as HTMLInputElement).value)
  const safe = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0
  props.store.setInput(safe, props.store.totalLegs ?? 0)
}

function onLegsInput(e: Event) {
  if (props.waitingForContent) return
  const v = Number((e.target as HTMLInputElement).value)
  const safe = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0
  props.store.setInput(props.store.totalHeads ?? 0, safe)
}

// 粘贴代码
async function pasteCode() {
  try {
    // 检查浏览器是否支持剪贴板API
    if (!navigator.clipboard) {
      ElMessage.error('浏览器不支持剪贴板访问，请使用HTTPS访问或手动输入代码')
      return
    }
    
    // 读取剪贴板内容
    const text = await navigator.clipboard.readText()
    if (!text || !text.trim()) {
      ElMessage.warning('剪贴板中没有内容')
      return
    }
    
    // 直接保存粘贴的代码
    saveEdit(text.trim())
  } catch (error) {
    console.error('Failed to read clipboard:', error)
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      ElMessage.error('无法访问剪贴板权限，请确保使用HTTPS访问并授予剪贴板权限')
    } else {
      ElMessage.error('读取剪贴板失败，请手动输入代码')
    }
  }
}

// 保存编辑
function saveEdit(code: string) {
  
  // 解析代码，提取变量信息
  const parsed = parseCode(code)
  if (parsed) {
    // 提取并更新头数和腿数
    const headsLegs = extractHeadsAndLegs(code)
    if (headsLegs) {
      // 更新数据
      if (isStudentStore(props.store)) {
        // 直接更新传入的store（学生端store）
        props.store.receiveFromTeacher({
          code: code,
          codeInfo: parsed,
          totalHeads: headsLegs.heads,
          totalLegs: headsLegs.legs
        })
        
        // 通过store的hasContent触发父组件的保存逻辑
        // 父组件Activity2会监听hasContent的变化并保存
        
        currentCode.value = code  // 保存当前代码
        
        // 如果之前没有内容，现在设置为有内容
        if (props.waitingForContent && props.store.hasContent !== undefined) {
          props.store.hasContent = true
        }
        
        ElMessage.success('代码保存成功')
      }
    } else {
      ElMessage.error('无法识别代码中的参数')
      return
    }
  } else {
    ElMessage.error('代码格式不正确')
    return
  }
}

// 从代码中提取总头数和总腿数
function extractHeadsAndLegs(code: string): { heads: number, legs: number } | null {
  // 移除注释
  const cleanCode = code.split('\n').map(line => {
    const commentIndex = line.indexOf('#')
    return commentIndex !== -1 ? line.substring(0, commentIndex) : line
  }).join('\n')
  
  // 查找 while tu < N 模式
  const whilePattern = /while\s+tu\s*<\s*(\d+)/
  const whileMatch = cleanCode.match(whilePattern)
  if (!whileMatch) return null
  
  const heads = Number(whileMatch[1]) - 1  // N-1 是总头数
  
  // 查找 ji * 2 + tu * 4 == M 模式
  const legsPattern = /ji\s*\*\s*2\s*\+\s*tu\s*\*\s*4\s*==\s*(\d+)/
  const legsMatch = cleanCode.match(legsPattern)
  if (!legsMatch) return null
  
  const legs = Number(legsMatch[1])
  
  return { heads, legs }
}

// 解析代码，提取变量信息
function parseCode(code: string): CodeInfo | null {
  // 预处理：移除注释
  const cleanCode = code.split('\n').map(line => {
    const commentIndex = line.indexOf('#')
    return commentIndex !== -1 ? line.substring(0, commentIndex) : line
  }).join('\n')
  
  // 检查是否包含无解判断（查找if...print模式）
  const checkPattern = /if\s+(.+?):\s*\n\s*print\s*\(\s*["']([^"']+)["']\s*\)/
  const checkMatch = cleanCode.match(checkPattern)
  
  // 如果没有找到无解判断模式，返回基础版本
  if (!checkMatch) {
    return {
      hasNoSolution: false,
      varName: 'jie',
      isBool: false,
      defaultValue: '0',
      successValue: '1',
      checkExpression: 'jie == 0',
      noSolutionText: '此题无解'
    }
  }
  
  const checkExpression = checkMatch[1].trim()
  const noSolutionText = checkMatch[2]  // 提取print中的文字
  
  // 从条件表达式中提取变量名
  let varName = ''
  let isBool = false
  let checkExpressionFormatted = checkExpression
  
  // 检查是否是 "not varName" 格式（布尔值）
  const notPattern = /^not\s+(\w+)$/
  const notMatch = checkExpression.match(notPattern)
  if (notMatch) {
    varName = notMatch[1]
    isBool = true
  } else {
    // 检查是否是 "varName == 0" 格式（数字）
    const eqPattern = /^(\w+)\s*==\s*0$/
    const eqMatch = checkExpression.match(eqPattern)
    if (eqMatch) {
      varName = eqMatch[1]
      isBool = false
    }
  }
  
  if (!varName) return null
  
  // 查找变量定义行
  const varDefPattern = new RegExp(`^\\s*${varName}\\s*=\\s*(False|True|0|1)\\s*$`, 'm')
  const varDefMatch = cleanCode.match(varDefPattern)
  
  if (!varDefMatch) return null
  
  const initValue = varDefMatch[1]
  const actualIsBool = initValue === 'False' || initValue === 'True'
  
  // 确保类型匹配
  if (actualIsBool !== isBool) return null
  
  // 提取成功时的赋值
  const successPattern = new RegExp(`\\s*${varName}\\s*=\\s*(True|False|0|1)`, 'g')
  const successMatches = [...cleanCode.matchAll(successPattern)]
  const successMatch = successMatches.find(m => m.index! > cleanCode.indexOf('if ji * 2'))
  
  if (!successMatch) return null
  
  const successValue = successMatch[1]
  
  return {
    hasNoSolution: true,
    varName,
    isBool,
    defaultValue: isBool ? (initValue === 'True' ? 'True' : 'False') : initValue,
    successValue: isBool ? (successValue === 'True' ? 'True' : 'False') : successValue,
    checkExpression: checkExpressionFormatted,
    noSolutionText: noSolutionText || '此题无解'
  }
}

// 监听数据变化，重置手动输出
watch(() => props.store.rows, () => {
  useManual.value = false
}, { deep: true })

// 监听store的codeInfo变化，当教师下发新内容时清除currentCode
watch(() => props.store.codeInfo, (newInfo, oldInfo) => {
  // 如果codeInfo发生了实质性变化（不仅仅是初始化），清除currentCode
  if (oldInfo && JSON.stringify(newInfo) !== JSON.stringify(oldInfo)) {
    currentCode.value = ''
  }
}, { deep: true })

// 组件挂载时，currentCode从StudentStore的code获取
onMounted(() => {
  if (isStudentStore(props.store) && props.store.code) {
    currentCode.value = props.store.code
  }
})
</script>

<style scoped>
.code-panel-container { display: flex; flex-direction: column; gap: 1rem; height: 100%; }
.panel { 
  background: var(--color-surface); 
  border: 1px solid var(--color-border); 
  border-radius: .75rem; 
  overflow: hidden;
}
.panel.code1 { display: flex; flex-direction: column; flex: 1 1 auto; }
.panel.output-card { display: flex; flex-direction: column; flex: 0 0 auto; }
.code1-title, .panel-title { 
  padding: .45rem .6rem; 
  font-weight: 700; 
  font-size: 0.8125rem;
  color: #111827; 
  background: #f3f4f6; 
  border-bottom: 1px solid rgba(0,0,0,.08); 
  display:flex; 
  align-items:center; 
  justify-content: space-between; 
  gap: .5rem; 
  border-radius: .75rem .75rem 0 0;
}
.title-buttons { display: flex; gap: 0.5rem; }
.paste-btn, :deep(.paste-btn) {
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
.paste-btn:hover, :deep(.paste-btn:hover) {
  filter: brightness(0.95);
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
.run-btn, :deep(.run-btn) { 
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
.run-btn:hover, :deep(.run-btn:hover) { 
  filter: brightness(0.95); 
  background: var(--color-primary); 
  color: #fff; 
  border-color: var(--color-primary);
}
.code1-pre { margin: 0; padding: .4rem .6rem; color: #111; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.75rem; line-height: 1.2; flex: 1; overflow: auto; }
.code1-pre.waiting-content { display: flex; align-items: center; justify-content: center; min-height: 200px; }
.waiting-text { color: #6b7280; font-size: 1rem; font-family: inherit; }
.inline-num { width: 3.5rem; appearance: textfield; -moz-appearance: textfield; -webkit-appearance: none; border: 1px solid rgba(0,0,0,.25); background: #fff; color: #111; border-radius: .35rem; padding: .08rem .3rem; margin: 0 .15rem; font-family: inherit; font-size: 0.75rem; vertical-align: baseline; display: inline-block; }
.inline-num:focus { outline: none; border-color: rgba(59,130,246,.8); box-shadow: 0 0 0 2px rgba(59,130,246,.25); }
.inline-num:disabled { background: #f3f4f6; color: #6b7280; cursor: not-allowed; }
.code1-line { position: relative; padding: .08rem .4rem; border-radius: .3rem; color: #111; white-space: nowrap; }
.code1-line.active::before { content: ''; position: absolute; inset: 0; border-radius: .3rem; background: rgba(16,185,129,.18); box-shadow: inset 0 0 0 1px rgba(16,185,129,.25); pointer-events: none; }
.indent { display: inline-block; }
.indent-4 { width: 4ch; }
.indent-8 { width: 8ch; }
.kw { color: #d97706; font-weight: 700; }
.fn { color: #7c3aed; font-weight: 700; }
.str { color: #16a34a; }
.num { color: #0ea5e9; }
.expr { color: #0ea5e9; font-weight: 600; }

/* 布尔值样式 */
.bool { color: #dc2626; font-weight: 600; }

/* 输出区域样式 */
.output-body { padding: .4rem .6rem; display: flex; flex-direction: column; }
.output-body pre { background: #0b1020; color: #e7f0ff; padding: .5rem; border-radius: .5rem; overflow: auto; min-height: 3.5rem; max-height: 7rem; line-height: 1.2; font-size: 0.75rem; }

/* 算法执行过程按钮样式 */
.process-btn, :deep(.process-btn) { 
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
.process-btn:hover, :deep(.process-btn:hover) { 
  filter: brightness(0.95); 
  background: var(--color-primary); 
  color: #fff; 
  border-color: var(--color-primary);
}

/* 标题行布局 */
.panel-title.row { display: flex; align-items: center; justify-content: space-between; }
</style>
