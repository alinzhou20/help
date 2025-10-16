<template>
  <div class="step-controller">
    <h3>步骤控制</h3>
    <div class="buttons">
      <button @click="store.nextStep" :disabled="!store.canNext">下一步</button>
      <button @click="store.playToggle" :disabled="!store.canPlay">{{ store.playing ? '暂停' : '自动播放' }}</button>
      <button @click="store.reset">重置</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'StepController' })
import { useAlgorithmStore } from '@/stores/useAlgorithmStore'

const store = useAlgorithmStore()
</script>

<style scoped>
.buttons { display: flex; gap: .5rem; margin-bottom: .75rem; flex-wrap: wrap; }
</style>
