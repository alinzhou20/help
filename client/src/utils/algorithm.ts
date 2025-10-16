export interface CalcResult {
  rabbits: number | null
  chickens: number | null
  valid: boolean
  message: string | null
}

export function calculate(heads: number, legs: number): CalcResult {
  // 输入合法性
  if (!Number.isInteger(heads) || !Number.isInteger(legs)) {
    return { rabbits: null, chickens: null, valid: false, message: '请输入整数' }
  }
  if (heads < 0 || legs < 0) {
    return { rabbits: null, chickens: null, valid: false, message: '头数和脚数必须为非负' }
  }
  if (legs % 2 !== 0) {
    return { rabbits: null, chickens: null, valid: false, message: '脚数必须为偶数' }
  }
  if (legs < heads * 2) {
    return { rabbits: null, chickens: null, valid: false, message: '脚数不可能少于 2×头数' }
  }
  if (legs > heads * 4) {
    return { rabbits: null, chickens: null, valid: false, message: '脚数不可能多于 4×头数' }
  }

  // 兔子数量 = (总脚数 - 2 * 总头数) / 2
  const rabbits = (legs - 2 * heads) / 2
  const chickens = heads - rabbits

  if (!Number.isInteger(rabbits) || rabbits < 0 || chickens < 0) {
    return { rabbits: null, chickens: null, valid: false, message: '无整数解，请检查输入' }
  }

  return { rabbits, chickens, valid: true, message: null }
}
