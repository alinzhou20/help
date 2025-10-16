<template>
  <div class="code-panel-container">
    <div class="panel code1">
      <div class="code1-title">
        <span>程序区域{{ isEditing ? '（编辑中）' : '' }}</span>
        <div class="title-buttons">
          <el-button v-if="!isEditing" class="edit-btn" @click="startEdit">修改代码</el-button>
          <el-button v-if="isEditing" class="save-btn" @click="saveEdit">保存</el-button>
          <el-button v-if="isEditing" class="cancel-btn" @click="cancelEdit">取消</el-button>
          <el-button v-if="!isEditing" class="run-btn" @click="runNow">运行</el-button>
        </div>
      </div>
      
      <!-- 编辑模式 -->
      <textarea 
        v-if="isEditing" 
        v-model="editingCode" 
        class="code-editor"
        spellcheck="false"
      ></textarea>
      
      <!-- 显示模式 -->
      <div v-else class="code1-pre">
        <!-- 根据 codeInfo 动态渲染代码行 -->
        <template v-if="!codeInfo.hasNoSolution">
          <!-- 基础版本代码 -->
          <div :class="['code1-line', { active: activeCodeIdxs.includes(0) }]">tu = <span class="num">0</span></div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(1) }]">
            <span class="kw">while</span>
            <span> tu &lt; </span>
            <span class="num expr">{{ (heads ?? 0) + 1 }}</span>
            <span> :</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(2) }]">
            <span class="indent indent-4"></span><span>ji = </span>
            <input class="inline-num" type="number" :value="heads ?? 0" @input="onHeadsInput($event)" />
            <span> - tu</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(3) }]">
            <span class="indent indent-4"></span><span class="kw">if</span>
            <span> ji * 2 + tu * 4 == </span>
            <input class="inline-num" type="number" :value="legs ?? 0" @input="onLegsInput($event)" />
            <span> :</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(4) }]">
            <span class="indent indent-8"></span><span class="fn">print</span>(ji,<span class="str">"只鸡，"</span>,tu,<span class="str">"只兔。"</span>)
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(5) }]">
            <span class="indent indent-4"></span><span>tu = tu + </span><span class="num">1</span>
          </div>
        </template>
        
        <template v-else>
          <!-- 增强版本代码（包含无解判断） -->
          <div :class="['code1-line', { active: activeCodeIdxs.includes(0), 'enhanced-highlight': enhancedHighlightIdxs.includes(0) }]">tu = <span class="num">0</span></div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(1), 'enhanced-highlight': enhancedHighlightIdxs.includes(1) }]">
            {{ codeInfo.varName }} = <span :class="codeInfo.isBool ? 'bool' : 'num'">{{ formatValue(codeInfo.defaultValue, codeInfo.isBool) }}</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(2), 'enhanced-highlight': enhancedHighlightIdxs.includes(2) }]">
            <span class="kw">while</span>
            <span> tu &lt; </span>
            <span class="num expr">{{ (heads ?? 0) + 1 }}</span>
            <span> :</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(3), 'enhanced-highlight': enhancedHighlightIdxs.includes(3) }]">
            <span class="indent indent-4"></span><span>ji = </span>
            <input class="inline-num" type="number" :value="heads ?? 0" @input="onHeadsInput($event)" />
            <span> - tu</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(4), 'enhanced-highlight': enhancedHighlightIdxs.includes(4) }]">
            <span class="indent indent-4"></span><span class="kw">if</span>
            <span> ji * 2 + tu * 4 == </span>
            <input class="inline-num" type="number" :value="legs ?? 0" @input="onLegsInput($event)" />
            <span> :</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(5), 'enhanced-highlight': enhancedHighlightIdxs.includes(5) }]">
            <span class="indent indent-8"></span><span class="fn">print</span>(ji,<span class="str">"只鸡，"</span>,tu,<span class="str">"只兔。"</span>)
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(6), 'enhanced-highlight': enhancedHighlightIdxs.includes(6) }]">
            <span class="indent indent-8"></span>{{ codeInfo.varName }} = <span :class="codeInfo.isBool ? 'bool' : 'num'">{{ formatValue(codeInfo.successValue, codeInfo.isBool) }}</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(7), 'enhanced-highlight': enhancedHighlightIdxs.includes(7) }]">
            <span class="indent indent-4"></span><span>tu = tu + </span><span class="num">1</span>
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(8), 'enhanced-highlight': enhancedHighlightIdxs.includes(8) }]">
            <span class="kw">if</span> <span v-html="formatCheckExpression(codeInfo.checkExpression)"></span>:
          </div>
          <div :class="['code1-line', { active: activeCodeIdxs.includes(9), 'enhanced-highlight': enhancedHighlightIdxs.includes(9) }]">
            <span class="indent indent-4"></span><span class="fn">print</span>(<span class="str">"{{ codeInfo.noSolutionText || '此题无解' }}"</span>)
          </div>
        </template>
      </div>
    </div>

    <div class="panel output-card">
      <div class="panel-title">输出</div>
      <div class="output-body">
        <pre><code>{{ outputText }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useBruteDemoStore } from '@/stores/useBruteDemoStore'

const store = useBruteDemoStore()

// heads/legs 动态输入
const heads = computed(() => store.totalHeads)
const legs = computed(() => store.totalLegs)

// 编辑模式
const isEditing = ref(false)
const editingCode = ref('')
const currentCode = ref('')  // 保存当前代码

// 代码信息
interface CodeInfo {
  hasNoSolution: boolean
  varName: string
  isBool: boolean
  defaultValue: string
  successValue: string
  checkExpression: string
  noSolutionText?: string  // 无解时输出的文字
}

const codeInfo = ref<CodeInfo>({
  hasNoSolution: false,
  varName: 'jie',
  isBool: false,
  defaultValue: '0',
  successValue: '1',
  checkExpression: 'jie == 0',
  noSolutionText: '此题无解'
})

// 基础代码（无"无解"判断）
const baseCode = `tu = 0
while tu < 6:
    ji = 5 - tu
    if ji * 2 + tu * 4 == 9:
        print(ji, "只鸡，", tu, "只兔。")
    tu = tu + 1`

function startEdit() {
  // 如果有保存的代码，使用保存的代码；否则根据当前状态生成
  if (currentCode.value) {
    editingCode.value = currentCode.value
  } else if (codeInfo.value.hasNoSolution) {
    const varName = codeInfo.value.varName
    const defaultVal = codeInfo.value.isBool ? 'False' : '0'
    const successVal = codeInfo.value.isBool ? 'True' : '1'
    const checkExpr = codeInfo.value.isBool ? `not ${varName}` : `${varName} == 0`
    
    editingCode.value = `tu = 0
${varName} = ${defaultVal}
while tu < 6:
    ji = 5 - tu
    if ji * 2 + tu * 4 == 9:
        print(ji, "只鸡，", tu, "只兔。")
        ${varName} = ${successVal}
    tu = tu + 1
if ${checkExpr}:
    print("${codeInfo.value.noSolutionText || '此题无解'}")`
  } else {
    editingCode.value = baseCode
  }
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  editingCode.value = ''
}

function saveEdit() {
  const code = editingCode.value.trim()
  
  // 解析代码，提取变量信息
  const parsed = parseCode(code)
  if (parsed) {
    codeInfo.value = parsed
    store.setCodeInfo(parsed)
    currentCode.value = code  // 保存当前代码
    
    // 保存代码到 localStorage
    localStorage.setItem('va_teacher_demo_code', code)
    
    // 提取并更新头数和腿数
    const headsLegs = extractHeadsAndLegs(code)
    if (headsLegs) {
      store.setInput(headsLegs.heads, headsLegs.legs)
    }
  }
  
  isEditing.value = false
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

function parseCode(code: string): CodeInfo | null {
  // 预处理：移除注释（以 # 开头的内容）
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
  
  // 查找变量定义行（允许前导空格）
  const varDefPattern = new RegExp(`^\\s*${varName}\\s*=\\s*(False|True|0|1)\\s*$`, 'm')
  const varDefMatch = cleanCode.match(varDefPattern)
  
  if (!varDefMatch) return null
  
  const initValue = varDefMatch[1]
  const actualIsBool = initValue === 'False' || initValue === 'True'
  
  // 确保类型匹配
  if (actualIsBool !== isBool) return null
  
  // 提取成功时的赋值（允许前导空格）
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

function onHeadsInput(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  const safe = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0
  store.setInput(safe, store.totalLegs ?? 0)
}
function onLegsInput(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  const safe = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0
  store.setInput(store.totalHeads ?? 0, safe)
}

// 手动一次性运行输出优先展示
const manualText = ref('')
const useManual = ref(false)
const outputText = computed(() => {
  if (useManual.value) return manualText.value
  
  if (!codeInfo.value.hasNoSolution) {
    // 基础版本：只输出有解的情况
    return (store.rows || [])
      .filter((r: any) => r && r.ok === true)
      .map((r: any) => (r.output || '').trim())
      .filter(Boolean)
      .join('\n')
  } else {
    // 增强版本：包含所有输出
    return (store.rows || [])
      .map(r => (r.output || '').trim())
      .filter(Boolean)
      .join('\n')
  }
})

function runNow() {
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
  const step = store.currentStep
  const last = store.rows[store.rows.length - 1]
  
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

// 切换到增强版时需要高亮的代码行
const enhancedHighlightIdxs = computed<number[]>(() => {
  if (store.justSwitchedToEnhanced && codeInfo.value.hasNoSolution) {
    // 对应流程图中高亮的4个块
    return [
      1,  // jie = 0
      6,  // jie = 1
      8,  // if jie == 0:
      9   // print("此题无解")
    ]
  }
  return []
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

// 监听 codeInfo 变化，更新 store
watch(codeInfo, (newInfo) => {
  store.setCodeInfo(newInfo)
}, { deep: true })

// 初始化时从 localStorage 加载保存的代码和从 store 加载 codeInfo
onMounted(() => {
  // 从 localStorage 加载保存的代码
  const savedCode = localStorage.getItem('va_teacher_demo_code')
  if (savedCode) {
    currentCode.value = savedCode
  } else {
    currentCode.value = baseCode
  }
  
  // 从 store 加载保存的 codeInfo
  codeInfo.value = { ...store.codeInfo }
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
.title-buttons { display: flex; gap: .5rem; }
.run-btn, .edit-btn, .save-btn, .cancel-btn,
:deep(.run-btn), :deep(.edit-btn), :deep(.save-btn), :deep(.cancel-btn) { 
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
.run-btn:hover, .edit-btn:hover, .save-btn:hover,
:deep(.run-btn:hover), :deep(.edit-btn:hover), :deep(.save-btn:hover) { 
  filter: brightness(0.95); 
  background: var(--color-primary); 
  color: #fff; 
  border-color: var(--color-primary);
}
.cancel-btn, :deep(.cancel-btn) { 
  background: #6b7280; 
  border-color: #6b7280; 
}
.cancel-btn:hover, :deep(.cancel-btn:hover) { 
  filter: brightness(0.9); 
  background: #6b7280; 
  color: #fff; 
  border-color: #6b7280;
}
.code1-pre { margin: 0; padding: .4rem .6rem; color: #111; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.75rem; line-height: 1.2; flex: 1; overflow: auto; }
.code1-line { position: relative; padding: .08rem .4rem; border-radius: .3rem; color: #111; white-space: nowrap; z-index: 1; }
.code1-line.active::before { content: ''; position: absolute; inset: 0; border-radius: .3rem; background: rgba(16,185,129,.18); box-shadow: inset 0 0 0 1px rgba(16,185,129,.25); pointer-events: none; z-index: -1; }
.code1-line.enhanced-highlight { background: rgba(254, 243, 199, 0.4); box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3); }
.indent { display: inline-block; }
.indent-4 { width: 4ch; }
.indent-8 { width: 8ch; }
.kw { color: #d97706; font-weight: 700; }
.fn { color: #7c3aed; font-weight: 700; }
.str { color: #16a34a; }
.num { color: #0ea5e9; }
.expr { color: #0ea5e9; font-weight: 600; }

.inline-num { width: 3.5rem; appearance: textfield; -moz-appearance: textfield; -webkit-appearance: none; border: 1px solid rgba(0,0,0,.25); background: #fff; color: #111; border-radius: .35rem; padding: .08rem .3rem; margin: 0 .15rem; font-family: inherit; font-size: 0.75rem; vertical-align: baseline; display: inline-block; }
.inline-num:focus { outline: none; border-color: rgba(59,130,246,.8); box-shadow: 0 0 0 2px rgba(59,130,246,.25); }

/* 代码编辑器样式 */
.code-editor {
  width: 100%;
  flex: 1;
  padding: .4rem .6rem;
  margin: 0;
  border: none;
  resize: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.75rem;
  line-height: 1.2;
  color: #111;
  background: #fff;
  outline: none;
}

/* 布尔值样式 */
.bool { color: #dc2626; font-weight: 600; }

/* 输出区域样式 */
.output-body { padding: .4rem .6rem; display: flex; flex-direction: column; }
.output-body pre { background: #0b1020; color: #e7f0ff; padding: .5rem; border-radius: .5rem; overflow: auto; min-height: 7rem; max-height: 13rem; line-height: 1.2; font-size: 0.75rem; }
</style>

