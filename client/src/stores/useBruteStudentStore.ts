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

export interface BruteStateStudent {
  // 是否已接收教师下发的内容
  hasContent: boolean
  // 代码相关
  code: string
  codeInfo: CodeInfo
  // 算法参数
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
  justSwitchedToEnhanced: boolean  // 标记是否刚从基础版切换到增强版
}

export const useBruteStudentStore = defineStore('brute-student', {
  state: (): BruteStateStudent => ({
    hasContent: false,
    code: '',
    codeInfo: {
      hasNoSolution: false,
      varName: 'jie',
      isBool: false,
      defaultValue: '0',
      successValue: '1',
      checkExpression: 'jie == 0',
      noSolutionText: '此题无解'
    },
    totalHeads: null,
    totalLegs: null,
    tu: null,
    ji: null,
    rows: [],
    steps: ['开始','tu ← 0','tu < heads+1?','ji ← heads - tu','ji×2 + tu×4 == legs?','输出 ji, tu','tu ← tu + 1','结束'],
    currentStep: 0,
    playing: false,
    error: null,
    cond1FalsePending: false,
    activeEdge: null,
    justSwitchedToEnhanced: false
  }),
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
    // 接收教师下发的内容
    receiveFromTeacher(data: { code: string; codeInfo: CodeInfo; totalHeads: number; totalLegs: number }) {
      // 检测是否从基础版切换到增强版
      const wasBasic = !this.codeInfo.hasNoSolution
      const isEnhanced = data.codeInfo.hasNoSolution
      
      this.hasContent = true
      this.code = data.code
      this.codeInfo = data.codeInfo
      this.totalHeads = data.totalHeads
      this.totalLegs = data.totalLegs
      this.steps = this.dynamicSteps
      this.resetRuntime()
      
      // 在 resetRuntime 之后设置高亮状态
      // 只在从基础版切换到增强版时高亮
      if (wasBasic && isEnhanced) {
        this.justSwitchedToEnhanced = true
      }
    },
    
    // 清空内容
    clearContent() {
      this.hasContent = false
      this.code = ''
      this.codeInfo = {
        hasNoSolution: false,
        varName: 'jie',
        isBool: false,
        defaultValue: '0',
        successValue: '1',
        checkExpression: 'jie == 0'
      }
      this.totalHeads = null
      this.totalLegs = null
      this.steps = ['开始','tu ← 0','tu < heads+1?','ji ← heads - tu','ji×2 + tu×4 == legs?','输出 ji, tu','tu ← tu + 1','结束']
      this.resetRuntime()
      this.justSwitchedToEnhanced = false
    },
    
    setInput(heads: number, legs: number) {
      this.totalHeads = heads
      this.totalLegs = legs
      this.resetRuntime()
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
          if (last && last.ok) go(5, 1) // 命中 -> 5
          else go(6, 4) // 未命中 -> 6
          return
        }
        if (this.currentStep === 5) { go(6, 2); return } // 5 -> 6
        if (this.currentStep < 7) { go(this.currentStep + 1, null); return }
      } else {
        // 增强版本的流程控制（带无解判断）
        if (this.currentStep === 7) { go(2, 9); return } // 7 -> 回环到 2 (edge 9)
        if (this.currentStep === 2 && this.cond1FalsePending) { 
          this.cond1FalsePending = false; 
          go(8, 10); return 
        } // 2 -> 8（jie==0?）(edge 10)
        if (this.currentStep === 8) { // 8 jie==0? 后的分支
          const varName = this.codeInfo.varName
          const last = this.rows[this.rows.length - 1]
          const varValue = last ? last[varName] : null
          
          // 判断是否需要输出"无解"
          let needsNoSolution = false
          if (this.codeInfo.isBool) {
            // 布尔变量：只有当值为false时才需要输出无解
            needsNoSolution = varValue === false || varValue === 'False' || varValue === 0 || varValue === '0'
          } else {
            // 数字变量：只有当值为0时才需要输出无解
            needsNoSolution = varValue === 0 || varValue === '0'
          }
          
          if (needsNoSolution) go(9, 11) // 是 -> 9 输出无解 (edge 11)
          else go(10, 12) // 否 -> 10 结束 (edge 12)
          return
        }
        if (this.currentStep === 9) { go(10, 13); return } // 9 -> 10 (edge 13)
        if (this.currentStep === 4) { // 4 条件判断后的分支
          const last = this.rows[this.rows.length - 1]
          if (last && last.ok) go(5, 4) // 命中 -> 5 (edge 4: cond2是到outok)
          else go(7, 8) // 未命中 -> 7 (edge 8: cond2否到tu1)
          return
        }
        if (this.currentStep === 5) { go(6, 5); return } // 5(输出) -> 6(设置jie) (edge 5)
        if (this.currentStep === 6) { go(7, 6); return } // 6 -> 7 (edge 6: setjie到tu1)
        
        // 线性推进
        const from = this.currentStep
        const to = this.currentStep + 1
        let edge: number | null = null
        if (from === 0 && to === 1) edge = 0      // start -> tu0
        else if (from === 1 && to === 2) edge = 1 // tu0 -> cond1
        else if (from === 2 && to === 3) edge = 2 // cond1是 -> ji
        else if (from === 3 && to === 4) edge = 3 // ji -> cond2
        if (this.currentStep < 10) { go(to, edge); return }
      }
    },
    
    // 评估检查表达式（用于判断是否输出"无解"）
    evaluateCheckExpression(varValue: any): boolean {
      if (this.codeInfo.isBool) {
        // 布尔变量
        // 检查是否需要输出"无解"
        // 当找到解时，varValue为true，应该返回false（不输出无解）
        // 当未找到解时，varValue为false，应该返回true（输出无解）
        if (this.codeInfo.checkExpression.includes('not')) {
          // 表达式如 "not has_solution"
          return !varValue
        } else if (this.codeInfo.checkExpression.includes('False')) {
          // 表达式如 "has_solution == False"
          return varValue === false || varValue === 'False'
        } else {
          // 默认：检查变量是否为假
          return !varValue
        }
      } else {
        // 数字变量（如 jie == 0）
        return varValue === 0 || varValue === '0'
      }
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
    },
    
    playToggle() {
      // 清除刚切换到增强版的标记
      this.justSwitchedToEnhanced = false
      this.playing = !this.playing
      if (this.playing) this.autoPlay()
    },
    
    async autoPlay() {
      while (this.playing && this.currentStep < this.steps.length - 1) {
        this.nextStep()
        await new Promise(r => setTimeout(r, 300))
      }
      this.playing = false
    }
  }
})
