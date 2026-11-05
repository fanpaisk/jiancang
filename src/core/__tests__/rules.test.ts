import { describe, expect, it } from 'vitest'
import { computeSellPlan, weightAfterSell } from '../plan'
import { summarize } from '../position'
import { defaultRules, evaluateRules, type RuleContext } from '../rules'
import type { Position, RuleParams } from '../types'

const basePos: Position = {
  shares: 1000,
  costPerShare: 1,
  nav: 1.2,
  holdDays: 100,
  marketValue: 1200,
  cost: 1000,
  pnl: 200,
  returnRate: 0.2,
}

function makeCtx(over: Partial<Position> = {}, extra: Partial<RuleContext> = {}): RuleContext {
  return {
    pos: { ...basePos, ...over },
    currentWeight: null,
    peakNav: null,
    ...extra,
  }
}

/** 只启用一条规则，其余关闭 */
function only<K extends keyof RuleParams>(key: K, value: RuleParams[K]): RuleParams {
  const off: RuleParams = {
    targetWeight: { enabled: false, weight: 0.2 },
    takeProfit: { enabled: false, targetRate: 0.2, reducePct: 1 / 3 },
    trailingStop: { enabled: false, drawdown: 0.1, reducePct: 0.5 },
    recoverPrincipal: { enabled: false },
    stopLoss: { enabled: false, lossRate: 0.3, reducePct: 1 / 3 },
  }
  return { ...off, [key]: value }
}

function pick(results: ReturnType<typeof evaluateRules>, id: string) {
  const hit = results.find((r) => r.id === id)
  if (!hit) throw new Error(`rule ${id} missing`)
  return hit
}

describe('目标仓位', () => {
  it('占比 30% 对目标 20%：减 41.67%（不是 33.3%）', () => {
    const r = pick(
      evaluateRules(makeCtx({}, { currentWeight: 0.3 }), only('targetWeight', { enabled: true, weight: 0.2 })),
      'targetWeight',
    )
    expect(r.triggered).toBe(true)
    expect(r.reducePct).toBeCloseTo(5 / 12, 10)
  })

  it('卖出后占比必须精确回到目标，而不是「差不多」', () => {
    const pos = summarize(1000, 1, 1.2, 100) // 市值 1200，成本 1000
    const w = 0.3
    const target = 0.2
    const r = pick(
      evaluateRules(
        { pos, currentWeight: w, peakNav: null },
        only('targetWeight', { enabled: true, weight: target }),
      ),
      'targetWeight',
    )
    const plan = computeSellPlan(pos, r.reducePct, 0)
    const portfolioValue = pos.marketValue / w // 4000
    expect(weightAfterSell(plan, portfolioValue)).toBeCloseTo(target, 10)
  })

  it('目标占比取 100% 时不会除以零，也不会要求卖超过全部份额', () => {
    const r = pick(
      evaluateRules(makeCtx({}, { currentWeight: 0.3 }), only('targetWeight', { enabled: true, weight: 1 })),
      'targetWeight',
    )
    expect(Number.isFinite(r.reducePct)).toBe(true)
    expect(r.reducePct).toBeLessThanOrEqual(1)
  })

  it('占比 18% 对目标 20%：不触发', () => {
    const r = pick(
      evaluateRules(makeCtx({}, { currentWeight: 0.18 }), only('targetWeight', { enabled: true, weight: 0.2 })),
      'targetWeight',
    )
    expect(r.triggered).toBe(false)
    expect(r.reducePct).toBe(0)
    expect(r.gap).toBeCloseTo(0.02, 10)
  })

  it('占比未知时给出待填提示而不是瞎算', () => {
    const r = pick(
      evaluateRules(makeCtx(), only('targetWeight', { enabled: true, weight: 0.2 })),
      'targetWeight',
    )
    expect(r.triggered).toBe(false)
    expect(r.gap).toBeNull()
    expect(r.gapLabel).toContain('填写')
  })
})

describe('目标止盈', () => {
  it('收益率正好等于目标即触发', () => {
    const r = pick(
      evaluateRules(makeCtx({ returnRate: 0.2 }), only('takeProfit', { enabled: true, targetRate: 0.2, reducePct: 0.5 })),
      'takeProfit',
    )
    expect(r.triggered).toBe(true)
    expect(r.reducePct).toBeCloseTo(0.5, 10)
  })

  it('未达标时给出差距', () => {
    const r = pick(
      evaluateRules(makeCtx({ returnRate: -0.3142 }), only('takeProfit', { enabled: true, targetRate: 0.2, reducePct: 0.5 })),
      'takeProfit',
    )
    expect(r.triggered).toBe(false)
    expect(r.gap).toBeCloseTo(0.5142, 10)
    expect(r.gapLabel).toContain('还差')
  })
})

describe('回撤止盈', () => {
  it('峰值 1.5、现价 1.2：回撤 20%，超过 10% 阈值 → 触发', () => {
    const r = pick(
      evaluateRules(
        makeCtx({ nav: 1.2, marketValue: 1200 }, { peakNav: 1.5 }),
        only('trailingStop', { enabled: true, drawdown: 0.1, reducePct: 0.5 }),
      ),
      'trailingStop',
    )
    expect(r.triggered).toBe(true)
    expect(r.reducePct).toBeCloseTo(0.5, 10)
  })

  it('回撤正好等于阈值也算触发', () => {
    const r = pick(
      evaluateRules(
        makeCtx({ nav: 1.35, marketValue: 1350 }, { peakNav: 1.5 }),
        only('trailingStop', { enabled: true, drawdown: 0.1, reducePct: 0.5 }),
      ),
      'trailingStop',
    )
    expect(r.triggered).toBe(true)
    expect(r.reducePct).toBeCloseTo(0.5, 10)
  })

  it('未填峰值时待填，不误判', () => {
    const r = pick(
      evaluateRules(makeCtx(), only('trailingStop', { enabled: true, drawdown: 0.1, reducePct: 0.5 })),
      'trailingStop',
    )
    expect(r.triggered).toBe(false)
    expect(r.gap).toBeNull()
  })
})

describe('收回本金', () => {
  it('收益率 +50%：卖 66.67% 收回全部本金', () => {
    const r = pick(
      evaluateRules(
        makeCtx({ returnRate: 0.5, cost: 2000, marketValue: 3000 }),
        only('recoverPrincipal', { enabled: true }),
      ),
      'recoverPrincipal',
    )
    expect(r.triggered).toBe(true)
    expect(r.reducePct).toBeCloseTo(2 / 3, 10)
  })

  it('亏损时不触发', () => {
    const r = pick(
      evaluateRules(
        makeCtx({ returnRate: -0.2, cost: 1500, marketValue: 1200 }),
        only('recoverPrincipal', { enabled: true }),
      ),
      'recoverPrincipal',
    )
    expect(r.triggered).toBe(false)
  })
})

describe('止损线', () => {
  it('亏损 30% 正好触及止损线即触发', () => {
    const r = pick(
      evaluateRules(makeCtx({ returnRate: -0.3 }), only('stopLoss', { enabled: true, lossRate: 0.3, reducePct: 0.5 })),
      'stopLoss',
    )
    expect(r.triggered).toBe(true)
  })

  it('亏损 10% 时给出距离止损线的距离', () => {
    const r = pick(
      evaluateRules(makeCtx({ returnRate: -0.1 }), only('stopLoss', { enabled: true, lossRate: 0.3, reducePct: 0.5 })),
      'stopLoss',
    )
    expect(r.triggered).toBe(false)
    expect(r.gap).toBeCloseTo(0.2, 10)
  })
})

describe('默认规则集', () => {
  it('默认开启目标仓位、目标止盈、回撤止盈', () => {
    expect(defaultRules.targetWeight.enabled).toBe(true)
    expect(defaultRules.takeProfit.enabled).toBe(true)
    expect(defaultRules.trailingStop.enabled).toBe(true)
  })

  it('默认关闭止损与收回本金（不替用户做激进决定）', () => {
    expect(defaultRules.stopLoss.enabled).toBe(false)
    expect(defaultRules.recoverPrincipal.enabled).toBe(false)
  })

  it('返回固定五条规则，顺序稳定', () => {
    const results = evaluateRules(makeCtx(), defaultRules)
    expect(results.map((r) => r.id)).toEqual([
      'targetWeight',
      'takeProfit',
      'trailingStop',
      'recoverPrincipal',
      'stopLoss',
    ])
  })
})
