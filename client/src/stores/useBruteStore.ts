import { defineStore } from 'pinia'

export interface BruteRow {
  tu: number | null
  ji: number | null
  ok: boolean | null
  output: string
}

export interface BruteState {
  totalHeads: number | null
  totalLegs: number | null
  tu: number | null
  ji: number | null
  found: boolean
  rows: BruteRow[]
  currentStep: number
  playing: boolean
  error: string | null
  steps: string[]
  cond1FalsePending: boolean
  activeEdge: number | null
}

// 流程图1：按照题图与给定伪代码的“存在缺陷版本”（循环结束后仍输出“此题无解”）
export const useBruteStore = defineStore('brute-enum', {
  state: (): BruteState => ({
    totalHeads: 5,
    totalLegs: 9,
    tu: null,
    ji: null,
    found: false,
    rows: [],
    steps: ['开始', 'tu ← 0', 'tu < heads+1?', 'ji ← heads - tu', 'ji×2 + tu×4 == legs?', '输出 ji, tu', 'tu ← tu + 1', '输出 “此题无解”', '结束'],
    currentStep: 0,
    playing: false,
    error: null,
    cond1FalsePending: false
    ,activeEdge: null
  }),
  getters: {
    canPlay(state: BruteState) {
      return state.totalHeads != null && state.totalLegs != null
    },
    canNext(state: BruteState) {
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
      this.found = false
      this.rows = []
      this.currentStep = 0
      this.playing = false
      this.error = null
      this.cond1FalsePending = false
      this.activeEdge = null
    },
    resetAll() {
      this.totalHeads = 35
      this.totalLegs = 94
      this.resetRuntime()
    },
    nextStep() {
      const go = (to: number, edge: number | null) => {
        this.activeEdge = edge
        this.currentStep = to
        this.executeByStep()
      }
      // 手动步进：当处于步骤6（tu <- tu + 1）时，下一步应回到步骤2（tu < heads+1?）
      if (this.currentStep === 6) {
        go(2, 5) // 边索引5：tu1 -> cond1 回环
        return
      }
      // 在步骤2时，如果上一执行已标记条件为假，则本次步进跳转至“输出此题无解”
      if (this.currentStep === 2 && this.cond1FalsePending) {
        this.cond1FalsePending = false
        go(7, 6) // 边索引6：cond1 否 -> outno
        return
      }
      // 条件步进：在步骤4（判断）之后，根据是否满足决定下一步到 5（输出）或 6（加一）
      if (this.currentStep === 4) {
        const last = this.rows[this.rows.length - 1]
        if (last && last.ok === true) {
          go(5, 7) // 边索引7：cond2 是 -> outok
        } else {
          go(6, 4) // 边索引4：cond2 否 -> tu1
        }
        return
      }
      // 步骤5（输出）之后固定到步骤6（加一）
      if (this.currentStep === 5) {
        go(6, 8) // 边索引8：outok -> tu1
        return
      }
      if (!this.canNext) return
      const from = this.currentStep
      const to = this.currentStep + 1
      let edge: number | null = null
      // 线性边：0->1:0, 1->2:1, 2->3:2, 3->4:3, 7->8:9
      if (from === 0 && to === 1) edge = 0
      else if (from === 1 && to === 2) edge = 1
      else if (from === 2 && to === 3) edge = 2
      else if (from === 3 && to === 4) edge = 3
      else if (from === 7 && to === 8) edge = 9 // outno -> end
      go(to, edge)
    },
    prevStep() {
      if (this.currentStep > 0) {
        this.currentStep--
      }
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
    // 在每个步骤节点执行相应逻辑，模拟“流程图1”
    executeByStep() {
      if (this.totalHeads == null || this.totalLegs == null) return
      const heads = this.totalHeads
      const legs = this.totalLegs

      switch (this.currentStep) {
        case 1: // tu ← 0
          this.tu = 0
          // 新一轮：表格添加骨架行（仅显示 tu）
          this.rows.push({ tu: this.tu, ji: null, ok: null, output: '' })
          break
        case 2: { // 判断 tu < heads+1?
          const tu = this.tu ?? 0
          const cond = tu < heads + 1
          if (!cond) {
            // 循环结束：不再执行“ji ← heads - tu”，保持 ji 与上一行一致（避免出现负数）
            const last = this.rows[this.rows.length - 1]
            const prev = this.rows[this.rows.length - 2]
            if (last) {
              last.ji = prev?.ji ?? last.ji // 保持上一行 ji（通常为0）
              last.ok = false
              // 输出文字延后到步骤7再写入，以便与流程图高亮同步
              last.output = ''
            } else {
              // 理论上不会走到这里；兜底处理（输出也延后到步骤7）
              this.rows.push({ tu, ji: prev?.ji ?? null, ok: false, output: '' })
            }
            // 不立刻跳转，让“tu < heads+1?”节点先被高亮展现；标记待跳转
            this.cond1FalsePending = true
          }
          break
        }
        case 3: { // ji ← heads - tu
          const tu = this.tu ?? 0
          this.ji = heads - tu
          // 更新最后一行 ji
          const last = this.rows[this.rows.length - 1]
          if (last) last.ji = this.ji
          break
        }
        case 4: { // 判断 ji×2 + tu×4 == legs?
          const tu = this.tu ?? 0
          const ji = this.ji ?? (heads - tu)
          const ok = ji * 2 + tu * 4 === legs
          // 仅更新最后一行是否满足，不立刻输出
          const last = this.rows[this.rows.length - 1]
          if (last) {
            last.ok = ok
          } else {
            this.rows.push({ tu, ji, ok, output: '' })
          }
          if (ok) {
            this.found = true
            // 按伪代码：即使找到也继续执行下一步（tu ← tu + 1）
          }
          break
        }
        case 5: { // 输出 ji、tu 的值（若满足）
          // 在此时才写入输出内容
          const last = this.rows[this.rows.length - 1]
          if (last && last.ok && this.ji != null && this.tu != null) {
            last.output = `${this.ji}只鸡, ${this.tu}只兔`
          }
          break
        }
        case 6: { // tu ← tu + 1
          const tu = (this.tu ?? 0) + 1
          this.tu = tu
          // 新一轮：添加骨架行，仅展示 tu
          this.rows.push({ tu: this.tu, ji: null, ok: null, output: '' })
          // 不在此处改变 currentStep（无论是否自动播放）。
          // 自动播放将与手动一样通过 nextStep() 推进到步骤2，保持两者高亮顺序一致。
          break
        }
        case 7: { // 输出 “此题无解” — 故意错误设计
          // 在输出节点高亮时写入“此题无解”，以与流程图节点同步
          const last = this.rows[this.rows.length - 1]
          if (last) last.output = '此题无解'
          break
        }
        default:
          break
      }
    }
  }
})
