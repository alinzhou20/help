<template>
  <div class="brute-controller">
    <div class="panel-title">枚举过程</div>
    <ResultsTableV2 :rows="store.rows" />
  </div>
</template>

<script setup lang="ts">
import { useBruteStoreV2 } from '@/stores/useBruteStoreV2'
import ResultsTableV2 from './ResultsTableV2.vue'

defineOptions({ name: 'BruteControllerV2' })

const store = useBruteStoreV2()
</script>

<style scoped>
/* 灰色小标题与活动2一致 */
.panel-title { padding: .5rem .75rem; font-weight: 700; color: #111827; background: #f3f4f6; border: 1px solid rgba(0,0,0,.08); border-radius: .5rem; margin-bottom: .6rem; }
</style>
