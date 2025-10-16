<template>
  <section class="activity4">
    <!-- 顶部评价（完成项高亮并显示星标） -->
    <div class="evaluation-top">
      <div class="eval-header"><span class="label">评价标准</span></div>
      <ol class="criteria-list">
        <li :class="{ done: eval1 }">
          <span>1.能通过修改数据运行程序，理解使用变量优化算法的方法与优势</span>
          <Icon v-if="eval1" icon="material-symbols:star" class="star-icon" />
        </li>
        <li :class="{ done: eval2 }">
          <span>2.能够讨论算法的完善方向</span>
          <Icon v-if="eval2" icon="material-symbols:star" class="star-icon" />
        </li>
      </ol>
    </div>

    <!-- 区域一：变量修改并记录结果（保留表格） -->
    <div class="block">
      <div class="block-title">1.通过变量修改程序中的总头数与总脚数，调试并运行程序，并记录运行结果。</div>
      <div class="panel records">
        <table class="records-table" aria-label="程序运行结果记录">
          <colgroup>
            <col class="col-heads" />
            <col class="col-legs" />
            <col class="col-result" />
          </colgroup>
          <thead>
            <tr>
              <th>总头数</th>
              <th>总脚数</th>
              <th>程序运行结果记录</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in rows" :key="i">
              <td>{{ row.heads }}</td>
              <td>{{ row.legs }}</td>
              <td class="choice">
                <label><input type="radio" :name="'solve'+i" value="yes" v-model="row.pick"> 有解</label>
                <template v-if="row.pick === 'yes'">
                  <input class="mini" type="number" v-model.number="row.ji"> 只鸡，
                  <input class="mini" type="number" v-model.number="row.tu"> 只兔
                </template>
                <label style="margin-left:.75rem;"><input type="radio" :name="'solve'+i" value="no" v-model="row.pick"> 此题无解</label>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 区域二：讨论优势（保留单选） -->
    <div class="block">
      <div class="block-title">2.讨论该算法的优势。</div>
      <div class="qa">
        <div class="qa-title">该算法的优势是？</div>
        <label><input type="radio" value="specific" v-model="advantage"> 能解决特定问题</label>
        <label><input type="radio" value="generic" v-model="advantage"> 能解决一类问题</label>
      </div>
    </div>

    <!-- 区域三：讨论完善方向（新增勾选） -->
    <div class="block">
      <div class="block-title">3.讨论算法还可以如何完善。</div>
      <label class="check"><input type="checkbox" v-model="improveDiscussed"> 我们小组讨论得到了算法完善的方向</label>
    </div>

  </section>

</template>
<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useSessionStore } from '@/stores/useSessionStore'
import { emit } from '@/utils/realtime'
import { Icon } from '@iconify/vue'

// 默认编辑器代码
const editorCode = ref<string>(`tu = 0\njie = 0\ntou =\njiao =\nwhile tu < tou+1 :\n    ji = tou - tu\n    if ji * 2 + tu * 4 == jiao:\n        jie = 1\n        print(ji,"只鸡，",tu,"只兔。")\n    tu = tu + 1\nif jie == 0:\n    print("此题无解")`)
const output = ref<string>('')
const loading = ref<boolean>(true)
const running = ref<boolean>(false)
const pyodide = ref<any>(null)
const cmRoot = ref<HTMLElement | null>(null)
let cm: any = null
let rtErrLine: number | null = null

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
      // 1) 本地快速检查：常见中文全角标点（非字符串/注释的精确跳过较复杂，这里直接提示以提升可见性）
      const lines = text.split('\n')
      const fullWidthRe = /[，。：；！（）【】「」『』、“”‘’＝＋－×÷、。]/g
      for (let li = 0; li < lines.length; li++) {
        const lineText = lines[li]
        let m: RegExpExecArray | null
        while ((m = fullWidthRe.exec(lineText))) {
          const ch = m.index
          // 忽略字符串字面量中的中文标点（含单/双/三引号字符串）
          try {
            const tp = editor.getTokenTypeAt(CodeMirror.Pos(li, ch)) as string | null
            if (tp && tp.indexOf('string') !== -1) continue
          } catch {}
          anns.push({ from: CodeMirror.Pos(li, ch), to: CodeMirror.Pos(li, ch + 1), message: '检测到中文标点，请使用英文符号', severity: 'error' })
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

      updateLinting(editor, anns)
    })()
  }
  ;(pyLint as any).async = true
  CodeMirror.registerHelper('lint', 'python', pyLint)

  // Create editor
  cm = CodeMirror(cmRoot.value, {
    value: editorCode.value,
    mode: 'text/x-python',
    lineNumbers: true,
    matchBrackets: true,
    gutters: ['CodeMirror-lint-markers'],
    lint: true,
  })
  cm.on('change', () => { editorCode.value = cm.getValue() })
}

async function initPyodide() {
  await loadScript('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js')
  // @ts-ignore
  const load = (window as any).loadPyodide
  // @ts-ignore
  pyodide.value = await load({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' })
}

onMounted(() => { loading.value = false })

async function runCode() {
  if (!pyodide.value) return
  running.value = true
  output.value = ''
  try {
    const code = cm ? cm.getValue() : editorCode.value
    // 清除上一次运行时的行高亮
    if (cm && rtErrLine != null) {
      try { cm.removeLineClass(rtErrLine - 1, 'wrap', 'cm-rt-err') } catch {}
      rtErrLine = null
    }
    const script = `
import sys, io, json, traceback
_stdout = io.StringIO()
_stderr = io.StringIO()
_sys_stdout, _sys_stderr = sys.stdout, sys.stderr
sys.stdout, sys.stderr = _stdout, _stderr
# 覆盖内置 input()，通过浏览器 prompt 获取输入
try:
    import builtins
    from js import window
    def __py_input(prompt_text=""):
        s = window.prompt(prompt_text if prompt_text else "请输入：")
        if s is None:
            raise Exception("输入已取消")
        return str(s)
    builtins.input = __py_input
except Exception:
    pass
err = None
tb_txt = None
try:
    exec(compile(${JSON.stringify(code)}, '<exec>', 'exec'))
except Exception as e:
    tb = traceback.extract_tb(sys.exc_info()[2])
    line = None
    if tb:
        line = int(tb[-1].lineno or 1)
    err = { 'message': str(e), 'line': line }
    tb_txt = traceback.format_exc()
finally:
    sys.stdout, sys.stderr = _sys_stdout, _sys_stderr
out = _stdout.getvalue()
json.dumps({ 'out': out, 'error': err, 'tb': tb_txt })
`
    // @ts-ignore
    const result = await pyodide.value.runPythonAsync(script)
    let data: any = null
    try { data = result ? JSON.parse(String(result)) : null } catch {}
    if (data && data.error) {
      const line = Number(data.error.line || 0)
      if (cm && line > 0) {
        try {
          cm.addLineClass(line - 1, 'wrap', 'cm-rt-err')
          rtErrLine = line
        } catch {}
      }
      // 方案C：仅显示简要错误信息（不展示 Traceback）
      const msg = String(data.error.message || '')
      output.value = msg
    } else if (data) {
      output.value = String(data.out || '')
    } else {
      output.value = ''
    }
  } catch (e: any) {
    output.value = String(e?.message || e)
  } finally {
    running.value = false
  }
}

// 记录表数据与正确答案
type Row = { heads: number; legs: number; pick: 'yes' | 'no' | ''; ji?: number | null; tu?: number | null }
const rows = ref<Row[]>([
  { heads: 37, legs: 100, pick: '', ji: null, tu: null },
  { heads: 38, legs: 154, pick: '', ji: null, tu: null },
  { heads: 40, legs: 116, pick: '', ji: null, tu: null },
  { heads: 42, legs: 170, pick: '', ji: null, tu: null },
  { heads: 47, legs: 144, pick: '', ji: null, tu: null },
])
const expected: Record<string, { ji?: number; tu?: number; none?: boolean }> = {
  '37-100': { ji: 24, tu: 13 },
  '38-154': { none: true },
  '40-116': { ji: 22, tu: 18 },
  '42-170': { none: true },
  '47-144': { ji: 22, tu: 25 },
}
const advantage = ref<'specific' | 'generic' | ''>('')
const improveDiscussed = ref<boolean>(false)
const recordsCorrect = computed(() => {
  return rows.value.every(r => {
    const key = `${r.heads}-${r.legs}`
    const exp = expected[key]
    if (!exp) return false
    if (exp.none) return r.pick === 'no'
    return r.pick === 'yes' && r.ji === exp.ji && r.tu === exp.tu
  })
})
// 评价标准：正确记录 + 选择“能解决一类问题”
const eval1 = computed(() => recordsCorrect.value && advantage.value === 'generic')
// 评价2：讨论完善方向（勾选）
const eval2 = computed(() => !!improveDiscussed.value)
const stars = computed(() => (eval1.value ? 1 : 0) + (eval2.value ? 1 : 0))

// —— 记录测试结果持久化 ——
const session = useSessionStore()
onMounted(() => {
  const saved = session.getRecords('a4_state', {
    rows: rows.value,
    advantage: advantage.value,
    improveDiscussed: improveDiscussed.value,
  }) as any
  if (saved) {
    if (Array.isArray(saved.rows)) rows.value = saved.rows
    if (typeof saved.advantage === 'string') advantage.value = saved.advantage
    if (typeof saved.improveDiscussed === 'boolean') improveDiscussed.value = saved.improveDiscussed
  }
})
watch([rows, advantage, improveDiscussed], () => {
  session.setRecords('a4_state', {
    rows: rows.value,
    advantage: advantage.value,
    improveDiscussed: improveDiscussed.value,
  })
  // 只有记录员才保存星星
  if (session.persisted.role === 'recorder') {
    session.setRecords('stars_a4', stars.value)
  }
  // 广播更新（只有记录员才向教师端发送）
  if (session.persisted.groupId != null && session.persisted.role === 'recorder') {
    emit({ type: 'student:update', groupId: session.persisted.groupId, activity: 'a4', stars: stars.value, payload: {
      rows: rows.value, advantage: advantage.value, improveDiscussed: improveDiscussed.value
    } })
  }
}, { deep: true })

// (custom overlay highlighter removed in favor of CodeMirror)
</script>

<style scoped>
@import '@/assets/styles/evaluation.css';
.activity4 { padding: 0; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: .75rem;
  padding: 1rem;
}
.panel.left, .panel.right {
  position: relative;
  display: flex;
  flex-direction: column;
}
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: .5rem;
}
.cm-host { height: 320px; }
/* Size CodeMirror to fill the host */
:deep(.CodeMirror) { height: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 14px; line-height: 1.6; border: 1px solid var(--color-border); border-radius: .5rem; background: var(--color-surface); color: var(--color-text); }
/* Token colors approximating IDLE */
:deep(.CodeMirror .cm-keyword) { color: #d97706; font-weight: 700; }
:deep(.CodeMirror .cm-string) { color: #16a34a; }
:deep(.CodeMirror .cm-number) { color: #0ea5e9; }
:deep(.CodeMirror .cm-def) { color: #7c3aed; }
:deep(.CodeMirror .cm-comment) { color: #6b7280; font-style: italic; }
/* 运行时错误行高亮 */
:deep(.cm-rt-err) { background: rgba(239,68,68,.12); box-shadow: inset 3px 0 0 rgba(239,68,68,.7); }
.actions > button {
  padding: .5rem 1rem;
  border-radius: .5rem;
  border: 1px solid var(--color-border);
  background: var(--color-primary);
  color: #fff;
  cursor: pointer;
}
.output {
  margin-top: .75rem;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
}
.output-title {
  font-weight: 600;
  margin-bottom: .25rem;
}
.output pre {
  background: #0b1020;
  color: #e7f0ff;
  padding: .75rem;
  border-radius: .5rem;
  overflow: auto;
  min-height: 100px;
  max-height: 160px;
}
.loading { margin-top: .5rem; color: var(--color-text-secondary, #666); }

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

/* 顶部评价样式（标签） */
/* 评价标准样式已在 evaluation.css 中定义 */

/* 表格样式 */
.panel-title { padding:.5rem .75rem; font-weight:700; color:#111827; background:#f3f4f6; border:1px solid rgba(0,0,0,.08); border-radius:.5rem; margin-bottom:.6rem; }
.records-table { width:100%; border-collapse:collapse; background:#fff; table-layout: fixed; }
.records-table th, .records-table td { border:1px solid var(--color-border); padding:.6rem .7rem; text-align:center; font-size: 18px; }
.records-table th { background:#fff; font-weight:800; }
.records-table .col-heads { width: 110px; }
.records-table .col-legs { width: 110px; }
.records-table .col-result { width: auto; }
.choice { text-align:left; display:flex; align-items:center; gap:.5rem; flex-wrap: wrap; }
.choice .mini { width:70px; margin: 0 .25rem; }
.qa { margin-top:.75rem; display:flex; gap:1rem; flex-wrap:wrap; align-items:center; }
.qa-title { font-weight:700; }

/* 新步骤块样式 */
.block { margin: .75rem 0; background: #fff; border: 1px solid var(--color-border); border-radius: .75rem; padding: .75rem; }
.block-title { font-weight: 900; color: #111827; margin-bottom: .5rem; }
.check { display: flex; align-items: center; gap: .5rem; font-size: 18px; }
</style>
