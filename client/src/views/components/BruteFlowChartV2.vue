<template>
  <div class="flowchart">
    <div class="toolbar">
    </div>

    <svg :viewBox="viewBox" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 L 2.5 5 z" fill="#000" />
        </marker>
        <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 L 2.5 5 z" fill="var(--color-primary, #3b82f6)" />
        </marker>
      </defs>
      <g class="nodes">
        <g v-for="(n, idx) in nodes" :key="n.id" :transform="`translate(${n.x}, ${n.y})`">
          <template v-if="n.type === 'process' || n.type === 'terminator'">
            <rect :width="n.w" :height="n.h" :rx="n.type==='terminator'?25:0" :ry="n.type==='terminator'?25:0" :class="nodeClass(idx)" />
          </template>
          <template v-else-if="n.type === 'decision'">
            <polygon :points="diamondPoints(n.w, n.h)" :class="nodeClass(idx)" />
          </template>
          <template v-else-if="n.type === 'output'">
            <polygon :points="parallelogramPoints(n.w, n.h, 18)" :class="nodeClass(idx)" />
          </template>
          <text :x="n.w/2" :y="n.h/2" dominant-baseline="middle" text-anchor="middle">{{ n.label }}</text>
        </g>
      </g>
      <g class="edges" stroke="#000" stroke-width="1.5">
        <g v-for="(e, i) in edges" :key="i" :class="{ 'edge-active': store.activeEdge === i }">
          <template v-if="e.d">
            <path :d="e.d" fill="none" :marker-end="store.activeEdge === i ? 'url(#arrow-active)' : 'url(#arrow)'" />
          </template>
          <template v-else>
            <line :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2" :marker-end="store.activeEdge === i ? 'url(#arrow-active)' : 'url(#arrow)'" />
          </template>
          <text v-if="e.label" :x="e.lx" :y="e.ly" class="edge-label">{{ e.label }}</text>
        </g>
      </g>
    </svg>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBruteStoreV2 } from '@/stores/useBruteStoreV2'
import '@/assets/styles/flowchart.scss'

type NodeType = 'process' | 'decision' | 'output' | 'terminator'
interface Node { id: string; x: number; y: number; w: number; h: number; label: string; type: NodeType }

const store = useBruteStoreV2()

const viewBox = '0 0 980 800'

const nodes = computed<Node[]>(() => {
  const heads = store.totalHeads ?? 0
  const legs = store.totalLegs ?? 0
  return [
    { id: 'start', x: 400, y: 20,  w: 120, h: 40, label: '开始', type: 'terminator' },           // 0
    { id: 'tu0',   x: 360, y: 85,  w: 200, h: 40, label: 'tu ← 0，jie ← 0', type: 'process' }, // 1
    { id: 'cond1', x: 370, y: 145, w: 180, h: 60, label: `tu < ${heads + 1}?`, type: 'decision' }, // 2
    { id: 'ji',    x: 370, y: 230, w: 180, h: 40, label: `ji ← ${heads} - tu`, type: 'process' },  // 3
    { id: 'cond2', x: 330, y: 290, w: 260, h: 70, label: `ji×2 + tu×4 == ${legs}?`, type: 'decision' }, // 4
    { id: 'setjie',x: 540, y: 360, w: 120, h: 40, label: 'jie ← 1', type: 'process' },           // 5
    { id: 'outok', x: 505, y: 430, w: 180, h: 40, label: '输出 ji, tu', type: 'output' },        // 6
    { id: 'tu1',   x: 380, y: 550, w: 160, h: 40, label: 'tu ← tu + 1', type: 'process' },       // 7
    { id: 'cond3', x: 750, y: 200, w: 140, h: 60, label: 'jie == 0?', type: 'decision' },        // 8
    { id: 'outno', x: 620, y: 270, w: 160, h: 40, label: '输出 “此题无解”', type: 'output' },    // 9
    { id: 'end',   x: 400, y: 650, w: 120, h: 40, label: '结束', type: 'terminator' }            // 10
  ]
})

const edges = computed(() => [
  // 主纵向（start -> tu0 -> cond1）
  { x1: 460, y1: 60,  x2: 460, y2: 85 },
  { x1: 460, y1: 125, x2: 460, y2: 145 },
  // cond1 是 -> ji
  { x1: 460, y1: 205, x2: 460, y2: 230, label: '是', lx: 470, ly: 215 },
  // ji -> cond2
  { x1: 460, y1: 270, x2: 460, y2: 290 },
  // cond2 是 -> setjie -> outok
  { d: 'M 585 325 L 605 325 L 605 360', label: '是', lx: 570, ly: 315 }, // cond2 右出到 setjie 上方
  { x1: 605, y1: 400, x2: 605, y2: 430 },
  { d: 'M 700 310 L 700 400 L 820 400 L 820 630 L 465 630 L 465 650' },
  { d: 'M 605 470 L 605 530 L 465 530 L 465 550'},// outok 到 tu1（斜折）
  // cond2 否 -> 左侧路径到 tu1
  { d: 'M 330 325 L 310 325 L 310 530 L 465 530 L 465 550', label: '否', lx: 340, ly: 315 },
  // tu1 回到 cond1（循环）
  { d: 'M 465 590 L 465 610 L 180 610 L 180 135 L 455 135' },
  // cond1 否 -> 右侧到 cond3（jie==0?）
  { d: 'M 550 175 L 820 175 L 820 200', label: '否', lx: 570, ly: 165 },
  // cond3 是 -> outno
  { d: 'M 750 230 L 700 230 L 700 270', label: '是', lx: 750, ly: 220 },
  // cond3 否 -> 直接结束（下折到 end 左侧）
  { d: 'M 890 230 L 940 230 L 940 400 L 820 400 L 820 630 L 465 630 L 465 650', label: '否', lx: 890, ly: 220 },
])

function nodeClass(index: number) {
  return {
    'flow-node': true,
    'flow-node-active': store.currentStep === index,
    'flow-node-passed': store.currentStep > index
  }
}

function diamondPoints(w: number, h: number) {
  const cx = w / 2, cy = h / 2
  return `${cx},0 ${w},${cy} ${cx},${h} 0,${cy}`
}

function parallelogramPoints(w: number, h: number, skew: number) {
  const s = Math.max(0, Math.min(skew, w / 2))
  return `${s},0 ${w},0 ${w - s},${h} 0,${h}`
}
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; gap: .5rem; flex-wrap: wrap; }
.edge-label { fill: var(--color-text); font-size: 12px; user-select: none; }
.edges { color: #000; }
.edge-active { color: var(--color-primary, #3b82f6); }
.edge-active path, .edge-active line { stroke: var(--color-primary, #3b82f6); }
</style>
