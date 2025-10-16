<template>
  <div class="flowchart">
    <svg :viewBox="viewBox" preserveAspectRatio="xMidYMid meet">
      <!-- Edges -->
      <g class="edges" stroke="#000" stroke-width="2">
        <line v-for="(edge, i) in edges" :key="i"
              :x1="edge.x1" :y1="edge.y1" :x2="edge.x2" :y2="edge.y2"
              :class="edgeClass(i)" />
      </g>

      <!-- Nodes -->
      <g class="nodes">
        <g v-for="(node, index) in nodes" :key="node.id"
           :transform="`translate(${node.x}, ${node.y})`">
          <rect :width="node.w" :height="node.h" rx="10" ry="10"
                :class="nodeClass(index)" />
          <text :x="node.w/2" :y="node.h/2" dominant-baseline="middle" text-anchor="middle">
            {{ node.label }}
          </text>
        </g>
      </g>
    </svg>

    <div class="vars">
      <transition name="fade-move" mode="out-in">
        <div :key="varsKey">
          <p><strong>总头数:</strong> {{ store.totalHeads ?? '-' }}</p>
          <p><strong>总脚数:</strong> {{ store.totalLegs ?? '-' }}</p>
          <p><strong>兔子数量:</strong> {{ store.rabbits ?? '-' }}</p>
          <p><strong>鸡数量:</strong> {{ store.chickens ?? '-' }}</p>
          <p v-if="store.error" class="error">{{ store.error }}</p>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'FlowChart' })
import { computed } from 'vue'
import { useAlgorithmStore } from '@/stores/useAlgorithmStore'
import '@/assets/styles/flowchart.scss'

const store = useAlgorithmStore()

const viewBox = '0 0 800 400'

interface Node {
  id: string
  x: number
  y: number
  w: number
  h: number
  label: string
}

const nodes = computed<Node[]>(() => [
  { id: 'start', x: 40, y: 40, w: 120, h: 60, label: '开始' },
  { id: 'input', x: 220, y: 40, w: 160, h: 60, label: '输入头脚数' },
  { id: 'calcR', x: 420, y: 40, w: 180, h: 60, label: '计算兔子数量' },
  { id: 'calcC', x: 620, y: 40, w: 160, h: 60, label: '计算鸡数量' },
  { id: 'validate', x: 220, y: 160, w: 160, h: 60, label: '验证结果' },
  { id: 'output', x: 420, y: 160, w: 160, h: 60, label: '输出结果' }
])

const edges = computed(() => [
  // horizontal top row
  { x1: 160, y1: 70, x2: 220, y2: 70 },
  { x1: 380, y1: 70, x2: 420, y2: 70 },
  { x1: 600, y1: 70, x2: 620, y2: 70 },
  // down from input to validate
  { x1: 300, y1: 100, x2: 300, y2: 160 },
  // from calcC to output down-left
  { x1: 700, y1: 100, x2: 500, y2: 160 },
])

function nodeClass(index: number) {
  return {
    'flow-node': true,
    'flow-node-active': store.currentStep === index,
    'flow-node-passed': store.currentStep > index
  }
}

function edgeClass(i: number) {
  const active = i <= store.currentStep - 1
  return { active }
}

const varsKey = computed(() => `${store.totalHeads}-${store.totalLegs}-${store.rabbits}-${store.chickens}-${store.error}-${store.currentStep}`)
</script>
