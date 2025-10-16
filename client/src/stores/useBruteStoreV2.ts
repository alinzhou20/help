import { defineStore } from 'pinia'

export interface BruteRowV2 {
  tu: number | null
  ji: number | null
  ok: boolean | null
  jie: number | null // 1 有解，0 无解，null 未确定
  output: string
}

export interface BruteStateV2 {
  totalHeads: number | null
  totalLegs: number | null
  tu: number | null
  ji: number | null
  jie: number // 0/1 标记
  rows: BruteRowV2[]
  currentStep: number
  playing: boolean
  error: string | null
  steps: string[]
  cond1FalsePending: boolean
  activeEdge: number | null

}

// 流程图2：在流程图1基础上完善，通过变量 jie 避免“有解时仍输出无解”
export const useBruteStoreV2 = defineStore('brute-enum-v2', {
  state: (): BruteStateV2 => ({
    totalHeads: 35,
    totalLegs: 94,
    tu: null,
    ji: null,
    jie: 0,
    rows: [],
    // 步骤索引需与 V2 流程图节点一致
    steps: [
      '开始',                // 0
      'tu ← 0，jie ← 0',     // 1
      'tu < heads+1?',       // 2
      'ji ← heads - tu',     // 3
      'ji×2 + tu×4 == legs?',// 4
      'jie ← 1',             // 5 (仅在条件为真时有效)
      '输出 ji, tu',         // 6
      'tu ← tu + 1',         // 7
      'jie == 0?',           // 8 循环外最终判断
      '输出 “此题无解”',      // 9
      '结束'                 // 10
    ],
    currentStep: 0,
    playing: false,
    error: null,
    cond1FalsePending: false,
    activeEdge: null,
  }),
  getters: {
    canPlay(state): boolean {
      return state.totalHeads != null && state.totalLegs != null
    },
    canNext(state): boolean {
      return state.currentStep < state.steps.length - 1
    }
  },
  actions: {
    setInput(heads: number, legs: number) {
      this.totalHeads = heads
      this.totalLegs = legs
      this.resetRuntime()
    },
    resetRuntime() {
      this.tu = null
      this.ji = null
      this.jie = 0
      this.rows = []
      this.currentStep = 0
      this.playing = false
      this.error = null
      this.cond1FalsePending = false
      this.activeEdge = null
    },
    nextStep() {
      const go = (to: number, edge: number | null) => {
        this.activeEdge = edge
        this.currentStep = to
        this.executeByStep()
      }
      // 步骤7（tu <- tu + 1）后回到步骤2判断
      if (this.currentStep === 7) {
        go(2, 9) // tu1 -> cond1
        return
      }
      // 在步骤2若判断为假，需要跳到步骤8（jie==0?）
      if (this.currentStep === 2 && this.cond1FalsePending) {
        this.cond1FalsePending = false
        go(8, 10) // cond1 否 -> cond3
        return
      }
      // 在步骤4（判断）之后：若真 -> 5（jie<-1），再到 6（输出）；若假 -> 7（加一）
      if (this.currentStep === 4) {
        const last = this.rows[this.rows.length - 1]
        if (last && last.ok === true) {
          go(5, 4) // cond2 是 -> setjie
        } else {
          go(7, 8) // cond2 否 -> tu1
        }
        return
      }
      // 步骤5（jie<-1）后到步骤6（输出）
      if (this.currentStep === 5) {
        go(6, 5) // setjie -> outok
        return
      }
      // 步骤6（输出）后到步骤7（加一）
      if (this.currentStep === 6) {
        go(7, 7) // outok -> tu1
        return
      }
      // 步骤8（jie==0?）根据 jie 分支：jie==0 -> 9（无解输出）；否则 -> 10（结束）
      if (this.currentStep === 8) {
        if (this.jie === 0) {
          go(9, 11) // cond3 是 -> outno
        } else {
          go(10, 12) // cond3 否 -> end
        }
        return
      }
      if (!this.canNext) return
      // 默认线性前进时，设置对应边
      const from = this.currentStep
      const to = this.currentStep + 1
      let edge: number | null = null
      // 映射：0->1:0, 1->2:1, 2->3:2(条件为真且未跳8时), 3->4:3
      if (from === 0 && to === 1) edge = 0
      else if (from === 1 && to === 2) edge = 1
      else if (from === 2 && to === 3) edge = 2
      else if (from === 3 && to === 4) edge = 3
      go(to, edge)
    },
    prevStep() {
      if (this.currentStep > 0) this.currentStep--
    },
    playToggle() {
      if (!this.canPlay) return
      this.playing = !this.playing
      const tick = () => {
        if (!this.playing) return
        if (!this.canNext) { this.playing = false; return }
        this.nextStep()
        setTimeout(tick, 400)
      }
      if (this.playing) setTimeout(tick, 400)
    },
    executeByStep() {
      if (this.totalHeads == null || this.totalLegs == null) return
      const heads = this.totalHeads
      const legs = this.totalLegs

      switch (this.currentStep) {
        case 1: // tu ← 0，jie ← 0
          this.tu = 0
          this.jie = 0
          this.rows.push({ tu: this.tu, ji: null, ok: null, jie: this.jie, output: '' })
          break
        case 2: { // tu < heads+1?
          const tu = this.tu ?? 0
          const cond = tu < heads + 1
          if (!cond) {
            // 循环结束，进入最终判断（不立即跳转，先高亮当前节点）
            const last = this.rows[this.rows.length - 1]
            const prev = this.rows[this.rows.length - 2]
            if (last) {
              last.ji = prev?.ji ?? last.ji
              last.ok = false
              last.output = ''
              last.jie = this.jie
            }
            this.cond1FalsePending = true
          }
          break
        }
        case 3: { // ji ← heads - tu
          const tu = this.tu ?? 0
          this.ji = heads - tu
          const last = this.rows[this.rows.length - 1]
          if (last) last.ji = this.ji
          break
        }
        case 4: { // 判断
          const tu = this.tu ?? 0
          const ji = this.ji ?? (heads - tu)
          const ok = ji * 2 + tu * 4 === legs
          const last = this.rows[this.rows.length - 1]
          if (last) {
            last.ok = ok
          } else {
            this.rows.push({ tu, ji, ok, jie: this.jie, output: '' })
          }
          break
        }
        case 5: { // jie ← 1
          this.jie = 1
          const last = this.rows[this.rows.length - 1]
          if (last) last.jie = this.jie
          break
        }
        case 6: { // 输出 ji, tu
          const last = this.rows[this.rows.length - 1]
          if (last && last.ok && this.ji != null && this.tu != null) {
            last.output = ` ${this.ji} 只鸡, ${this.tu} 只兔`
          }
          break
        }
        case 7: { // tu ← tu + 1
          const tu = (this.tu ?? 0) + 1
          this.tu = tu
          this.rows.push({ tu: this.tu, ji: null, ok: null, jie: this.jie, output: '' })
          break
        }
        case 8: { // jie == 0?
          // 仅用于控制流向，具体输出在 9
          break
        }
        case 9: { // 输出 “此题无解”
          if (this.jie === 0) {
            const last = this.rows[this.rows.length - 1]
            if (last) last.output = '此题无解'
          }
          break
        }
        default:
          break
      }
    }
  }
})
