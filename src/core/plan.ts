import type { Position, SellPlan } from './types'
import { clamp } from './util'

/**
 * 单笔卖出试算。
 * 注意：这里不处理「先进先出」，因为费率由用户从平台抄来（或由持有天数估算），
 * 已经隐含了平台算好的分档结果。见 README「为什么不做账本」。
 */
export function computeSellPlan(
  pos: Position,
  sellPct: number,
  feeRate: number,
): SellPlan {
  const pct = clamp(sellPct, 0, 1)
  const rate = clamp(feeRate, 0, 1)

  const sellShares = pos.shares * pct
  const sellAmount = sellShares * pos.nav
  const fee = sellAmount * rate
  const realizedPnl = sellShares * (pos.nav - pos.costPerShare)
  const remainingShares = pos.shares - sellShares

  return {
    sellPct: pct,
    sellShares,
    sellAmount,
    feeRate: rate,
    fee,
    netProceeds: sellAmount - fee,
    realizedPnl,
    remainingShares,
    remainingCost: remainingShares * pos.costPerShare,
    remainingMarketValue: remainingShares * pos.nav,
  }
}

/** 卖出后剩余仓位占总市值的比例（用于「减到目标仓位」的反馈） */
export function weightAfterSell(plan: SellPlan, portfolioValue: number): number | null {
  if (!Number.isFinite(portfolioValue) || portfolioValue <= 0) return null
  const after = portfolioValue - plan.sellAmount
  if (after <= 0) return 0
  return plan.remainingMarketValue / after
}
