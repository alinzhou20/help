import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useAlgorithmStore } from '@/stores/useAlgorithmStore'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useAlgorithmStore', () => {
  it('sets input and progresses steps', () => {
    const store = useAlgorithmStore()
    store.setInput(10, 28)
    expect(store.currentStep).toBe(0)
    expect(store.canNext).toBe(true)

    store.nextStep()
    expect(store.currentStep).toBe(1)
    expect(store.rabbits).toBe(4)

    store.nextStep()
    expect(store.currentStep).toBe(2)
    expect(store.chickens).toBe(6)
  })
})
