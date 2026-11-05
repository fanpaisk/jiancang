import { describe, expect, it } from 'vitest'
import { recommend } from '../recommend'
import type { RuleResult } from '../types'

function rule(over: Partial<RuleResult>): RuleResult {
  return {
    id: 'takeProfit',
    label: '目标止盈',
    enabled: true,
    triggered: false,
    reducePct: 0,
    formula: '',
    detail: '',
    gap: null,
    gapLabel: '',
    ...over,
  }
}

describe('recommend · 无触发', () => {
  it('全部未触发时推荐 0%，且 hasSignal 为 false', () => {
    const rec = recommend([rule({ gap: 0.3, gapLabel: '还差 30%' })])
    expect(rec.hasSignal).toBe(false)
    expect(rec.recommendedPct).toBe(0)
    expect(rec.triggered).toHaveLength(0)
  })

  it('给出距离最近的一条规则，便于提示「还差多少」', () => {
    const rec = recommend([
      rule({ id: 'takeProfit', gap: 0.5 }),
      rule({ id: 'stopLoss', gap: 0.1 }),
      rule({ id: 'targetWeight', gap: 0.3 }),
    ])
    expect(rec.nearest?.id).toBe('stopLoss')
  })

  it('未启用的规则不参与「最近」的挑选', () => {
    const rec = recommend([
      rule({ id: 'takeProfit', enabled: false, gap: 0.01 }),
      rule({ id: 'stopLoss', gap: 0.2 }),
    ])
    expect(rec.nearest?.id).toBe('stopLoss')
  })
})

describe('recommend · 中位数', () => {
  it('单条触发：推荐值即该条', () => {
    const rec = recommend([rule({ triggered: true, reducePct: 0.5, gap: 0 })])
    expect(rec.hasSignal).toBe(true)
    expect(rec.recommendedPct).toBeCloseTo(0.5, 10)
    expect(rec.minPct).toBeCloseTo(0.5, 10)
    expect(rec.maxPct).toBeCloseTo(0.5, 10)
  })

  it('两条触发：取平均作为中位数', () => {
    const rec = recommend([
      rule({ triggered: true, reducePct: 1 / 3, gap: 0 }),
      rule({ id: 'trailingStop', triggered: true, reducePct: 0.5, gap: 0 }),
    ])
    expect(rec.recommendedPct).toBeCloseTo((1 / 3 + 0.5) / 2, 10)
    expect(rec.minPct).toBeCloseTo(1 / 3, 10)
    expect(rec.maxPct).toBeCloseTo(0.5, 10)
  })

  it('三条触发：取中间值，不被极端值带偏', () => {
    const rec = recommend([
      rule({ triggered: true, reducePct: 0.1, gap: 0 }),
      rule({ id: 'trailingStop', triggered: true, reducePct: 0.3, gap: 0 }),
      rule({ id: 'stopLoss', triggered: true, reducePct: 0.9, gap: 0 }),
    ])
    expect(rec.recommendedPct).toBeCloseTo(0.3, 10)
  })

  it('触发但建议比例为 0 的规则被忽略（避免污染中位数）', () => {
    const rec = recommend([
      rule({ triggered: true, reducePct: 0, gap: 0 }),
      rule({ id: 'trailingStop', triggered: true, reducePct: 0.4, gap: 0 }),
    ])
    expect(rec.recommendedPct).toBeCloseTo(0.4, 10)
  })
})
