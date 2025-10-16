<template>
  <form class="input-form" @submit.prevent="onSubmit">
    <h3>输入</h3>
    <div class="row">
      <label for="heads">总头数</label>
      <input id="heads" type="number" min="0" step="1" v-model.number="heads" required />
    </div>
    <div class="row">
      <label for="legs">总脚数</label>
      <input id="legs" type="number" min="0" step="2" v-model.number="legs" required />
    </div>
    <div class="row actions">
      <button type="submit">设置</button>
      <button type="button" class="secondary" @click="reset">重置</button>
    </div>
  </form>
</template>

<script setup lang="ts">
defineOptions({ name: 'InputForm' })
import { ref, watch } from 'vue'
import { useAlgorithmStore } from '@/stores/useAlgorithmStore'

const store = useAlgorithmStore()

const heads = ref<number | null>(store.totalHeads)
const legs = ref<number | null>(store.totalLegs)

function onSubmit() {
  if (heads.value == null || legs.value == null) return
  store.setInput(heads.value, legs.value)
}

function reset() {
  heads.value = null
  legs.value = null
  store.reset()
}

watch(() => store.totalHeads, v => heads.value = v)
watch(() => store.totalLegs, v => legs.value = v)
</script>

<style scoped>
.input-form .row {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: .75rem;
}
.input-form input {
  flex: 1;
  padding: .5rem .75rem;
  border: 1px solid var(--color-border);
  border-radius: .5rem;
}
.actions {
  justify-content: flex-end;
}
button.secondary {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
</style>
