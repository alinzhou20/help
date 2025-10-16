import { defineStore } from 'pinia'
import { calculate } from '@/utils/algorithm'

export interface StepItem {
  description: string
  formula?: string
  variables: Record<string, number>
}

export interface AlgorithmState {
  totalHeads: number | null
  totalLegs: number | null
  rabbits: number | null
  chickens: number | null
  error: string | null
  currentStep: number
  steps: StepItem[]
  playing: boolean
}

export const useAlgorithmStore = defineStore('algorithm', {
  state: (): AlgorithmState => ({
    totalHeads: null,
    totalLegs: null,
    rabbits: null,
    chickens: null,
    error: null,
    currentStep: 0,
    playing: false,
    steps: [
      { description: '输入验证', variables: {} },
      { description: '计算兔子数量', formula: 'rabbits = (totalLegs - 2 * totalHeads) / 2', variables: { rabbits: 0 } },
      { description: '计算鸡数量', formula: 'chickens = totalHeads - rabbits', variables: { chickens: 0 } },
      { description: '验证结果', variables: {} },
      { description: '输出结果', variables: {} }
    ]
  }),
  getters: {
    canNext(state: AlgorithmState): boolean {
      if (state.totalHeads == null || state.totalLegs == null) return false
      return state.currentStep < state.steps.length - 1
    },
    canPlay(state: AlgorithmState): boolean {
      return state.totalHeads != null && state.totalLegs != null
    }
  },
  actions: {
    setInput(heads: number, legs: number) {
      this.totalHeads = heads
      this.totalLegs = legs
      this.resetRuntime()
    },
    resetRuntime() {
      this.rabbits = null
      this.chickens = null
      this.error = null
      this.currentStep = 0
      this.playing = false
    },
    reset() {
      // 使用 Pinia 内置的 $reset 将整个 state 恢复为初始值
      this.$reset()
    },
    resetAll() {
      this.totalHeads = 40
      this.totalLegs = 102
      this.resetRuntime()
    },
    nextStep() {
      if (!this.canNext) return
      this.currentStep++
    },
    prevStep() {
      if (this.currentStep > 0) {
        this.currentStep--
      }
    },
    playToggle() {
      this.playing = !this.playing
    }
  }
})
