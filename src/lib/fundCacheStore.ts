import {
  enrichIdentity,
  normalizeFundCode,
  upsertFund,
  type FundIdentity,
  type FundIdentityHit,
  type FundRecord,
} from '../core/fundCache'

const KEY = 'jiancang.funds.v1'
const MAX = 500

function isRecord(value: unknown): value is FundRecord {
  if (!value || typeof value !== 'object') return false
  const r = value as Partial<FundRecord>
  return (
    typeof r.code === 'string' &&
    /^\d{6}$/.test(r.code) &&
    typeof r.name === 'string' &&
    r.name.trim().length > 0 &&
    (r.shareClass === undefined || r.shareClass === 'A' || r.shareClass === 'C') &&
    typeof r.updatedAt === 'number'
  )
}

export function loadFundCache(): FundRecord[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isRecord).slice(0, MAX) : []
  } catch {
    return []
  }
}

function save(records: FundRecord[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(records.slice(0, MAX)))
  } catch {
    // 隐私模式/容量不足时静默失败，不影响计算
  }
}

/** 用本机记录补全缺失的代码/名称/类别；只做精确匹配 */
export function enrichFromCache<T extends FundIdentity>(identity: T): T & FundIdentityHit {
  return { ...identity, ...enrichIdentity(identity, loadFundCache()) }
}

/** 记住一条「名称 + 代码」；只有两者都有效才写入 */
export function rememberFund(entry: Omit<FundRecord, 'updatedAt'>): void {
  if (!normalizeFundCode(entry.code) || !entry.name.trim()) return
  save(upsertFund(loadFundCache(), entry, MAX))
}

export function clearFundCache(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
