<template>
  <div class="flowchart">
    <svg :viewBox="viewBox" preserveAspectRatio="xMinYMid meet">
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
            <rect :width="n.w" :height="n.h" :rx="n.type==='terminator'?25:0" :ry="n.type==='terminator'?25:0" 
                  :class="nodeClass(idx)" 
                  :data-debug-class="JSON.stringify(nodeClass(idx))" />
          </template>
          <template v-else-if="n.type === 'decision'">
            <polygon :points="diamondPoints(n.w, n.h)" 
                     :class="nodeClass(idx)"
                     :data-debug-class="JSON.stringify(nodeClass(idx))" />
          </template>
          <template v-else-if="n.type === 'output'">
            <polygon :points="parallelogramPoints(n.w, n.h, 18)" 
                     :class="nodeClass(idx)"
                     :data-debug-class="JSON.stringify(nodeClass(idx))" />
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
import { useBruteDemoStore } from '@/stores/useBruteDemoStore'
import '@/assets/styles/flowchart.scss'

const store = useBruteDemoStore()

const viewBox = computed(() => {
  // 基础版本使用更大的缩放，增强版本保持原有的视图
  // 基础版本：左边界约150（回环），右边界约800（右侧路径），上下留边距
  // 高度调整为610以确保底部"结束"节点完全显示（y=555 + h=40 + 边距）
  // 增强版本：保持原始画布大小，节点整体左移80像素
  return store.codeInfo.hasNoSolution ? '50 0 1000 700' : '120 15 720 610'
})

type NodeType = 'process' | 'decision' | 'output' | 'terminator'
interface Node { id: string; x: number; y: number; w: number; h: number; label: string; type: NodeType }


const nodes = computed<Node[]>(() => {
  const heads = store.totalHeads ?? 0
  const legs = store.totalLegs ?? 0
  const codeInfo = store.codeInfo
  
  if (!codeInfo.hasNoSolution) {
    // 基础版本的节点
    return [
      { id: 'start', x: 400, y: 20,  w: 120, h: 40, label: '开始', type: 'terminator' },
      { id: 'tu0',   x: 380, y: 85,  w: 160, h: 40, label: 'tu ← 0', type: 'process' },
      { id: 'cond1', x: 370, y: 145, w: 180, h: 60, label: `tu < ${heads + 1}?`, type: 'decision' },
      { id: 'ji',    x: 370, y: 230, w: 180, h: 40, label: `ji ← ${heads} - tu`, type: 'process' },
      { id: 'cond2', x: 330, y: 290, w: 260, h: 70, label: `ji×2 + tu×4 == ${legs}?`, type: 'decision' },
      { id: 'outok', x: 580, y: 365, w: 180, h: 40, label: '输出 ji, tu', type: 'output' },
      { id: 'tu1',   x: 380, y: 470, w: 160, h: 40, label: 'tu ← tu + 1', type: 'process' },
      { id: 'end',   x: 400, y: 555, w: 120, h: 40, label: '结束', type: 'terminator' }
    ]
  } else {
    // 增强版本的节点（参考V2版本布局）
    const varName = codeInfo.varName
    const defaultValue = codeInfo.defaultValue
    const successValue = codeInfo.successValue
    const checkExpr = codeInfo.checkExpression
    
    return [
      { id: 'start', x: 320, y: 20,  w: 120, h: 40, label: '开始', type: 'terminator' },          // 0
      { id: 'tu0',   x: 280, y: 85,  w: 200, h: 40, label: `tu ← 0，${varName} ← ${defaultValue}`, type: 'process' }, // 1
      { id: 'cond1', x: 290, y: 145, w: 180, h: 60, label: `tu < ${heads + 1}?`, type: 'decision' }, // 2
      { id: 'ji',    x: 290, y: 230, w: 180, h: 40, label: `ji ← ${heads} - tu`, type: 'process' },  // 3
      { id: 'cond2', x: 250, y: 290, w: 260, h: 70, label: `ji×2 + tu×4 == ${legs}?`, type: 'decision' }, // 4
      { id: 'outok', x: 425, y: 360, w: 180, h: 40, label: '输出 ji, tu', type: 'output' },        // 5
      { id: 'setjie',x: 450, y: 430, w: 140, h: 40, label: `${varName} ← ${successValue}`, type: 'process' }, // 6
      { id: 'tu1',   x: 300, y: 550, w: 160, h: 40, label: 'tu ← tu + 1', type: 'process' },       // 7
      { id: 'cond3', x: 670, y: 200, w: 180, h: 60, label: `${checkExpr}?`, type: 'decision' },    // 8
      { id: 'outno', x: 540, y: 270, w: 180, h: 40, label: `输出 "${codeInfo.noSolutionText || '此题无解'}"`, type: 'output' },    // 9
      { id: 'end',   x: 320, y: 650, w: 120, h: 40, label: '结束', type: 'terminator' }            // 10
    ]
  }
})

const edges = computed(() => {
  const codeInfo = store.codeInfo
  
  if (!codeInfo.hasNoSolution) {
    // 基础版本的边
    return [
      // start -> tu0 -> cond1
      { x1: 460, y1: 60,  x2: 460, y2: 85 },
      { x1: 460, y1: 125, x2: 460, y2: 145 },
      // cond1 是 -> ji
      { x1: 460, y1: 205, x2: 460, y2: 230, label: '是', lx: 468, ly: 215 },
      // ji -> cond2
      { x1: 460, y1: 270, x2: 460, y2: 290 },
      // cond2 否 -> tu1
      { d: 'M 330 325 L 240 325 L 240 440 L 460 440 L 460 470', label: '否', lx: 300, ly: 315 },
      // tu1 回到 cond1（回环）
      { d: 'M 460 510 L 460 530 L 150 530 L 150 135 L 455 135' },
      // cond2 是 -> outok
      { d: 'M 590 325 L 680 325 L 680 365 ', label: '是', lx: 640, ly: 315 },
      // outok -> tu1
      { d: 'M 680 405 L 680 440 L 460 440 L 460 470' },
      // cond1 否 -> 结束（从右侧绕行至底部）
      { d: 'M 550 175 L 800 175 L 800 540 L 460 540 L 460 555', label: '否', lx: 515, ly: 165 },
    ]
  } else {
    // 增强版本的边（参考V2版本）
    return [
      // 主纵向（start -> tu0 -> cond1）
      { x1: 380, y1: 60,  x2: 380, y2: 85 },
      { x1: 380, y1: 125, x2: 380, y2: 145 },
      // cond1 是 -> ji
      { x1: 380, y1: 205, x2: 380, y2: 230, label: '是', lx: 390, ly: 215 },
      // ji -> cond2
      { x1: 380, y1: 270, x2: 380, y2: 290 },
      // cond2 是 -> outok -> setjie
      { d: 'M 505 325 L 525 325 L 525 360', label: '是', lx: 490, ly: 315 },
      { x1: 525, y1: 400, x2: 525, y2: 430 },
      { d: 'M 620 310 L 620 400 L 760 400 L 760 630 L 385 630 L 385 650' },
      { d: 'M 525 470 L 525 530 L 385 530 L 385 550'},// setjie 到 tu1
      // cond2 否 -> 左侧路径到 tu1
      { d: 'M 250 325 L 230 325 L 230 530 L 385 530 L 385 550', label: '否', lx: 260, ly: 315 },
      // tu1 回到 cond1（循环）
      { d: 'M 385 590 L 385 610 L 100 610 L 100 135 L 375 135' },
      // cond1 否 -> 右侧到 cond3（jie==0?）
      { d: 'M 470 175 L 760 175 L 760 200', label: '否', lx: 490, ly: 165 },
      // cond3 是 -> outno
      { d: 'M 670 230 L 620 230 L 620 270', label: '是', lx: 670, ly: 220 },
      // cond3 否 -> 直接结束
      { d: 'M 850 230 L 900 230 L 900 400 L 760 400 L 760 630 L 385 630 L 385 650', label: '否', lx: 840, ly: 220 },
    ]
  }
})

function nodeClass(index: number) {
  const isEnhancedNew = store.codeInfo.hasNoSolution && store.justSwitchedToEnhanced
  const isNewNode = isEnhancedNew && (index === 1 || index === 6 || index === 8 || index === 9)
  
  // 调试信息
  if (index === 1) {
    console.log('Debug nodeClass:', {
      index,
      hasNoSolution: store.codeInfo.hasNoSolution,
      justSwitchedToEnhanced: store.justSwitchedToEnhanced,
      isEnhancedNew,
      isNewNode
    })
  }
  
  return {
    'flow-node': true,
    'flow-node-active': store.currentStep === index,
    'flow-node-passed': store.currentStep > index,
    'flow-node-new': isNewNode
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
.edge-label { fill: var(--color-text); font-size: 12px; user-select: none; }
.edges { color: #000; }
.edge-active { color: var(--color-primary, #3b82f6); }
.edge-active path, .edge-active line { stroke: var(--color-primary, #3b82f6); }

/* 新增流程块高亮样式 */
.nodes .flow-node-new {
  fill: #fbbf24 !important;  /* 橙黄色高亮 */
  stroke: #f59e0b !important;
  stroke-width: 3px !important;
  filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.8));
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.02);
    opacity: 0.9;
  }
}
</style>
