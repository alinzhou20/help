<template>
  <div class="results-table">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>tu</th>
            <th v-if="store.codeInfo.hasNoSolution">{{ store.codeInfo.varName }}</th>
            <th>ji</th>
            <th>是否符合条件</th>
            <th>输出</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in maskedRows" :key="idx" :class="{ ok: row.ok, nosolution: row.output && !row.output.includes('只鸡') }">
            <td>{{ row.tu ?? '' }}</td>
            <td v-if="store.codeInfo.hasNoSolution">{{ formatVarValue(row[store.codeInfo.varName]) }}</td>
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
import type { BruteRow } from '@/stores/useBruteDemoStore'
import { useBruteDemoStore } from '@/stores/useBruteDemoStore'

const props = defineProps<{ rows: BruteRow[] }>()
const store = useBruteDemoStore()

// 格式化变量值
function formatVarValue(value: any): string {
  if (value === null || value === undefined) return ''
  if (store.codeInfo.isBool) {
    // 布尔值显示
    if (value === true || value === 'True') return 'True'
    if (value === false || value === 'False') return 'False'
  }
  return String(value)
}

// 与 `ResultsTable.vue` 同步的逐步遮罩；额外规则：从不显示"无解"类输出
const maskedRows = computed(() => {
  const list = props.rows.map(r => ({ ...r }))
  if (list.length === 0) return list
  const i = list.length - 1
  const last = list[i]
  if (!store.codeInfo.hasNoSolution) {
    // 基础版本的步骤
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
      case 5: // 输出：仅显示 output（命中时）
        // 显示所有字段（包含 tu、ji、ok、output）
        break
      default:
        break
    }
    // 全局去除非命中输出
    for (const r of list) {
      if (!r.ok) r.output = ''
    }
  } else {
    // 增强版本的步骤（参考V2版本）
    const varName = store.codeInfo.varName
    switch (store.currentStep) {
      case 1: // tu ← 0，jie ← 0：显示 tu、jie
        if (last.tu == null) last.tu = store.tu ?? last.tu
        last.ji = null
        last.ok = null
        last.output = ''
        if (last[varName] == null && varName) last[varName] = store.codeInfo.isBool ? false : 0
        break
      case 3: // ji ← heads - tu：显示 ji
        last.ok = null
        last.output = ''
        break
      case 4: // 判断：显示 ok
        last.output = ''
        break
      case 5: // 输出：显示 output（命中时）
        break
      case 6: // jie ← 1：更新并显示 jie
        if (varName) last[varName] = store.codeInfo.isBool ? true : 1
        // 保持已有的输出内容，不要清空
        break
      case 7: // tu ← tu + 1：新一行仅显示 tu、沿用当前 jie
        if (last.tu == null) last.tu = store.tu ?? last.tu
        last.ji = null
        last.ok = null
        last.output = ''
        // varName值从前一行继承
        break
      case 8: // jie == 0?：仅控制流，不改变显示
        break
      case 9: // 输出"此题无解"：显示 output
        break
      default:
        break
    }
  }
  // 将最新的 last 改动写回
  list[i] = last
  return list
})
</script>

<style scoped>
.results-table { display: flex; flex: 1 1 auto; min-height: 0; }
.results-table table { width: 100%; border-collapse: collapse; }
.results-table th { 
  border: 1px solid var(--color-border); 
  padding: .3rem .4rem; 
  text-align: center; 
  font-size: 0.875rem; /* 14px - 增大表头字体 */
  font-weight: 700;
  white-space: nowrap;
}
.results-table td { 
  border: 1px solid var(--color-border); 
  padding: .4rem; 
  text-align: center; 
  font-size: 0.75rem; /* 12px - 减小内容字体 */
}
.results-table tr.ok { background: var(--color-success-weak); }
.results-table tr.nosolution { background: var(--color-success-weak); }
.table-wrap { flex: 1 1 auto; min-height: 0; overflow: auto; border: 1px solid var(--color-border); border-radius: .5rem; }
.results-table thead th { position: sticky; top: 0; background: var(--color-surface, #fff); z-index: 1; }
</style>
