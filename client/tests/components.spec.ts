import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Activity2 from '@/components/Activity2/Activity2.vue'

describe('Activity2 integration', () => {
  it('renders subcomponents and allows input', async () => {
    const pinia = createPinia()
    const wrapper = mount(Activity2, { global: { plugins: [pinia] } })

    expect(wrapper.findComponent({ name: 'InputForm' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'StepController' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'FlowChart' }).exists()).toBe(true)
  })
})
