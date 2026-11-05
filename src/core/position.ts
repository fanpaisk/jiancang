import type { Position } from './types'

/** 把四项原始输入汇总成持仓快照。所有派生字段都是纯计算，不做四舍五入。 */
export function summarize(
  shares: number,
  costPerShare: number,
  nav: number,
  holdDays: number,
): Position {
  const s = Number.isFinite(shares) && shares > 0 ? shares : 0
  const c = Number.isFinite(costPerShare) && costPerShare > 0 ? costPerShare : 0
  const n = Number.isFinite(nav) && nav > 0 ? nav : 0
  const d = Number.isFinite(holdDays) && holdDays > 0 ? holdDays : 0

  const marketValue = s * n
  const cost = s * c
  const pnl = marketValue - cost
  const returnRate = cost > 0 ? pnl / cost : 0

  return {
    shares: s,
    costPerShare: c,
    nav: n,
    holdDays: d,
    marketValue,
    cost,
    pnl,
    returnRate,
  }
}

/** 由「持有金额 ÷ 份额」反推净值，用于只有金额没有净值的场景 */
export function navFromAmount(amount: number, shares: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(shares) || shares <= 0) return 0
  return amount / shares
}
