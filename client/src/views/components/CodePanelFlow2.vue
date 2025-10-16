<template>
  <div class="code1-wrap">
    <div class="code1">
      <div class="code1-title"><span>鸡兔同笼3.0</span><button class="run-btn" @click="runNow">运行</button></div>
      <div class="code1-pre">
      <!-- 1: tu,jie=0,0 -->
      <div :class="['code1-line', { active: activeCodeIdxs.includes(0) }]">tu,jie = <span class="num">0</span>,<span class="num">0</span></div>
      <!-- 2: while tu < heads+1 : -->
      <div :class="['code1-line', { active: activeCodeIdxs.includes(1) }]">
        <span class="kw">while</span>
        <span> tu &lt; </span>
        <span class="num expr">{{ (heads ?? 0) + 1 }}</span>
        <span> :</span>
      </div>
      <!-- 3: ji = heads - tu  (heads editable) -->
      <div :class="['code1-line', { active: activeCodeIdxs.includes(2) }]">
        <span class="indent indent-4"></span><span>ji = </span>
        <input class="inline-num" type="number" :value="heads ?? 0" @input="onHeadsInput($event)" />
        <span> - tu</span>
      </div>
      <!-- 4: if ji * 2 + tu * 4 == legs :  (legs editable) -->
      <div :class="['code1-line', { active: activeCodeIdxs.includes(3) }]">
        <span class="indent indent-4"></span><span class="kw">if</span>
        <span> ji * 2 + tu * 4 == </span>
        <input class="inline-num" type="number" :value="legs ?? 0" @input="onLegsInput($event)" />
        <span> :</span>
      </div>
      <!-- 5: jie = 1 -->
      <div :class="['code1-line', { active: activeCodeIdxs.includes(4) }]">
        <span class="indent indent-8"></span>jie = <span class="num">1</span>
      </div>
      <!-- 6: print(...) -->
      <div :class="['code1-line', { active: activeCodeIdxs.includes(5) }]">
        <span class="indent indent-8"></span><span class="fn">print</span>(ji,<span class="str">"只鸡，"</span>,tu,<span class="str">"只兔。"</span>)
      </div>
      <!-- 7: tu = tu + 1 -->
      <div :class="['code1-line', { active: activeCodeIdxs.includes(6) }]">
        <span class="indent indent-4"></span>tu = tu + 1
      </div>
      <!-- 8: if jie == 0: -->
      <div :class="['code1-line', { active: activeCodeIdxs.includes(7) }]">if jie == <span class="num">0</span>:</div>
      <!-- 9: print("此题无解") -->
      <div :class="['code1-line', { active: activeCodeIdxs.includes(8) }]"><span class="indent indent-4"></span><span class="fn">print</span>(<span class="str">"此题无解"</span>)</div>
      </div>
    </div>
    <div class="output-card">
      <div class="output-title">输出</div>
      <div class="output-body">
        <pre><code>{{ outputText }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBruteStoreV2 } from '@/stores/useBruteStoreV2'

const store = useBruteStoreV2()
const heads = computed(() => store.totalHeads)
const legs = computed(() => store.totalLegs)

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

// 将 V2 步骤与代码行高亮一一映射
// steps(V2):
// 0:开始, 1:tu←0,jie←0, 2:tu<heads+1?, 3:ji←heads-tu, 4:判断, 5:jie←1, 6:输出, 7:tu+1, 8:jie==0?, 9:输出无解, 10:结束
// 手动一次性运行输出优先展示
const manualText = ref('')
const useManual = ref(false)
// 输出区域：聚合非空输出（逐步运行时实时更新）
const outputText = computed(() => {
  if (useManual.value) return manualText.value
  return (store.rows || [])
    .map(r => (r.output || '').trim())
    .filter(Boolean)
    .join('\n')
})

function runNow() {
  const h = store.totalHeads ?? 0
  const l = store.totalLegs ?? 0
  let tu = 0
  let jie = 0
  const lines: string[] = []
  while (tu < h + 1) {
    const ji = h - tu
    if (ji * 2 + tu * 4 === l) {
      jie = 1
      lines.push(`${ji}只鸡, ${tu}只兔`)
    }
    tu = tu + 1
  }
  if (jie === 0) {
    lines.push('此题无解')
  }
  manualText.value = lines.join('\n')
  useManual.value = true
}

const activeCodeIdxs = computed<number[]>(() => {
  const step = store.currentStep
  const last = store.rows[store.rows.length - 1]
  switch (step) {
    case 1: return [0]            // tu,jie=0,0
    case 2: return [1]            // while 判断
    case 3: return [2]            // ji = heads - tu
    case 4: return [3]            // if 判断
    case 5: return [4]            // jie = 1
    case 6: return last && last.ok ? [5] : [3] // 输出命中时高亮 print，否则仍在 if 上
    case 7: return [6]            // tu = tu + 1
    case 8: return [7]            // if jie == 0:
    case 9: return [8]            // print("此题无解")
    default: return []
  }
})
</script>

<style scoped>
.code1-wrap { display: flex; flex-direction: column; gap: .75rem; align-items: stretch; height: 50vh; }
.code1 { background: #ffffff; border-radius: .6rem; border: 1px solid rgba(0,0,0,.1); overflow: hidden; display: flex; flex-direction: column; flex: 1 1 auto; }
.code1-title { padding: .5rem .75rem; font-weight: 700; color: #111827; background: #f3f4f6; border-bottom: 1px solid rgba(0,0,0,.08); display:flex; align-items:center; justify-content: space-between; gap: .5rem; }
.run-btn { padding: .35rem .7rem; border-radius: .45rem; border: 1px solid var(--color-primary); background: var(--color-primary); color: #fff; cursor: pointer; }
.run-btn:hover { filter: brightness(0.95); }
.code1-pre { margin: 0; padding: .6rem .9rem; color: #111; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 14px; line-height: 1.7; flex: 1; overflow: auto; }
.code1-line { position: relative; padding: .12rem .5rem; border-radius: .3rem; color: #111; white-space: nowrap; }
.code1-line.active::before { content: ''; position: absolute; inset: 0; border-radius: .3rem; background: rgba(16,185,129,.18); box-shadow: inset 0 0 0 1px rgba(16,185,129,.25); pointer-events: none; }
.indent { display: inline-block; }
.indent-4 { width: 4ch; }
.indent-8 { width: 8ch; }
.inline-num { width: 64px; appearance: textfield; -moz-appearance: textfield; -webkit-appearance: none; border: 1px solid rgba(0,0,0,.25); background: #fff; color: #111; border-radius: .35rem; padding: .1rem .35rem; margin: 0 .15rem; font-family: inherit; font-size: 14px; vertical-align: baseline; display: inline-block; }
.inline-num:focus { outline: none; border-color: rgba(59,130,246,.8); box-shadow: 0 0 0 2px rgba(59,130,246,.25); }
.kw { color: #d97706; font-weight: 700; }
.fn { color: #7c3aed; font-weight: 700; }
.str { color: #16a34a; }
.num { color: #0ea5e9; }
.expr { color: #0ea5e9; font-weight: 600; }

/* 输出区域样式：卡片+灰色标题，移至代码下方，限制高度 */
.output-card { background: #ffffff; border-radius: .6rem; border: 1px solid rgba(0,0,0,.1); display: flex; flex-direction: column; overflow: hidden; flex: 0 0 auto; }
.output-title { padding: .5rem .75rem; font-weight: 700; color: #111827; background: #f3f4f6; border-bottom: 1px solid rgba(0,0,0,.08); }
.output-body { padding: .6rem .9rem; display: flex; flex-direction: column; }
.output-body pre { background: #0b1020; color: #e7f0ff; padding: .75rem; border-radius: .5rem; overflow: auto; min-height: 120px; max-height: 220px; line-height: 1.3; font-size: 13px; }
</style>
