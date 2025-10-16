<template>
  <div class="results-table">
    <div class="table-wrap">
      <table>
      <thead>
      <tr>
        <th>tu</th>
        <th>ji</th>
        <th>是否符合条件</th>
        <th>输出</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="(row, idx) in maskedRows" :key="idx" :class="{ ok: row.ok, nosolution: row.output === '此题无解' }">
        <td>{{ row.tu ?? '' }}</td>
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
import type { BruteRow } from '@/stores/useBruteStore'
import { useBruteStore } from '@/stores/useBruteStore'

const props = defineProps<{ rows: BruteRow[] }>()
const store = useBruteStore()

const maskedRows = computed(() => {
  const list = props.rows.map(r => ({ ...r }))
  if (list.length === 0) return list
  const i = list.length - 1
  const last = list[i]
  // 根据当前步骤，逐步显示：保留之前已显示的字段
  switch (store.currentStep) {
    case 1: // tu <- 0：仅显示 tu
      if (last.tu == null) last.tu = store.tu ?? last.tu
      last.ji = null
      last.ok = null
      last.output = ''
      break
    case 6: // tu <- tu + 1：仅显示 tu（新一行）
      if (last.tu == null) last.tu = store.tu ?? last.tu
      last.ji = null
      last.ok = null
      last.output = ''
      break
    case 3: // ji <- heads - tu：仅显示 ji
      // 保留已显示的 tu
      last.ok = null
      last.output = ''
      break
    case 4: // 判断：仅显示 ok
      // 保留 tu 与 ji，同时显示 ok
      last.output = ''
      break
    case 5: // 输出：仅显示 output
      // 显示所有字段（包含 tu、ji、ok、output）
      break
    default:
      // 其它步骤不做特殊遮罩
      break
  }
  list[i] = last
  return list
})
</script>

<style scoped>
.results-table { display: flex; flex: 1 1 auto; min-height: 0; }
.results-table table { width: 100%; border-collapse: collapse; }
.results-table th, .results-table td { border: 1px solid var(--color-border); padding: .5rem; text-align: center; }
.results-table tr.ok { background: var(--color-success-weak); }
.results-table tr.nosolution { background: var(--color-success-weak); }
.table-wrap { flex: 1 1 auto; min-height: 0; overflow: auto; border: 1px solid var(--color-border); border-radius: .5rem; }
.results-table thead th { position: sticky; top: 0; background: var(--color-surface, #fff); z-index: 1; }
</style>
