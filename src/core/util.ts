export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

/**
 * 浮点比较容差。
 * 「回撤正好 10%」在浮点里会算成 0.09999999999999998，
 * 如果直接用 >=，用户明明踩在阈值上却触发不了。所有阈值比较都走下面三个函数。
 */
export const EPS = 1e-9

export function gte(a: number, b: number): boolean {
  return a >= b - EPS
}

export function lte(a: number, b: number): boolean {
  return a <= b + EPS
}

export function gt(a: number, b: number): boolean {
  return a > b + EPS
}

/** 安全转数字：空串、非法值都退化成 fallback */
export function toNum(value: string | number | undefined | null, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (value == null) return fallback
  const cleaned = String(value).replace(/[,，\s]/g, '').replace(/%$/, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : fallback
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** 四舍五入到 n 位，消除 0.1+0.2 之类的浮点噪音 */
export function round(n: number, digits = 2): number {
  if (!Number.isFinite(n)) return 0
  const p = 10 ** digits
  return Math.round((n + Number.EPSILON) * p) / p
}
