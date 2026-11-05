/** 份额类别：A 类前端收费，C 类按日计提销售服务费 */
export type ShareClass = 'A' | 'C'

/** 赎回费率档位：持有 [minDays, maxDays) 天 */
export interface FeeTier {
  minDays: number
  /** null 表示无上限 */
  maxDays: number | null
  /** 费率小数，0.005 = 0.5% */
  rate: number
}

export interface FeeInfo {
  /** 实际采用的费率（用户覆盖值优先） */
  rate: number
  /** 是否来自用户手填 */
  isOverride: boolean
  /** 是否来自内置估算表（需要提示「以平台为准」） */
  isEstimate: boolean
  tier: FeeTier
  nextTier: FeeTier | null
  /** 距离进入下一档还有几天；已在最后一档则为 null */
  daysToNextTier: number | null
  /** 当前档费率 − 下一档费率；>0 表示等待能省钱 */
  rateDelta: number
}

export interface Position {
  shares: number
  costPerShare: number
  nav: number
  holdDays: number
  marketValue: number
  cost: number
  pnl: number
  /** 小数，0.2 = +20% */
  returnRate: number
}

export type RuleId =
  | 'targetWeight'
  | 'takeProfit'
  | 'trailingStop'
  | 'recoverPrincipal'
  | 'stopLoss'

export interface RuleResult {
  id: RuleId
  label: string
  enabled: boolean
  triggered: boolean
  /** 建议减仓比例，小数 0..1 */
  reducePct: number
  formula: string
  detail: string
  /** 距离触发还差多少（正数＝还差，负数＝已超出）；无法判断时为 null */
  gap: number | null
  gapLabel: string
}

export interface RuleParams {
  /** 目标仓位占比，小数 */
  targetWeight: { enabled: boolean; weight: number }
  /** 目标收益率 + 达标后减仓比例 */
  takeProfit: { enabled: boolean; targetRate: number; reducePct: number }
  /** 从峰值回撤阈值 + 减仓比例 */
  trailingStop: { enabled: boolean; drawdown: number; reducePct: number }
  /** 收回本金：卖出金额 = 持仓成本 */
  recoverPrincipal: { enabled: boolean }
  /** 止损线 + 减仓比例 */
  stopLoss: { enabled: boolean; lossRate: number; reducePct: number }
}

export interface Recommendation {
  hasSignal: boolean
  /** 已触发规则结果的中位数 */
  recommendedPct: number
  minPct: number
  maxPct: number
  triggered: RuleResult[]
  /** 未触发里距离最近的一条，用于「还差多少」的提示 */
  nearest: RuleResult | null
}

export interface SellPlan {
  sellPct: number
  sellShares: number
  sellAmount: number
  feeRate: number
  fee: number
  netProceeds: number
  realizedPnl: number
  remainingShares: number
  remainingCost: number
  remainingMarketValue: number
}
