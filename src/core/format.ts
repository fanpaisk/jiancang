const MINUS = '−'

export function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtSignedMoney(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const sign = n > 0 ? '+' : n < 0 ? MINUS : ''
  return sign + fmtMoney(Math.abs(n))
}

export function fmtShares(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 0.1234 -> "12.34%" */
export function fmtPct(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—'
  return `${(n * 100).toFixed(digits)}%`
}

/** 0.1234 -> "+12.34%"，负数用 Unicode 减号 */
export function fmtSignedPct(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—'
  const v = n * 100
  const sign = v > 0 ? '+' : v < 0 ? MINUS : ''
  return `${sign}${Math.abs(v).toFixed(digits)}%`
}

/** 百分数点差：0.1234 -> "12.34 个百分点" */
export function fmtPoints(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—'
  return `${(Math.abs(n) * 100).toFixed(digits)} 个百分点`
}

export function fmtDays(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return `${Math.round(n)} 天`
}
