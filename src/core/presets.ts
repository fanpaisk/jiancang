import { defaultRules } from './rules'
import type { RuleParams } from './types'

/**
 * 流派预设：把「五个参数」翻译成「一种风格」。
 *
 * 为什么不用真人姓名命名（比如「巴菲特流派」）？
 * 1. 事实不符：绝大多数投资大师没有机械化的减仓规则，硬套会失真，懂行的人一眼看穿；
 * 2. 法律风险：用真人姓名做功能命名，容易被理解为本人背书；
 * 3. 反噬最狠：一旦参数被当成「某人的策略」，用户亏钱时会归因到那个人和我们身上。
 *
 * 所以这里用「流派名 + 思想来源」：既有跟随感，又站得住脚。
 */

interface Spec {
  /** 目标仓位占比上限 */
  weight?: number
  /** 目标止盈：[目标收益率, 减仓比例] */
  tp?: [number, number]
  /** 回撤止盈：[回撤阈值, 减仓比例] */
  trail?: [number, number]
  /** 收回本金 */
  recover?: boolean
  /** 止损：[亏损阈值, 减仓比例] */
  sl?: [number, number]
}

function build(spec: Spec): RuleParams {
  return {
    targetWeight: { enabled: spec.weight != null, weight: spec.weight ?? 0.2 },
    takeProfit: {
      enabled: spec.tp != null,
      targetRate: spec.tp?.[0] ?? 0.2,
      reducePct: spec.tp?.[1] ?? 1 / 3,
    },
    trailingStop: {
      enabled: spec.trail != null,
      drawdown: spec.trail?.[0] ?? 0.1,
      reducePct: spec.trail?.[1] ?? 0.5,
    },
    recoverPrincipal: { enabled: spec.recover ?? false },
    stopLoss: {
      enabled: spec.sl != null,
      lossRate: spec.sl?.[0] ?? 0.3,
      reducePct: spec.sl?.[1] ?? 1 / 3,
    },
  }
}

export interface Preset {
  id: string
  /** 短名，列表里显示 */
  name: string
  /** 流派名，给「跟随感」 */
  school: string
  /** 一句话说清它干什么 */
  tagline: string
  /** 为什么这么设，展开时显示 */
  idea: string
  rules: RuleParams
}

export const PRESETS: Preset[] = [
  {
    id: 'steady',
    name: '落袋为安',
    school: '稳健止盈派',
    tagline: '赚到就落一部分，不追求卖在最高点',
    idea:
      'A 股波动大，浮盈回吐是最常见的痛。这条路线不预测顶，只在赚到一段后先收一部分，再用回撤止盈兜住剩下的——涨了有份，跌了不至于白坐一轮。',
    rules: build({ weight: 0.2, tp: [0.2, 1 / 3], trail: [0.1, 0.5] }),
  },
  {
    id: 'trend',
    name: '趋势跟随',
    school: '趋势跟踪派',
    tagline: '让利润奔跑，破位就走',
    idea:
      '源自海龟交易法的核心：不猜顶，只跟趋势。上涨途中不动，一旦从高点回落就减半，跌破成本就认错。缺点是震荡市会被反复打脸。',
    rules: build({ trail: [0.08, 0.5], sl: [0.15, 0.5] }),
  },
  {
    id: 'grid',
    name: '分批收割',
    school: '网格交易派',
    tagline: '小口多次，震荡市里慢慢收',
    idea:
      '不赌方向，每次只减四分之一。涨一档收一点、回落一档也收一点，把一次大决策拆成很多次小决策，心理压力最小。',
    rules: build({ tp: [0.12, 0.25], trail: [0.06, 0.25] }),
  },
  {
    id: 'balance',
    name: '仓位纪律',
    school: '资产配置派',
    tagline: '只管集中度，不管涨跌',
    idea:
      '不预测市场，只守一条线：单只基金占比超过上限就减回目标。适合已经持有多只基金、真正需要控风险的人。',
    rules: build({ weight: 0.15 }),
  },
  {
    id: 'principal',
    name: '本金落袋',
    school: '本金安全派',
    tagline: '本金先拿回来，用利润继续玩',
    idea:
      '卖出金额刚好等于持仓成本，之后无论涨跌，玩的都是已经赚来的钱。这是心理压力最小的一条路，代价是牛市里会少赚。',
    rules: build({ recover: true, trail: [0.15, 0.5] }),
  },
  {
    id: 'dca',
    name: '定投止盈',
    school: '定投实践派',
    tagline: '长期定投，达标就分批走',
    idea:
      '定投圈的说法是「止盈不止损」：跌了继续投摊薄成本，涨到目标才分批退出，然后重新开始下一轮。',
    rules: build({ tp: [0.3, 0.5], trail: [0.15, 1 / 3] }),
  },
  {
    id: 'strict',
    name: '严格止损',
    school: '风险控制派',
    tagline: '先想输多少，再想赚多少',
    idea:
      '把最大亏损写死在参数里，跌破就减半，反弹也不后悔。适合仓位重、跌一点就睡不着的人。',
    rules: build({ tp: [0.15, 1 / 3], trail: [0.08, 0.5], sl: [0.1, 0.5] }),
  },
]

/** 默认流派与 defaultRules 保持一致，保证老用户数据不漂移 */
export const DEFAULT_PRESET_ID = 'steady'

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

/** 把规则翻译成人类可读的标签，用来自检「这个流派到底在干什么」 */
export function presetSummary(rules: RuleParams): string[] {
  const out: string[] = []
  if (rules.targetWeight.enabled) out.push(`占比上限 ${pct(rules.targetWeight.weight)}`)
  if (rules.takeProfit.enabled) {
    out.push(`涨 ${pct(rules.takeProfit.targetRate)} 减 ${pct(rules.takeProfit.reducePct)}`)
  }
  if (rules.trailingStop.enabled) {
    out.push(`回撤 ${pct(rules.trailingStop.drawdown)} 减 ${pct(rules.trailingStop.reducePct)}`)
  }
  if (rules.recoverPrincipal.enabled) out.push('卖出本金')
  if (rules.stopLoss.enabled) {
    out.push(`跌 ${pct(rules.stopLoss.lossRate)} 减 ${pct(rules.stopLoss.reducePct)}`)
  }
  return out
}

export function cloneRules(r: RuleParams): RuleParams {
  return {
    targetWeight: { ...r.targetWeight },
    takeProfit: { ...r.takeProfit },
    trailingStop: { ...r.trailingStop },
    recoverPrincipal: { ...r.recoverPrincipal },
    stopLoss: { ...r.stopLoss },
  }
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6
}

export function sameRules(a: RuleParams, b: RuleParams): boolean {
  return (
    a.targetWeight.enabled === b.targetWeight.enabled &&
    near(a.targetWeight.weight, b.targetWeight.weight) &&
    a.takeProfit.enabled === b.takeProfit.enabled &&
    near(a.takeProfit.targetRate, b.takeProfit.targetRate) &&
    near(a.takeProfit.reducePct, b.takeProfit.reducePct) &&
    a.trailingStop.enabled === b.trailingStop.enabled &&
    near(a.trailingStop.drawdown, b.trailingStop.drawdown) &&
    near(a.trailingStop.reducePct, b.trailingStop.reducePct) &&
    a.recoverPrincipal.enabled === b.recoverPrincipal.enabled &&
    a.stopLoss.enabled === b.stopLoss.enabled &&
    near(a.stopLoss.lossRate, b.stopLoss.lossRate) &&
    near(a.stopLoss.reducePct, b.stopLoss.reducePct)
  )
}

/** 当前参数命中哪个流派；都不命中返回 null（表示用户自己调过） */
export function detectPreset(rules: RuleParams): Preset | null {
  return PRESETS.find((p) => sameRules(p.rules, rules)) ?? null
}

/** 默认规则必须能被识别成默认流派，否则首屏会显示「自定义」 */
export function isDefaultPreset(rules: RuleParams): boolean {
  return sameRules(defaultRules, rules)
}
