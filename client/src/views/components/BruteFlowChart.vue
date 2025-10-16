<template>
  <div class="flowchart">
    <div class="toolbar">
    </div>

    <svg :viewBox="viewBox" preserveAspectRatio="xMinYMid meet">
      <defs>
        <!-- 燕尾箭头（默认黑色） -->
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 L 2.5 5 z" fill="#000" />
        </marker>
        <!-- 高亮箭头（主色），尺寸不变，仅颜色变蓝 -->
        <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 L 2.5 5 z" fill="var(--color-primary, #3b82f6)" />
        </marker>
      </defs>
      <g class="nodes">
        <g v-for="(n, idx) in nodes" :key="n.id"
           :transform="`translate(${n.x}, ${n.y})`">
          <!-- Render different shapes by type -->
          <template v-if="n.type === 'process' || n.type === 'terminator'">
            <rect :width="n.w" :height="n.h" :rx="n.type==='terminator'?25:0" :ry="n.type==='terminator'?25:0"
                  :class="nodeClass(idx)" />
          </template>
          <template v-else-if="n.type === 'decision'">
            <!-- Diamond: centered in n.w x n.h -->
            <polygon :points="diamondPoints(n.w, n.h)" :class="nodeClass(idx)" />
          </template>
          <template v-else-if="n.type === 'output'">
            <!-- Parallelogram: slanted sides -->
            <polygon :points="parallelogramPoints(n.w, n.h, 18)" :class="nodeClass(idx)" />
          </template>
          <text :x="n.w/2" :y="n.h/2" dominant-baseline="middle" text-anchor="middle">
            {{ n.label }}
          </text>
        </g>
      </g>
      <g class="edges" stroke="#000" stroke-width="1.5">
        <g v-for="(e, i) in edges" :key="i" :class="{ 'edge-active': store.activeEdge === i }">
          <template v-if="e.d">
            <path :d="e.d" fill="none"
                  :marker-end="store.activeEdge === i ? 'url(#arrow-active)' : 'url(#arrow)'" />
          </template>
          <template v-else>
            <line :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2"
                  :marker-end="store.activeEdge === i ? 'url(#arrow-active)' : 'url(#arrow)'" />
          </template>
          <text v-if="e.label" :x="e.lx" :y="e.ly" class="edge-label">{{ e.label }}</text>
        </g>
      </g>
    </svg>

  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'BruteFlowChart' })
import { computed } from 'vue'
import { useBruteStore } from '@/stores/useBruteStore'
import '@/assets/styles/flowchart.scss'

const store = useBruteStore()

const viewBox = '140 0 760 600'

type NodeType = 'process' | 'decision' | 'output' | 'terminator'
interface Node { id: string; x: number; y: number; w: number; h: number; label: string; type: NodeType }

const nodes = computed<Node[]>(() => {
  const heads = store.totalHeads ?? 0
  const legs = store.totalLegs ?? 0
  return [
    // 索引0：开始
    { id: 'start', x: 400, y: 20,  w: 120, h: 40, label: '开始', type: 'terminator' },
    // 索引1：tu ← 0
    { id: 'tu0',   x: 380, y: 85,  w: 160, h: 40, label: 'tu ← 0', type: 'process' },
    // 索引2：tu < heads+1?
    { id: 'cond1', x: 370, y: 145, w: 180, h: 60, label: `tu < ${heads + 1}?`, type: 'decision' },
    // 索引3：ji ← heads - tu
    { id: 'ji',    x: 370, y: 230, w: 180, h: 40, label: `ji ← ${heads} - tu`, type: 'process' },
    // 索引4：ji×2 + tu×4 == legs?
    { id: 'cond2', x: 330, y: 290, w: 260, h: 70, label: `ji×2 + tu×4 == ${legs}?`, type: 'decision' },
    // 索引5：输出 ji, tu（右侧）
    { id: 'outok', x: 580, y: 365, w: 180, h: 40, label: '输出 ji, tu', type: 'output' },
    // 索引6：tu ← tu + 1
    { id: 'tu1',   x: 380, y: 470, w: 160, h: 40, label: 'tu ← tu + 1', type: 'process' },
    // 索引7：输出 “此题无解”（右侧）
    { id: 'outno', x: 700, y: 255, w: 200, h: 40, label: '输出 “此题无解”', type: 'output' },
    // 索引8：结束
    { id: 'end',   x: 400, y: 555, w: 120, h: 40, label: '结束', type: 'terminator' }
  ]
})

const edges = computed(() => [
  // 主纵向（start -> tu0 -> cond1）
  { x1: 460, y1: 60,  x2: 460, y2: 85 },
  { x1: 460, y1: 125, x2: 460, y2: 145 },
  // cond1 是 -> ji（竖直）
  { x1: 460, y1: 205, x2: 460, y2: 230, label: '是', lx: 468, ly: 215 },
  // ji -> cond2（竖直）
  { x1: 460, y1: 270, x2: 460, y2: 290 },
  // cond2 否路径：从菱形左侧边缘出发，向左→向下(y=370)→向右至 tu1 左侧，再下接入，避免与 outok 路径重叠
  { d: 'M 330 325 L 240 325 L 240 440 L 460 440 L 460 470', label: '否', lx: 300, ly: 315 },
  // tu1 -> 回到 cond1（右角折线路径）
  { d: 'M 460 510 L 460 530 L 150 530 L 150 135 L 455 135' },
  // cond1 否 -> outno（从菱形右侧边缘出发）
  { d: 'M 550 175 L800 175 L 800 255 ', label: '否', lx: 560, ly: 165 },
  // cond2 是 -> outok（右向）
  { d: 'M 590 325 L 680 325 L 680 365 ', label: '是', lx: 640, ly: 315 },
  // outok -> tu1（下然后左折回到 tu1 水平线）
  { d: 'M 680 405 L 680 440 L 460 440 L 460 470' },
  // outno -> end（竖直向下再左折到 end）
  { d: 'M 800 295 L 800 540 L 460 540 L 460 555' }
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

// 代码可视化已移动至 CodePanelFlow1 组件
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; gap: .5rem; flex-wrap: wrap; }
.edge-label { fill: var(--color-text); font-size: 12px; user-select: none; }
.edges { color: #000; }
.edge-active { color: var(--color-primary, #3b82f6); }
.edge-active path, .edge-active line { stroke: var(--color-primary, #3b82f6); }
</style>
