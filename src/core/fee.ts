import type { FeeInfo, FeeTier, ShareClass } from './types'

/**
 * 内置费率表 —— 只是「估算默认值」，不是权威数据。
 *
 * 真实费率因基金合同而异（尤其 C 类：有的 7 天后为 0，有的 30 天后为 0）。
 * 产品上永远允许用户用「平台卖出页显示的费率」覆盖，并在 UI 上标注「估算」。
 * 默认值刻意偏保守（宁可高估费用，也不要让用户被意外扣费）。
 */

/** A 类：前端收费，持有越久赎回费越低 */
export const A_TIERS: FeeTier[] = [
  { minDays: 0, maxDays: 7, rate: 0.015 },
  { minDays: 7, maxDays: 30, rate: 0.0075 },
  { minDays: 30, maxDays: 365, rate: 0.005 },
  { minDays: 365, maxDays: 730, rate: 0.0025 },
  { minDays: 730, maxDays: null, rate: 0 },
]

/** C 类：无申购费，赎回费通常 7 天后大降、30 天后归零 */
export const C_TIERS: FeeTier[] = [
  { minDays: 0, maxDays: 7, rate: 0.015 },
  { minDays: 7, maxDays: 30, rate: 0.005 },
  { minDays: 30, maxDays: null, rate: 0 },
]

export function tiersOf(shareClass: ShareClass): FeeTier[] {
  return shareClass === 'C' ? C_TIERS : A_TIERS
}

function findTier(tiers: FeeTier[], days: number): FeeTier {
  const hit = tiers.find(
    (t) => days >= t.minDays && (t.maxDays === null || days < t.maxDays),
  )
  // days 为负数或 NaN 时兜底到第一档
  return hit ?? tiers[0]
}

export function tierLabel(tier: FeeTier | null): string {
  if (!tier) return '—'
  if (tier.maxDays === null) return `${tier.minDays} 天以上`
  if (tier.minDays === 0) return `${tier.maxDays} 天以内`
  return `${tier.minDays}–${tier.maxDays} 天`
}

/**
 * 计算当前费率与下一档。
 * @param override 用户在「卖出页」抄到的费率，传 null/undefined 表示沿用估算
 */
export function resolveFee(
  shareClass: ShareClass,
  holdDays: number,
  override?: number | null,
): FeeInfo {
  const tiers = tiersOf(shareClass)
  const days = Number.isFinite(holdDays) ? Math.max(0, holdDays) : 0
  const tier = findTier(tiers, days)
  const idx = tiers.indexOf(tier)
  const nextTier = idx >= 0 && idx < tiers.length - 1 ? tiers[idx + 1] : null

  const hasOverride = override != null && Number.isFinite(override) && override >= 0
  const rate = hasOverride ? Math.min(override as number, 1) : tier.rate

  return {
    rate,
    isOverride: hasOverride,
    isEstimate: !hasOverride,
    tier,
    nextTier,
    daysToNextTier: nextTier ? Math.max(0, nextTier.minDays - days) : null,
    rateDelta: nextTier ? tier.rate - nextTier.rate : 0,
  }
}

export function feeAmount(amount: number, rate: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) return 0
  return Math.max(0, amount) * Math.min(Math.max(rate, 0), 1)
}
