import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FlowChart from '@/components/Activity2/components/FlowChart.vue'
import { useAlgorithmStore } from '@/stores/useAlgorithmStore'

function mountWithStore() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(FlowChart, { global: { plugins: [pinia] } })
  return wrapper
}

describe('FlowChart.vue', () => {
  it('highlights current node', async () => {
    const wrapper = mountWithStore()
    const store = useAlgorithmStore()
    store.setInput(10, 28)
    store.currentStep = 2
    await wrapper.vm.$nextTick()

    const activeRects = wrapper.findAll('rect.flow-node-active')
    expect(activeRects.length).toBe(1)
  })
})
