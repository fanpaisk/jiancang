import type { Position, RuleParams, RuleResult } from './types'
import { fmtMoney, fmtPct, fmtPoints, fmtSignedPct } from './format'
import { clamp, gt, gte, lte } from './util'

export interface RuleContext {
  pos: Position
  /** 该基金占全部持仓的比例，小数；未知传 null */
  currentWeight: number | null
  /** 历史最高净值；未知传 null */
  peakNav: number | null
}

export const defaultRules: RuleParams = {
  targetWeight: { enabled: true, weight: 0.2 },
  takeProfit: { enabled: true, targetRate: 0.2, reducePct: 1 / 3 },
  trailingStop: { enabled: true, drawdown: 0.1, reducePct: 0.5 },
  recoverPrincipal: { enabled: false },
  stopLoss: { enabled: false, lossRate: 0.3, reducePct: 1 / 3 },
}

function disabled(id: RuleResult['id'], label: string): RuleResult {
  return {
    id,
    label,
    enabled: false,
    triggered: false,
    reducePct: 0,
    formula: '',
    detail: '未启用',
    gap: null,
    gapLabel: '',
  }
}

function pending(
  id: RuleResult['id'],
  label: string,
  formula: string,
  hint: string,
): RuleResult {
  return {
    id,
    label,
    enabled: true,
    triggered: false,
    reducePct: 0,
    formula,
    detail: hint,
    gap: null,
    gapLabel: hint,
  }
}

/** 目标仓位：占比超过目标时，减到目标。解是精确的：1 − 目标/当前。 */
function evalTargetWeight(ctx: RuleContext, p: RuleParams['targetWeight']): RuleResult {
  const id = 'targetWeight' as const
  const label = '目标仓位'
  if (!p.enabled) return disabled(id, label)
  if (ctx.currentWeight == null || ctx.currentWeight <= 0) {
    return pending(id, label, '', '填写当前占比后可判断')
  }

  const w = ctx.currentWeight
  // 目标不能取满：t=1 只能靠买入达到，靠卖出无解
  const target = clamp(p.weight, 0, 0.999)
  const triggered = gt(w, target)
  // 卖出后组合总市值会同步减少（现金离开基金资产），
  // 所以「减到目标占比」的解是 (1 − t/w) / (1 − t)，而不是 1 − t/w。
  // 用后者只会减过头一点：30% → 目标 20% 时减 33.3%，实际只降到 22.2%。
  const reducePct = triggered ? clamp((1 - target / w) / (1 - target), 0, 1) : 0

  return {
    id,
    label,
    enabled: true,
    triggered,
    reducePct,
    formula: `(1 − ${fmtPct(target)} / ${fmtPct(w)}) / (1 − ${fmtPct(target)})`,
    detail: `当前占比 ${fmtPct(w)}，目标 ${fmtPct(target)}`,
    gap: triggered ? 0 : target - w,
    gapLabel: triggered ? '' : `还需涨 ${fmtPoints(target - w)} 才会超配`,
  }
}

/** 目标止盈：收益率达标后按预设比例减仓。 */
function evalTakeProfit(ctx: RuleContext, p: RuleParams['takeProfit']): RuleResult {
  const id = 'takeProfit' as const
  const label = '目标止盈'
  if (!p.enabled) return disabled(id, label)

  const r = ctx.pos.returnRate
  const target = clamp(p.targetRate, -1, 10)
  const reducePct = clamp(p.reducePct, 0, 1)
  const triggered = gte(r, target)

  return {
    id,
    label,
    enabled: true,
    triggered,
    reducePct: triggered ? reducePct : 0,
    formula: `收益率 ≥ ${fmtPct(target)} 时减 ${fmtPct(reducePct)}`,
    detail: `当前收益率 ${fmtSignedPct(r)}，目标 ${fmtPct(target)}`,
    gap: triggered ? 0 : target - r,
    gapLabel: triggered ? '' : `还差 ${fmtPoints(target - r)}`,
  }
}

/** 回撤止盈：从峰值回落超过阈值就减，专治「浮盈坐过山车」。 */
function evalTrailingStop(ctx: RuleContext, p: RuleParams['trailingStop']): RuleResult {
  const id = 'trailingStop' as const
  const label = '回撤止盈'
  if (!p.enabled) return disabled(id, label)
  if (ctx.peakNav == null || ctx.peakNav <= 0) {
    return pending(id, label, '', '填写历史最高净值后可判断')
  }

  const peak = ctx.peakNav
  const drawdown = Math.max(0, (peak - ctx.pos.nav) / peak)
  const threshold = clamp(p.drawdown, 0, 1)
  const reducePct = clamp(p.reducePct, 0, 1)
  const triggered = gte(drawdown, threshold)

  return {
    id,
    label,
    enabled: true,
    triggered,
    reducePct: triggered ? reducePct : 0,
    formula: `从峰值回撤 ≥ ${fmtPct(threshold)} 时减 ${fmtPct(reducePct)}`,
    detail: `峰值 ${peak.toFixed(4)}，当前回撤 ${fmtPct(drawdown)}`,
    gap: triggered ? 0 : threshold - drawdown,
    gapLabel: triggered ? '' : `还需再跌 ${fmtPoints(threshold - drawdown)}`,
  }
}

/** 收回本金：卖出成本额，剩下的都是利润。解是精确的：成本 / 市值。 */
function evalRecoverPrincipal(
  ctx: RuleContext,
  p: RuleParams['recoverPrincipal'],
): RuleResult {
  const id = 'recoverPrincipal' as const
  const label = '收回本金'
  if (!p.enabled) return disabled(id, label)

  const { cost, marketValue, returnRate } = ctx.pos
  if (marketValue <= 0 || cost <= 0) {
    return pending(id, label, '', '填写份额与成本后可判断')
  }
  const triggered = gt(returnRate, 0)
  const reducePct = triggered ? clamp(cost / marketValue, 0, 1) : 0

  return {
    id,
    label,
    enabled: true,
    triggered,
    reducePct,
    formula: `持仓成本 ${fmtMoney(cost)} / 当前市值 ${fmtMoney(marketValue)}`,
    detail: triggered
      ? `卖出 ${fmtPct(reducePct)} 收回全部本金，剩余为纯利润`
      : '未盈利，无法收回本金',
    gap: triggered ? 0 : -returnRate,
    gapLabel: triggered ? '' : `还差 ${fmtPoints(-returnRate)} 回到成本`,
  }
}

/** 止损：亏损超过阈值按预设比例减仓。默认关闭。 */
function evalStopLoss(ctx: RuleContext, p: RuleParams['stopLoss']): RuleResult {
  const id = 'stopLoss' as const
  const label = '止损线'
  if (!p.enabled) return disabled(id, label)

  const r = ctx.pos.returnRate
  const line = clamp(p.lossRate, 0, 1)
  const reducePct = clamp(p.reducePct, 0, 1)
  const triggered = lte(r, -line)

  return {
    id,
    label,
    enabled: true,
    triggered,
    reducePct: triggered ? reducePct : 0,
    formula: `亏损 ≥ ${fmtPct(line)} 时减 ${fmtPct(reducePct)}`,
    detail: `当前收益率 ${fmtSignedPct(r)}，止损线 −${fmtPct(line)}`,
    gap: triggered ? 0 : r + line,
    gapLabel: triggered ? '' : `距离止损线还有 ${fmtPoints(r + line)}`,
  }
}

export function evaluateRules(ctx: RuleContext, p: RuleParams): RuleResult[] {
  return [
    evalTargetWeight(ctx, p.targetWeight),
    evalTakeProfit(ctx, p.takeProfit),
    evalTrailingStop(ctx, p.trailingStop),
    evalRecoverPrincipal(ctx, p.recoverPrincipal),
    evalStopLoss(ctx, p.stopLoss),
  ]
}
