import { describe, expect, it } from 'vitest'
import { navFromAmount, summarize } from '../position'

describe('summarize · 截图真实数据', () => {
  // 嘉实上证科创板芯片ETF联接C (017470)：金额 1209.70，份额 591.28，成本 2.9833
  const nav = navFromAmount(1209.7, 591.28)
  const pos = summarize(591.28, 2.9833, nav, 107)

  it('由金额反推的净值约等于 2.0459', () => {
    expect(nav).toBeCloseTo(2.0459, 4)
  })

  it('市值等于持有金额', () => {
    expect(pos.marketValue).toBeCloseTo(1209.7, 6)
  })

  it('成本约 1763.97', () => {
    expect(pos.cost).toBeCloseTo(1763.97, 2)
  })

  it('浮亏约 −554.27', () => {
    expect(pos.pnl).toBeCloseTo(-554.27, 2)
  })

  it('收益率约 −31.42%', () => {
    expect(pos.returnRate).toBeCloseTo(-0.3142, 4)
  })
})

describe('summarize · 边界与异常', () => {
  it('份额为 0 时不产生 NaN', () => {
    const p = summarize(0, 2, 3, 10)
    expect(p.marketValue).toBe(0)
    expect(p.returnRate).toBe(0)
    expect(Number.isNaN(p.pnl)).toBe(false)
  })

  it('成本为 0 时收益率为 0 而不是 Infinity', () => {
    expect(summarize(100, 0, 2, 10).returnRate).toBe(0)
  })

  it('负份额被截断为 0', () => {
    expect(summarize(-100, 1, 1, 10).shares).toBe(0)
  })

  it('负持有天数被截断为 0', () => {
    expect(summarize(100, 1, 1, -10).holdDays).toBe(0)
  })

  it('浮点噪音场景：1000 份 × 2.5 成本不能出现 0.30000000004', () => {
    const p = summarize(1000, 2.5, 3, 10)
    expect(p.pnl).toBeCloseTo(500, 10)
  })
})

describe('navFromAmount', () => {
  it('份额为 0 时返回 0', () => {
    expect(navFromAmount(100, 0)).toBe(0)
  })

  it('金额为 0 时返回 0', () => {
    expect(navFromAmount(0, 100)).toBe(0)
  })

  it('正常反推', () => {
    expect(navFromAmount(1209.7, 591.28)).toBeCloseTo(2.0459, 4)
  })
})
