import { describe, expect, it } from 'vitest'
import { computeSellPlan, weightAfterSell } from '../plan'
import { summarize } from '../position'

const pos = summarize(1000, 2, 3, 100) // 市值 3000，成本 2000，收益率 +50%

describe('computeSellPlan · 精确拆分', () => {
  const plan = computeSellPlan(pos, 0.3, 0.005)

  it('卖出份额 = 总份额 × 比例', () => {
    expect(plan.sellShares).toBeCloseTo(300, 10)
  })

  it('卖出金额 = 份额 × 净值', () => {
    expect(plan.sellAmount).toBeCloseTo(900, 10)
  })

  it('赎回费 = 金额 × 费率', () => {
    expect(plan.fee).toBeCloseTo(4.5, 10)
  })

  it('净到手 = 金额 − 费用', () => {
    expect(plan.netProceeds).toBeCloseTo(895.5, 10)
  })

  it('实现盈亏按单位成本与实际净值之差计算', () => {
    expect(plan.realizedPnl).toBeCloseTo(300, 10)
  })

  it('剩余份额与剩余成本正确', () => {
    expect(plan.remainingShares).toBeCloseTo(700, 10)
    expect(plan.remainingCost).toBeCloseTo(1400, 10)
    expect(plan.remainingMarketValue).toBeCloseTo(2100, 10)
  })
})

describe('computeSellPlan · 边界', () => {
  it('减 0%：费用与实现盈亏都是 0，份额不变', () => {
    const p = computeSellPlan(pos, 0, 0.005)
    expect(p.sellShares).toBe(0)
    expect(p.fee).toBe(0)
    expect(p.realizedPnl).toBe(0)
    expect(p.remainingShares).toBeCloseTo(1000, 10)
  })

  it('减 100%：清仓，剩余全为 0', () => {
    const p = computeSellPlan(pos, 1, 0.005)
    expect(p.sellShares).toBeCloseTo(1000, 10)
    expect(p.remainingShares).toBeCloseTo(0, 10)
    expect(p.remainingMarketValue).toBeCloseTo(0, 10)
  })

  it('比例超过 1 被截断', () => {
    expect(computeSellPlan(pos, 1.5, 0.005).sellPct).toBe(1)
  })

  it('负比例被截断为 0', () => {
    expect(computeSellPlan(pos, -0.3, 0.005).sellPct).toBe(0)
  })

  it('零费率时净到手等于卖出金额', () => {
    const p = computeSellPlan(pos, 1 / 3, 0)
    expect(p.fee).toBe(0)
    expect(p.netProceeds).toBeCloseTo(p.sellAmount, 10)
  })

  it('亏损持仓的实现盈亏为负', () => {
    const losing = summarize(1000, 3, 2, 100)
    const p = computeSellPlan(losing, 0.5, 0)
    expect(p.realizedPnl).toBeCloseTo(-500, 10)
  })
})

describe('weightAfterSell', () => {
  it('卖出后剩余仓位占比按「组合市值 − 卖出金额」重算', () => {
    const plan = computeSellPlan(pos, 0.3, 0)
    const w = weightAfterSell(plan, 5000)
    expect(w).toBeCloseTo(2100 / 4100, 10)
  })

  it('组合市值为 0 时返回 null', () => {
    const plan = computeSellPlan(pos, 0.3, 0)
    expect(weightAfterSell(plan, 0)).toBeNull()
  })
})
