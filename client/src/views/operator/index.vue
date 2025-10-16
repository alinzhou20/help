<template>
  <section class="operator-activity3">
    <div class="main-container no-evaluation">
      <!-- 左侧列 -->
      <div class="left-column">
        <!-- 步骤1：小组讨论 -->
        <div class="panel step1-panel">
          <div class="panel-title">步骤1：小组讨论，写下优化算法的方向</div>
          <el-input
            v-model="optimizationDirection"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="请输入优化算法的方向..."
            class="step-input"
          ></el-input>
        </div>

        <!-- 步骤2：复制代码 -->
        <div class="panel step2-panel">
          <div class="panel-title">
            <span>步骤2：复制待优化程序，借助智能体完成算法的优化</span>
            <el-button
              @click="copyCode"
              :icon="CopyDocument"
              class="copy-btn"
              size="small"
            >
              {{ copyText }}
            </el-button>
          </div>
          <div class="code-display">
            <pre v-if="displayCode" class="code-pre" v-html="formatPythonCode(displayCode)"></pre>
            <el-empty v-else description="等待教师下发代码..." :image-size="60"></el-empty>
          </div>
        </div>
      </div>

      <!-- 右侧列 -->
      <div class="right-column">
        <!-- Python编辑器 -->
        <div class="panel editor-panel">
          <div class="panel-title">
            <span>步骤3：将优化后的程序复制到下方Python编辑器中运行</span>
            <el-button
              @click="runCode"
              :loading="running"
              type="primary"
              size="small"
              class="run-btn"
            >
              运行
            </el-button>
          </div>
          <div class="cm-host" ref="cmRoot"></div>
        </div>

        <!-- 输出区域 -->
        <div class="panel output-panel">
          <div class="panel-title">运行结果</div>
          <pre class="output-pre">{{ runOutput || '' }}</pre>
      </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'OperatorActivity3' })
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '@/stores/useSessionStore'
import { subscribe, type RealtimeEvent, emit } from '@/utils/realtime'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import { Icon } from '@iconify/vue'

const session = useSessionStore()

// 活动三状态键（操作员和记录员共享）
const SHARED_STATE_KEY = 'shared_activity3_state'
const TEACHER_CODE_KEY = 'shared_teacher_code_a3'

// UI状态
const copyText = ref('复制代码')

// 活动三数据（与记录员共享）
const optimizationDirection = ref('')
const displayCode = ref('')
const pythonCode = ref('')
const runOutput = ref('')
const running = ref(false)
const hasError = ref(false)
const cmRoot = ref<HTMLElement | null>(null)
const pyodide = ref<any>(null)
let cm: any = null
let rtErrLine: number | null = null

// 防止初始化时立即同步
let isInitializing = true

// 计算评价星星（操作员不显示，但需要同步给记录员）
const eval1 = computed(() => !!optimizationDirection.value.trim())
const eval2 = computed(() => !!pythonCode.value.trim() && !hasError.value)
const stars = computed(() => {
  let count = 0
  if (eval1.value) count++
  if (eval2.value) count++
  return count
})

// 格式化Python代码，添加语法高亮
function formatPythonCode(code: string): string {
  if (!code) return ''
  
  // 转义HTML
  let formatted = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // 创建临时占位符映射
  const placeholders = new Map()
  let placeholderIndex = 0
  
  // 1. 保护字符串（绿色）
  formatted = formatted.replace(/(["'])((?:\\.|(?!\1).)*?)\1/g, (match, quote, content) => {
    const key = `__PLACEHOLDER_${placeholderIndex++}__`
    placeholders.set(key, `<span class="py-string">${quote}${content}${quote}</span>`)
    return key
  })
  
  // 2. 保护注释（灰色斜体）
  formatted = formatted.replace(/(#.*$)/gm, (match) => {
    const key = `__PLACEHOLDER_${placeholderIndex++}__`
    placeholders.set(key, `<span class="py-comment">${match}</span>`)
    return key
  })
  
  // 3. 高亮关键字（橙色加粗）
  const keywords = ['def', 'if', 'else', 'elif', 'while', 'for', 'return', 'break', 'continue', 
                   'import', 'from', 'as', 'in', 'and', 'or', 'not', 'print', 'True', 'False', 'None']
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g')
    formatted = formatted.replace(regex, (match) => {
      const key = `__PLACEHOLDER_${placeholderIndex++}__`
      placeholders.set(key, `<span class="py-keyword">${match}</span>`)
      return key
    })
  })
  
  // 4. 高亮数字（蓝色）
  formatted = formatted.replace(/\b(\d+)\b/g, (match) => {
    const key = `__PLACEHOLDER_${placeholderIndex++}__`
    placeholders.set(key, `<span class="py-number">${match}</span>`)
    return key
  })
  
  // 5. 恢复所有占位符
  placeholders.forEach((value, key) => {
    formatted = formatted.replace(key, value)
  })
  
  return formatted
}

// 复制代码功能
async function copyCode() {
  if (!displayCode.value) return
  
  try {
    // 优先使用新的 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(displayCode.value)
    } else {
      // 降级方案：使用传统的 execCommand
      const textArea = document.createElement('textarea')
      textArea.value = displayCode.value
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    copyText.value = '已复制'
    ElMessage.success('代码已复制到剪贴板')
    setTimeout(() => {
      copyText.value = '复制代码'
    }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
    ElMessage.error('复制失败，请手动复制')
  }
}

// 加载脚本
function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existed = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null
    if (existed && (window as any).loadPyodide) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('failed to load pyodide'))
    document.head.appendChild(s)
  })
}

// 加载样式
function loadStyle(href: string) {
  return new Promise<void>((resolve, reject) => {
    const existed = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(l => (l as HTMLLinkElement).href === href)
    if (existed) { resolve(); return }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => resolve()
    link.onerror = () => reject(new Error('failed to load style: ' + href))
    document.head.appendChild(link)
  })
}

// 初始化CodeMirror
async function initCodeMirror() {
  // Load CodeMirror 5 core, python mode, addons, and lint CSS
  const base = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16'
  await Promise.all([
    loadStyle(`${base}/codemirror.min.css`),
    loadStyle(`${base}/addon/lint/lint.min.css`),
  ])
  // Load scripts sequentially to satisfy dependencies
  await loadScript(`${base}/codemirror.min.js`)
  await loadScript(`${base}/mode/python/python.min.js`)
  await loadScript(`${base}/addon/edit/matchbrackets.min.js`)
  await loadScript(`${base}/addon/lint/lint.min.js`)

  // Register Python lint helper using Pyodide ast.parse
  const CodeMirror = (window as any).CodeMirror
  const pyLint = function(this: any, text: string, updateLinting: any, options: any, editor: any) {
    (async () => {
      const anns: any[] = []
      // 1) 本地快速检查：常见中文全角标点（不检查字符串和注释内的）
      const lines = text.split('\n')
      // 只检查真正的中文全角标点
      const fullWidthRe = /[，。：；！？（）【】「」『』、""''＝＋－×÷]/g
      
      for (let li = 0; li < lines.length; li++) {
        const lineText = lines[li]
        let m: RegExpExecArray | null
        
        while ((m = fullWidthRe.exec(lineText))) {
          const ch = m.index
          // 使用CodeMirror的token检测来判断是否在字符串或注释中
          try {
            const token = editor.getTokenAt(CodeMirror.Pos(li, ch + 1))
            // 如果在字符串或注释中，跳过
            if (token && token.type && 
                (token.type.includes('string') || 
                 token.type.includes('comment'))) {
              continue
            }
          } catch (e) {
            // 如果获取token失败，保守起见，跳过
            continue
          }
          
          anns.push({ 
            from: CodeMirror.Pos(li, ch), 
            to: CodeMirror.Pos(li, ch + 1), 
            message: '检测到中文标点，请使用英文符号', 
            severity: 'error' 
          })
        }
      }

      // 2) Pyodide 语法检查
      if (pyodide.value) {
        try {
          const res = await pyodide.value.runPythonAsync(`
import ast, json
src = ${JSON.stringify(text)}
try:
    ast.parse(src)
    json.dumps(None)
except SyntaxError as e:
    json.dumps({'msg': e.msg, 'lineno': int(e.lineno or 1), 'offset': int(e.offset or 1)})
`)
          const obj = res && res !== 'null' ? JSON.parse(res) : null
          if (obj) {
            const line = Math.max(0, (obj.lineno || 1) - 1)
            const ch = Math.max(0, (obj.offset || 1) - 1)
            anns.push({ from: CodeMirror.Pos(line, ch), to: CodeMirror.Pos(line, ch + 1), message: obj.msg, severity: 'error' })
          }
        } catch {}
      }
      updateLinting(anns)
    })()
  }
  CodeMirror.registerHelper('lint', 'python', pyLint)

  // 创建编辑器
  if (cmRoot.value && !cm) {
    cm = CodeMirror(cmRoot.value, {
      value: pythonCode.value || '',
      mode: 'python',
      theme: 'default',
      lineNumbers: true,
      indentUnit: 4,
      lineWrapping: true,
      matchBrackets: true,
      lint: { lintOnChange: true, delay: 500 },
    })
    
    cm.on('change', () => {
      pythonCode.value = cm.getValue()
      hasError.value = false
      // 保存状态（操作员不同步Python代码给记录员）
      saveSharedState()
    })
  }
}

// 初始化Pyodide
async function initPyodide() {
  await loadScript('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js')
  const { loadPyodide } = (window as any)
  pyodide.value = await loadPyodide()
}

// 运行Python代码
async function runCode() {
  if (!pyodide.value || !pythonCode.value.trim()) {
    ElMessage.warning('请先输入代码')
    return
  }

  running.value = true
  hasError.value = false
  runOutput.value = ''
  
  // 清除之前的错误高亮
  if (cm && rtErrLine != null) {
    cm.removeLineClass(rtErrLine, 'background', 'cm-rt-err')
    rtErrLine = null
  }

  try {
    // 重定向输出
    await pyodide.value.runPythonAsync(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()

# 提供模拟的input函数
_input_counter = 0
_input_values = []

def input(prompt=""):
    global _input_counter, _input_values
    print(prompt, end="")
    if _input_counter < len(_input_values):
        val = _input_values[_input_counter]
        _input_counter += 1
        print(val)
        return str(val)
    else:
        print("[需要输入，但未提供]")
        return ""
`)

    // 运行用户代码
    await pyodide.value.runPythonAsync(pythonCode.value)
    
    // 获取输出
    const stdout = await pyodide.value.runPythonAsync('sys.stdout.getvalue()')
    const stderr = await pyodide.value.runPythonAsync('sys.stderr.getvalue()')
    
    runOutput.value = stdout + (stderr ? '\n错误：\n' + stderr : '')
    
    if (stderr) {
      hasError.value = true
      // 尝试从错误信息中提取行号
      const lineMatch = stderr.match(/line (\d+)/i)
      if (lineMatch && cm) {
        const lineNum = parseInt(lineMatch[1]) - 1
        if (lineNum >= 0) {
          rtErrLine = lineNum
          cm.addLineClass(lineNum, 'background', 'cm-rt-err')
          cm.scrollIntoView({ line: lineNum, ch: 0 }, 100)
        }
      }
    }
  } catch (error: any) {
    hasError.value = true
    runOutput.value = '运行错误：\n' + String(error)
    
    // 尝试从错误信息中提取行号
    const lineMatch = String(error).match(/line (\d+)/i)
    if (lineMatch && cm) {
      const lineNum = parseInt(lineMatch[1]) - 1
      if (lineNum >= 0) {
        rtErrLine = lineNum
        cm.addLineClass(lineNum, 'background', 'cm-rt-err')
        cm.scrollIntoView({ line: lineNum, ch: 0 }, 100)
      }
    }
  } finally {
    running.value = false
    saveSharedState()
    syncToRecorder() // 同步运行结果给记录员
  }
}

// 保存共享状态到localStorage
function saveSharedState() {
  const state = {
    optimizationDirection: optimizationDirection.value,
    pythonCode: pythonCode.value,
    runOutput: runOutput.value,
    hasError: hasError.value,
    displayCode: displayCode.value
  }
  localStorage.setItem(SHARED_STATE_KEY, JSON.stringify(state))
}

// 加载共享状态
function loadSharedState() {
  const saved = localStorage.getItem(SHARED_STATE_KEY)
  if (saved) {
    try {
      const state = JSON.parse(saved)
      // 在初始化期间暂时禁用watch
      const wasInitializing = isInitializing
      isInitializing = true
      
      // 使用 ?? 运算符，确保空字符串也能正确加载
      optimizationDirection.value = state.optimizationDirection ?? ''
      pythonCode.value = state.pythonCode ?? ''
      runOutput.value = state.runOutput ?? ''
      hasError.value = state.hasError ?? false
      displayCode.value = state.displayCode ?? ''
      
      // 更新编辑器
      if (cm) {
        cm.setValue(pythonCode.value)
      }
      
      // 恢复初始化状态
      if (!wasInitializing) {
        setTimeout(() => {
          isInitializing = false
        }, 100)
      }
    } catch {}
  }
}

// 清理共享状态（只有所有角色都退出时才清理）
function clearSharedState() {
  // 检查是否有其他角色在线
  const hasOtherRole = checkOtherRoleOnline()
  if (!hasOtherRole) {
    localStorage.removeItem(SHARED_STATE_KEY)
    localStorage.removeItem(TEACHER_CODE_KEY)
  }
}

// 检查是否有其他角色在线
function checkOtherRoleOnline(): boolean {
  // 通过广播机制检查
  // 这里简化处理，实际应该通过实时通信确认
  return false
}

// 操作员不再同步数据（已禁用）
function syncToRecorder() {
  saveSharedState()
  
  // 操作员不发送任何消息
  return
}

// 监听步骤1变化，同步给记录员
watch(optimizationDirection, () => {
  saveSharedState()
  syncToRecorder()
})

// 监听运行结果变化，同步给记录员
watch([runOutput, hasError], () => {
  saveSharedState()
  syncToRecorder()
})

// 监听Python代码变化，同步给记录员
watch(pythonCode, () => {
  saveSharedState()
  syncToRecorder()
})

// 从教师下发的数据中构建代码
function getCurrentCodeFromData(data: any): string {
  const { codeInfo, totalHeads, totalLegs } = data
  if (!codeInfo) return ''

  let code = ''
  if (!codeInfo.hasNoSolution) {
    // 基础版本
    code = `tu = 0
while tu < ${totalLegs / 2}:
    ji = ${totalHeads} - tu
    if ji * 2 + tu * 4 == ${totalLegs}:
        print(ji, "只鸡，", tu, "只兔。")
    tu = tu + 1`
  } else {
    // 增强版本（带变量）
    const varName = codeInfo.varName || 'jie'
    const defaultVal = codeInfo.isBool ? 'False' : codeInfo.defaultValue
    const successVal = codeInfo.isBool ? 'True' : codeInfo.successValue
    
    code = `tu = 0
${varName} = ${defaultVal}
while tu < ${totalLegs / 2}:
    ji = ${totalHeads} - tu
    if ji * 2 + tu * 4 == ${totalLegs}:
        print(ji, "只鸡，", tu, "只兔。")
        ${varName} = ${successVal}
    tu = tu + 1
if ${varName} == ${defaultVal}:
    print("${codeInfo.noSolutionText || '此题无解'}")`
  }

  return code
}

// 监听各种事件
let unsubscribe: (() => void) | null = null

onMounted(async () => {
  // 加载共享状态
  loadSharedState()

  // 尝试加载保存的教师代码
  const savedCode = localStorage.getItem(TEACHER_CODE_KEY)
  if (savedCode) {
    displayCode.value = savedCode
  }

  // 初始化编辑器
  try {
    await initPyodide()
    await initCodeMirror()
  } catch (e) {
    console.error('Failed to initialize editor:', e)
  }

  // 监听同步事件
  unsubscribe = subscribe((evt: RealtimeEvent) => {
    // 监听教师下发的代码（活动二的代码）
    if (evt.type === 'teacher:broadcast' && evt.activity === 'a2') {
      const code = evt.data.code || getCurrentCodeFromData(evt.data)
      if (code) {
        displayCode.value = code
        localStorage.setItem(TEACHER_CODE_KEY, code)
        saveSharedState()
      }
    }
    
    // 监听来自记录员的同步事件
    if (evt.type === 'activity3:sync' && evt.groupId === session.persisted.groupId) {
      const data = evt.data
      if (data) {
        // 在接收同步期间暂时禁用watch
        const wasInitializing = isInitializing
        isInitializing = true
        
        // 更新本地状态（注意：使用 !== undefined 来判断，确保空字符串也能同步）
        if (data.optimizationDirection !== undefined) optimizationDirection.value = data.optimizationDirection
        if (data.pythonCode !== undefined) pythonCode.value = data.pythonCode
        if (data.runOutput !== undefined) runOutput.value = data.runOutput
        if (data.hasError !== undefined) hasError.value = data.hasError
        
        // 更新编辑器
        if (cm && cm.getValue() !== pythonCode.value) {
          cm.setValue(pythonCode.value)
        }
        
        // 保存状态
        saveSharedState()
        
        // 恢复初始化状态
        if (!wasInitializing) {
          setTimeout(() => {
            isInitializing = false
          }, 100)
        }
      }
    }
  })
  
  // 操作员不主动请求广播，只接收教师主动发送的广播
  // 代码已从本地存储加载或等待教师主动广播
  
  // 初始化完成后允许同步
  setTimeout(() => {
    isInitializing = false
  }, 500)
})

// 监听退出事件
watch(() => session.isLoggedIn(), (newLoggedIn, oldLoggedIn) => {
  if (oldLoggedIn && !newLoggedIn) {
    clearSharedState()
  }
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<style scoped>
.operator-activity3 {
  min-height: 100vh;
}

/* 主容器 */
.main-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  height: calc(100vh - 80px);
  min-height: 500px;
  padding: 1rem;
}

.main-container.no-evaluation {
  height: calc(100vh - 80px);
}

/* 左侧列 */
.left-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 右侧列 */
.right-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 统一面板样式 */
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: .75rem;
  overflow: hidden;
  box-sizing: border-box;
}

.panel-title {
  padding: .35rem .6rem;
  font-weight: 700;
  font-size: 0.8125rem;
  color: #111827;
  background: #f3f4f6;
  border-bottom: 1px solid rgba(0,0,0,.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
}

/* 步骤1面板 */
.step1-panel {
  height: 150px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

/* 步骤2面板 */
.step2-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: calc(100% - 150px - 1rem);  /* 左侧剩余高度 */
}

.step-input {
  flex: 1;
  padding: .75rem;
  padding-top: 0;
  min-height: 0;
  display: flex;
  overflow: hidden;
  box-sizing: border-box;
}

:deep(.el-textarea) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
}

:deep(.el-textarea__inner) {
  font-size: 0.875rem;
  line-height: 1.5;
  box-sizing: border-box;
  width: 100% !important;
  resize: none;
  max-height: 100%;
  overflow-y: auto !important;
  padding: .5rem;
}

/* 代码显示区域 */
.code-display {
  flex: 1;
  overflow: auto;
  background: #1e1e1e;  /* 深色背景，类似代码编辑器 */
  padding: .6rem .9rem;
  min-height: 0;
}

.code-pre {
  margin: 0;
  padding: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.75rem;
  line-height: 1.2;
  color: #e7f0ff;  /* 浅色文字以匹配深色背景 */
  white-space: pre-wrap;
}

/* Python语法高亮样式 */
.code-pre :deep(.py-keyword) {
  color: #ff9940;  /* 亮橙色，深色背景下更明显 */
  font-weight: 700;
}

.code-pre :deep(.py-string) {
  color: #50fa7b;  /* 亮绿色 */
}

.code-pre :deep(.py-number) {
  color: #66d9ef;  /* 亮蓝色 */
}

.code-pre :deep(.py-comment) {
  color: #8892a0;  /* 灰色 */
  font-style: italic;
}

/* 复制按钮 */
.copy-btn {
  height: auto;
  padding: .25rem .7rem;
  font-size: 0.8125rem;
}

/* 编辑器面板 */
.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: calc(100% - 120px - 1rem);  /* 右侧剩余高度 */
}

/* 输出面板 */
.output-panel {
  height: 120px;  /* 固定较小高度 */
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex-shrink: 0;
}

/* CodeMirror编辑器 */
.cm-host { 
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: .75rem;
}

:deep(.CodeMirror) { 
  height: 100%; 
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; 
  font-size: 0.75rem; 
  line-height: 1.4; 
  border: 1px solid var(--color-border);
  border-radius: .5rem;
  background: var(--color-surface); 
  color: var(--color-text); 
}

/* Token colors approximating IDLE */
:deep(.CodeMirror .cm-keyword) { color: #d97706; font-weight: 700; }
:deep(.CodeMirror .cm-string) { color: #16a34a; }
:deep(.CodeMirror .cm-number) { color: #0ea5e9; }
:deep(.CodeMirror .cm-def) { color: #7c3aed; }
:deep(.CodeMirror .cm-comment) { color: #6b7280; font-style: italic; }
/* 运行时错误行高亮 */
:deep(.cm-rt-err) { background: rgba(239,68,68,.12); box-shadow: inset 3px 0 0 rgba(239,68,68,.7); }

/* 运行按钮 */
.run-btn {
  height: auto;
  padding: .25rem .7rem;
  font-size: 0.8125rem;
}

/* 输出区域 */
.output-pre {
  flex: 1;
  margin: 0;
  padding: .5rem;
  background: #0b1020;
  color: #e7f0ff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.75rem;
  line-height: 1.2;
  min-height: 0;
  overflow: auto;
  white-space: pre-wrap;
}

/* Element UI Empty 组件样式覆盖 */
:deep(.el-empty) {
  padding: 1rem 0;
}

/* 响应式布局 */
@media (max-width: 1024px) {
  .main-container {
    grid-template-columns: 1fr;
    height: auto;
  }
  
  .left-column,
  .right-column {
    min-height: 500px;
  }
}
</style>

