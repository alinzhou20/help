import { describe, it, expect } from 'vitest'
import { calculate } from '@/utils/algorithm'

describe('calculate()', () => {
  it('works for valid heads/legs', () => {
    const res = calculate(10, 28)
    expect(res.valid).toBe(true)
    expect(res.rabbits).toBe(4)
    expect(res.chickens).toBe(6)
  })

  it('rejects odd legs', () => {
    const res = calculate(3, 5)
    expect(res.valid).toBe(false)
  })

  it('rejects legs too small', () => {
    const res = calculate(5, 6)
    expect(res.valid).toBe(false)
  })

  it('rejects legs too big', () => {
    const res = calculate(5, 30)
    expect(res.valid).toBe(false)
  })
})
