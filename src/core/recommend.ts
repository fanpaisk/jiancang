import type { Recommendation, RuleResult } from './types'
import { clamp, median } from './util'

/**
 * 「该减多少」的答案：
 * 取所有已触发规则建议比例的中位数，并给出区间。
 *
 * 为什么是中位数而不是加权平均？
 * 因为每条规则都是用户自己设的、有明确算式的解，没有谁「更权威」。
 * 中位数对极端值不敏感，且区间天然揭示了规则之间的分歧。
 */
export function recommend(results: RuleResult[]): Recommendation {
  const triggered = results.filter((r) => r.enabled && r.triggered && r.reducePct > 0)

  if (triggered.length === 0) {
    const candidates = results.filter((r) => r.enabled && !r.triggered && r.gap != null)
    const nearest =
      candidates.length > 0
        ? candidates.reduce((a, b) => ((a.gap ?? Infinity) <= (b.gap ?? Infinity) ? a : b))
        : null

    return {
      hasSignal: false,
      recommendedPct: 0,
      minPct: 0,
      maxPct: 0,
      triggered: [],
      nearest,
    }
  }

  const pcts = triggered.map((r) => clamp(r.reducePct, 0, 1))

  return {
    hasSignal: true,
    recommendedPct: median(pcts),
    minPct: Math.min(...pcts),
    maxPct: Math.max(...pcts),
    triggered,
    nearest: null,
  }
}
