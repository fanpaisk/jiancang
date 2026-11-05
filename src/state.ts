import { defaultRules } from './core/rules'
import type { RuleParams, ShareClass } from './core/types'

export interface FormState {
  name: string
  code: string
  shareClass: ShareClass
  shares: string
  costPerShare: string
  nav: string
  holdDays: string
  /** 留空表示用内置估算表；填的是百分数，例如 "0.5" */
  feeOverride: string
  /** 百分数，例如 "19.3" */
  currentWeight: string
  /** 历史最高净值 */
  peakNav: string
  /** 百分数，例如 "-5.22"；目前只记录，暂不参与规则 */
  dayChange: string
}

export const defaultForm: FormState = {
  name: '',
  code: '',
  shareClass: 'A',
  shares: '',
  costPerShare: '',
  nav: '',
  holdDays: '',
  feeOverride: '',
  currentWeight: '',
  peakNav: '',
  dayChange: '',
}

/**
 * 演示数据：刻意用合成数字，不搬真实持仓。
 * 保留「C 类 / 107 天 / 费率 0」这组关系，方便演示「没有规则触发 → 0%」。
 */
export const exampleForm: FormState = {
  name: '示例基金 · 科技成长C',
  code: '000000',
  shareClass: 'C',
  shares: '1000',
  costPerShare: '2.5000',
  nav: '2.0459',
  holdDays: '107',
  feeOverride: '',
  currentWeight: '19.3',
  peakNav: '',
  dayChange: '',
}

export interface PersistedApp {
  form: FormState
  rules: RuleParams
}

/**
 * 演示用：一只盈利的 A 类指数基金。
 * 用来展示「有规则被触发」时的样子：目标仓位 + 目标止盈同时触发，费率还差 335 天跳档。
 */
export const demoProfitForm: FormState = {
  name: '示例 · 沪深300指数A',
  code: '',
  shareClass: 'A',
  shares: '10000',
  costPerShare: '1.2000',
  nav: '1.5000',
  holdDays: '30',
  feeOverride: '',
  currentWeight: '28',
  peakNav: '1.5600',
  dayChange: '',
}

export type DemoMode = 'loss' | 'profit'

export const DEMO_LABEL: Record<DemoMode, string> = {
  loss: '亏损示例',
  profit: '盈利示例',
}

export const demoForms: Record<DemoMode, FormState> = {
  loss: exampleForm,
  profit: demoProfitForm,
}

/** 表单里有没有用户自己填的东西（用于破坏性操作前确认） */
export function hasUserInput(form: FormState): boolean {
  return Boolean(
    form.name ||
      form.code ||
      form.shares ||
      form.costPerShare ||
      form.nav ||
      form.holdDays ||
      form.currentWeight ||
      form.peakNav ||
      form.dayChange ||
      form.feeOverride,
  )
}

export { defaultRules }
