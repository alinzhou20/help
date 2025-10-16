<template>
  <div class="results-table">
    <div class="table-wrap">
      <table>
      <thead>
      <tr>
        <th>tu</th>
        <th>jie</th>
        <th>ji</th>
        <th>是否符合条件</th>
        <th>输出</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="(row, idx) in maskedRows" :key="idx" :class="{ ok: row.ok, nosolution: row.output === '此题无解' }">
        <td>{{ row.tu ?? '' }}</td>
        <td>{{ row.jie ?? '' }}</td>
        <td>{{ row.ji ?? '' }}</td>
        <td>{{ row.ok === true ? '是' : (row.ok === false ? '否' : '') }}</td>
        <td>{{ row.output || '' }}</td>
      </tr>
      </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BruteRowV2 } from '@/stores/useBruteStoreV2'
import { useBruteStoreV2 } from '@/stores/useBruteStoreV2'

const props = defineProps<{ rows: BruteRowV2[] }>()
const store = useBruteStoreV2()

const maskedRows = computed(() => {
  const list = props.rows.map(r => ({ ...r }))
  if (list.length === 0) return list
  const i = list.length - 1
  const last = list[i]
  // 根据当前步骤逐步显隐字段（以便与高亮同步）
  switch (store.currentStep) {
    case 1: // tu ← 0，jie ← 0：显示 tu、jie
      if (last.tu == null) last.tu = store.tu ?? last.tu
      last.ji = null
      last.ok = null
      last.output = ''
      if (last.jie == null) last.jie = store.jie
      break
    case 7: // tu ← tu + 1：新一行仅显示 tu、沿用当前 jie
      if (last.tu == null) last.tu = store.tu ?? last.tu
      last.ji = null
      last.ok = null
      last.output = ''
      if (last.jie == null) last.jie = store.jie
      break
    case 3: // ji ← heads - tu：显示 ji（保留 tu、jie）
      last.ok = null
      last.output = ''
      if (last.jie == null) last.jie = store.jie
      break
    case 4: // 判断：显示 ok（保留 tu、ji、jie）
      last.output = ''
      if (last.jie == null) last.jie = store.jie
      break
    case 5: // jie ← 1：更新并显示 jie
      last.jie = 1
      last.output = ''
      break
    case 6: // 输出：显示 output（其它字段保留）
      break
    case 8: // jie == 0?：仅控制流，不改变显示
      break
    case 9: // 输出“此题无解”：显示 output（仅当 jie==0 时会写入）
      break
    default:
      break
  }
  list[i] = last
  return list
})
</script>

<style scoped>
.results-table table { width: 100%; border-collapse: collapse; }
.results-table th, .results-table td { border: 1px solid var(--color-border); padding: .5rem; text-align: center; }
.results-table tr.ok { background: var(--color-success-weak); }
.results-table tr.nosolution { background: var(--color-success-weak); }
.table-wrap { height: 850px; overflow: auto; border: 1px solid var(--color-border); border-radius: .5rem; }
.results-table thead th { position: sticky; top: 0; background: var(--color-surface, #fff); z-index: 1; }
</style>
