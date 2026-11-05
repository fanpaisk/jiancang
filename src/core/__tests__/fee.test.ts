import { describe, expect, it } from 'vitest'
import { resolveFee } from '../fee'

describe('resolveFee · A 类档位边界', () => {
  it('持有 0 天：7 天以内的 1.5%', () => {
    const f = resolveFee('A', 0)
    expect(f.rate).toBeCloseTo(0.015, 6)
    expect(f.daysToNextTier).toBe(7)
  })

  it('持有 6 天：仍在 1.5%，还差 1 天跳档', () => {
    const f = resolveFee('A', 6)
    expect(f.rate).toBeCloseTo(0.015, 6)
    expect(f.daysToNextTier).toBe(1)
  })

  it('持有 7 天：进入 7–30 天档，0.75%', () => {
    const f = resolveFee('A', 7)
    expect(f.rate).toBeCloseTo(0.0075, 6)
    expect(f.tier.minDays).toBe(7)
  })

  it('持有 29 天：仍是 0.75%', () => {
    expect(resolveFee('A', 29).rate).toBeCloseTo(0.0075, 6)
  })

  it('持有 30 天：进入 30–365 天档，0.5%', () => {
    expect(resolveFee('A', 30).rate).toBeCloseTo(0.005, 6)
  })

  it('持有 364 天：仍是 0.5%', () => {
    expect(resolveFee('A', 364).rate).toBeCloseTo(0.005, 6)
  })

  it('持有 365 天：进入 365–730 天档，0.25%', () => {
    const f = resolveFee('A', 365)
    expect(f.rate).toBeCloseTo(0.0025, 6)
    expect(f.daysToNextTier).toBe(365)
  })

  it('持有 729 天：仍是 0.25%', () => {
    expect(resolveFee('A', 729).rate).toBeCloseTo(0.0025, 6)
  })

  it('持有 730 天：归零，且没有下一档', () => {
    const f = resolveFee('A', 730)
    expect(f.rate).toBe(0)
    expect(f.nextTier).toBeNull()
    expect(f.daysToNextTier).toBeNull()
  })
})

describe('resolveFee · C 类档位边界', () => {
  it('持有 6 天：1.5%', () => {
    expect(resolveFee('C', 6).rate).toBeCloseTo(0.015, 6)
  })

  it('持有 7 天：降到 0.5%', () => {
    const f = resolveFee('C', 7)
    expect(f.rate).toBeCloseTo(0.005, 6)
    expect(f.daysToNextTier).toBe(23)
  })

  it('持有 30 天：归零', () => {
    const f = resolveFee('C', 30)
    expect(f.rate).toBe(0)
    expect(f.nextTier).toBeNull()
  })

  it('截图案例：C 类持有 107 天，费率 0', () => {
    const f = resolveFee('C', 107)
    expect(f.rate).toBe(0)
    expect(f.isEstimate).toBe(true)
    expect(f.nextTier).toBeNull()
  })
})

describe('resolveFee · 用户覆盖', () => {
  it('手填费率优先于估算表', () => {
    const f = resolveFee('A', 107, 0.003)
    expect(f.rate).toBeCloseTo(0.003, 6)
    expect(f.isOverride).toBe(true)
    expect(f.isEstimate).toBe(false)
  })

  it('覆盖为 0 也是有效输入（C 类常见）', () => {
    const f = resolveFee('A', 10, 0)
    expect(f.rate).toBe(0)
    expect(f.isOverride).toBe(true)
  })

  it('传 null 时回退到估算', () => {
    const f = resolveFee('A', 10, null)
    expect(f.isOverride).toBe(false)
    expect(f.rate).toBeCloseTo(0.0075, 6)
  })

  it('非法负数被忽略，回退估算', () => {
    const f = resolveFee('A', 10, -1)
    expect(f.isOverride).toBe(false)
    expect(f.rate).toBeCloseTo(0.0075, 6)
  })
})

describe('resolveFee · 异常输入兜底', () => {
  it('负天数按 0 天处理', () => {
    expect(resolveFee('A', -5).rate).toBeCloseTo(0.015, 6)
  })

  it('NaN 按 0 天处理', () => {
    expect(resolveFee('C', Number.NaN).rate).toBeCloseTo(0.015, 6)
  })
})
