import { defineStore } from 'pinia'

export interface BruteRow {
  tu: number | null
  ji: number | null
  ok: boolean | null
  output: string
  // 动态变量（根据教师编辑的代码动态设置）
  [key: string]: any
}

export interface CodeInfo {
  hasNoSolution: boolean
  varName: string
  isBool: boolean
  defaultValue: string
  successValue: string
  checkExpression: string
  noSolutionText?: string  // 无解时输出的文字
}

export interface BruteStateDemo {
  totalHeads: number | null
  totalLegs: number | null
  tu: number | null
  ji: number | null
  rows: BruteRow[]
  currentStep: number
  playing: boolean
  error: string | null
  steps: string[]
  cond1FalsePending: boolean
  activeEdge: number | null
  codeInfo: CodeInfo
  justSwitchedToEnhanced: boolean  // 标记是否刚从基础版切换到增强版
}

// 本地存储键
const TEACHER_CODE_KEY = 'va_teacher_demo_code'
const TEACHER_CODE_INFO_KEY = 'va_teacher_demo_codeInfo'

// 教师演示：支持基础版本和增强版本（带无解判断）
// 基础版本流程图节点：0 开始, 1 tu←0, 2 tu<heads+1?, 3 ji←heads-tu, 4 判断, 5 输出ji,tu, 6 tu←tu+1, 7 结束
// 增强版本流程图节点：0 开始, 1 tu←0,jie←0, 2 tu<heads+1?, 3 ji←heads-tu, 4 判断, 5 jie←1, 6 输出ji,tu, 7 tu←tu+1, 8 jie==0?, 9 输出无解, 10 结束
export const useBruteDemoStore = defineStore('brute-demo', {
  state: (): BruteStateDemo => {
    // 尝试从 localStorage 加载保存的 codeInfo
    let savedCodeInfo: CodeInfo = {
      hasNoSolution: false,
      varName: 'jie',
      isBool: false,
      defaultValue: '0',
      successValue: '1',
      checkExpression: 'jie == 0',
      noSolutionText: '此题无解'
    }
    
    const savedCodeInfoStr = localStorage.getItem(TEACHER_CODE_INFO_KEY)
    if (savedCodeInfoStr) {
      try {
        savedCodeInfo = JSON.parse(savedCodeInfoStr)
        console.log('Loaded saved codeInfo:', savedCodeInfo)
      } catch (e) {
        console.error('Failed to parse saved codeInfo:', e)
      }
    }
    
    return {
      totalHeads: 5,
      totalLegs: 9,
      tu: null,
      ji: null,
      rows: [],
      steps: ['开始','tu ← 0','tu < heads+1?','ji ← heads - tu','ji×2 + tu×4 == legs?','输出 ji, tu','tu ← tu + 1','结束'],
      currentStep: 0,
      playing: false,
      error: null,
      cond1FalsePending: false,
      activeEdge: null,
      codeInfo: savedCodeInfo,
      justSwitchedToEnhanced: false
    }
  },
  getters: {
    canPlay(state): boolean { return state.totalHeads != null && state.totalLegs != null },
    canNext(state): boolean { return state.currentStep < state.steps.length - 1 },
    // 动态获取步骤数组
    dynamicSteps(state): string[] {
      if (!state.codeInfo.hasNoSolution) {
        return ['开始','tu ← 0','tu < heads+1?','ji ← heads - tu','ji×2 + tu×4 == legs?','输出 ji, tu','tu ← tu + 1','结束']
      } else {
        const varName = state.codeInfo.varName
        const checkExpr = state.codeInfo.checkExpression
        return [
          '开始',
          `tu ← 0, ${varName} ← ${state.codeInfo.defaultValue}`,
          'tu < heads+1?',
          'ji ← heads - tu',
          'ji×2 + tu×4 == legs?',
          '输出 ji, tu',
          `${varName} ← ${state.codeInfo.successValue}`,
          'tu ← tu + 1',
          checkExpr + '?',
            `输出 "${state.codeInfo.noSolutionText || '此题无解'}"`,
          '结束'
        ]
      }
    }
  },
  actions: {
    setInput(heads: number, legs: number) {
      this.totalHeads = heads
      this.totalLegs = legs
      this.resetRuntime()
    },
    setCodeInfo(codeInfo: CodeInfo) {
      // 检测是否从基础版切换到增强版
      const wasBasic = !this.codeInfo.hasNoSolution
      const isEnhanced = codeInfo.hasNoSolution
      
      console.log('setCodeInfo debug:', {
        wasBasic,
        isEnhanced,
        oldHasNoSolution: this.codeInfo.hasNoSolution,
        newHasNoSolution: codeInfo.hasNoSolution,
        willHighlight: wasBasic && isEnhanced
      })
      
      this.codeInfo = codeInfo
      // 保存到 localStorage
      localStorage.setItem(TEACHER_CODE_INFO_KEY, JSON.stringify(codeInfo))
      // 更新步骤数组
      this.steps = this.dynamicSteps
      this.resetRuntime()
      
      // 在 resetRuntime 之后设置高亮状态
      // 只在从基础版切换到增强版时高亮
      if (wasBasic && isEnhanced) {
        this.justSwitchedToEnhanced = true
        console.log('Set justSwitchedToEnhanced to true - switched from basic to enhanced')
      }
    },
    clearSavedCode() {
      // 清除保存的代码和 codeInfo
      localStorage.removeItem(TEACHER_CODE_KEY)
      localStorage.removeItem(TEACHER_CODE_INFO_KEY)
      // 恢复默认 codeInfo
      this.codeInfo = {
        hasNoSolution: false,
        varName: 'jie',
        isBool: false,
        defaultValue: '0',
        successValue: '1',
      checkExpression: 'jie == 0',
      noSolutionText: '此题无解'
    }
      this.steps = this.dynamicSteps
      this.resetRuntime()
      this.justSwitchedToEnhanced = false
    },
    resetRuntime() {
      this.tu = null
      this.ji = null
      this.rows = []
      this.currentStep = 0
      this.playing = false
      this.error = null
      this.cond1FalsePending = false
      this.activeEdge = null
      // 注意：不重置 justSwitchedToEnhanced，保留切换状态
    },
    resetAll() {
      this.totalHeads = 40
      this.totalLegs = 102
      this.resetRuntime()
      this.justSwitchedToEnhanced = false
    },
    nextStep() {
      // 清除刚切换到增强版的标记
      this.justSwitchedToEnhanced = false
      
      const go = (to: number, edge: number | null) => { this.activeEdge = edge; this.currentStep = to; this.executeByStep() }
      
      if (!this.codeInfo.hasNoSolution) {
        // 基础版本的流程控制
        if (this.currentStep === 6) { go(2, 5); return } // 6 -> 回环到 2
        if (this.currentStep === 2 && this.cond1FalsePending) { this.cond1FalsePending = false; go(7, 8); return } // 2 -> 7（结束）
        if (this.currentStep === 4) { // 4 条件判断后的分支
          const last = this.rows[this.rows.length - 1]
          if (last && last.ok) { go(5, 6) } else { go(6, 4) }
          return
        }
        if (this.currentStep === 5) { go(6, 7); return } // 5（输出）-> 6
        // 线性推进
        const from = this.currentStep
        const to = this.currentStep + 1
        let edge: number | null = null
        if (from === 0 && to === 1) edge = 0
        else if (from === 1 && to === 2) edge = 1
        else if (from === 2 && to === 3) edge = 2
        else if (from === 3 && to === 4) edge = 3
        if (!this.canNext) return
        go(to, edge)
      } else {
        // 增强版本的流程控制（参考V2版本）
        if (this.currentStep === 7) { go(2, 9); return } // 7 -> 回环到 2 (edge 9: tu1回到cond1)
        if (this.currentStep === 2 && this.cond1FalsePending) { this.cond1FalsePending = false; go(8, 10); return } // 2 -> 8 (edge 10: cond1否到cond3)
        if (this.currentStep === 4) { // 4 条件判断后的分支
          const last = this.rows[this.rows.length - 1]
          if (last && last.ok) { go(5, 4) } else { go(7, 8) } // edge 4: cond2是到setjie, edge 8: cond2否到tu1
          return
        }
        if (this.currentStep === 5) { go(6, 5); return } // 5 -> 6 (edge 5: setjie到outok)
        if (this.currentStep === 6) { go(7, 7); return } // 6 -> 7 (edge 7: outok到tu1)
        if (this.currentStep === 8) { // 8 判断jie==0?
          const varName = this.codeInfo.varName
          const last = this.rows[this.rows.length - 1]
          const varValue = last ? last[varName] : null
          const needsNoSolution = this.codeInfo.isBool 
            ? (varValue === false || varValue === 'False')
            : (varValue === 0 || varValue === '0')
          if (needsNoSolution) { go(9, 11) } else { go(10, 12) } // edge 11: cond3是到outno, edge 12: cond3否到end
          return
        }
        if (this.currentStep === 9) { go(10, 6); return } // 9 -> 10 (edge 6: outno到end，但此边在增强版被合并到edge 12的路径中)
        // 线性推进
        const from = this.currentStep
        const to = this.currentStep + 1
        let edge: number | null = null
        if (from === 0 && to === 1) edge = 0      // start -> tu0
        else if (from === 1 && to === 2) edge = 1 // tu0 -> cond1
        else if (from === 2 && to === 3) edge = 2 // cond1是 -> ji
        else if (from === 3 && to === 4) edge = 3 // ji -> cond2
        if (!this.canNext) return
        go(to, edge)
      }
    },
    playToggle() {
      if (!this.canPlay) return
      // 清除刚切换到增强版的标记
      this.justSwitchedToEnhanced = false
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
      
      if (!this.codeInfo.hasNoSolution) {
        // 基础版本的执行逻辑
        switch (this.currentStep) {
          case 1: { // tu ← 0
            this.tu = 0
            this.rows.push({ tu: this.tu, ji: null, ok: null, output: '' })
            break
          }
          case 2: { // 判断 tu < heads+1?
            const tu = this.tu ?? 0
            const cond = tu < heads + 1
            if (!cond) {
              this.cond1FalsePending = true
              const last = this.rows[this.rows.length - 1]
              if (last) {
                last.ji = 0
                last.ok = false
              }
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
          case 4: { // 判断 ji×2 + tu×4 == legs?
            const tu = this.tu ?? 0
            const ji = this.ji ?? (heads - tu)
            const ok = ji * 2 + tu * 4 === legs
            const last = this.rows[this.rows.length - 1]
            if (last) last.ok = ok
            break
          }
          case 5: { // 输出（仅命中时）
            const last = this.rows[this.rows.length - 1]
            if (last && last.ok && this.ji != null && this.tu != null) {
              last.output = `${this.ji}只鸡, ${this.tu}只兔`
            }
            break
          }
          case 6: { // tu ← tu + 1
            const tu = (this.tu ?? 0) + 1
            this.tu = tu
            this.rows.push({ tu: this.tu, ji: null, ok: null, output: '' })
            break
          }
        }
      } else {
        // 增强版本的执行逻辑
        const varName = this.codeInfo.varName
        switch (this.currentStep) {
          case 1: { // tu ← 0, jie ← 0
            this.tu = 0
            const initValue = this.codeInfo.isBool ? false : 0
            this.rows.push({ 
              tu: this.tu, 
              ji: null, 
              ok: null, 
              output: '',
              [varName]: initValue
            })
            break
          }
          case 2: { // 判断 tu < heads+1?
            const tu = this.tu ?? 0
            const cond = tu < heads + 1
            if (!cond) {
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
          case 4: { // 判断 ji×2 + tu×4 == legs?
            const tu = this.tu ?? 0
            const ji = this.ji ?? (heads - tu)
            const ok = ji * 2 + tu * 4 === legs
            const last = this.rows[this.rows.length - 1]
            if (last) last.ok = ok
            break
          }
          case 5: { // 输出（仅命中时）
            const last = this.rows[this.rows.length - 1]
            if (last && last.ok && this.ji != null && this.tu != null) {
              last.output = `${this.ji}只鸡, ${this.tu}只兔`
            }
            break
          }
          case 6: { // jie ← 1
            const last = this.rows[this.rows.length - 1]
            if (last) {
              const successValue = this.codeInfo.isBool ? true : 1
              last[varName] = successValue
            }
            break
          }
          case 7: { // tu ← tu + 1
            const tu = (this.tu ?? 0) + 1
            this.tu = tu
            const last = this.rows[this.rows.length - 1]
            const currentVarValue = last ? last[varName] : (this.codeInfo.isBool ? false : 0)
            this.rows.push({ 
              tu: this.tu, 
              ji: null, 
              ok: null, 
              output: '',
              [varName]: currentVarValue
            })
            break
          }
          case 8: { // jie == 0? (只是判断，不做具体操作)
            break
          }
          case 9: { // 输出"此题无解"
            const last = this.rows[this.rows.length - 1]
            if (last) {
              last.output = this.codeInfo.noSolutionText || '此题无解'
            }
            break
          }
        }
      }
    }
  }
})
