<template>
  <div class="brute-controller">
    <div class="panel-title">枚举过程</div>
    <ResultsTable :rows="store.rows" />
  </div>
</template>

<script setup lang="ts">
import { useBruteStore } from '@/stores/useBruteStore'
import ResultsTable from './ResultsTable.vue'

defineOptions({ name: 'BruteController' })

const store = useBruteStore()
</script>

<style scoped>
/* 小标题与活动2面板一致的灰色标题栏 */
.panel-title { padding: .5rem .75rem; font-weight: 700; color: #111827; background: #f3f4f6; border: 1px solid rgba(0,0,0,.08); border-radius: .5rem; margin-bottom: .6rem; }
.brute-controller { height: 100%; display: flex; flex-direction: column; }
</style>
