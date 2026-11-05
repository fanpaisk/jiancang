import type { ShareClass } from './types'

export interface FundRecord {
  code: string
  name: string
  shareClass?: ShareClass
  /** 毫秒时间戳，用于淘汰旧记录 */
  updatedAt: number
}

export interface FundIdentity {
  name?: string
  code?: string
  shareClass?: ShareClass
}

export interface FundIdentityHit extends FundIdentity {
  /** 哪些字段是由本机记录补全的 */
  cacheHit?: 'code' | 'name' | 'class'
}

/** 名称归一化：去空白、去尾部箭头/详情，保留中文与 A/C 后缀 */
export function normalizeFundName(name: string): string {
  return name
    .replace(/\s+/g, '')
    .replace(/详情[>›»]?$/, '')
    .replace(/[>›»]+$/, '')
    .trim()
}

/** 代码归一化：只接受恰好 6 位数字；017470C 也能取到 017470 */
export function normalizeFundCode(code: string): string {
  const digits = code.replace(/\D/g, '')
  return digits.length === 6 ? digits : ''
}

export function findFund(records: FundRecord[], identity: FundIdentity): FundRecord | undefined {
  const code = identity.code ? normalizeFundCode(identity.code) : ''
  if (code) {
    const byCode = records.find((r) => r.code === code)
    if (byCode) return byCode
  }

  const name = identity.name ? normalizeFundName(identity.name) : ''
  if (name) {
    return records.find((r) => normalizeFundName(r.name) === name)
  }
  return undefined
}

/**
 * 用本机记录补全缺失的身份字段。已有的值优先，不覆盖 OCR/用户输入。
 * 只做归一化后的精确匹配，不做模糊匹配——宁可空着，也不配错基金。
 */
export function enrichIdentity(identity: FundIdentity, records: FundRecord[]): FundIdentityHit {
  const hit = findFund(records, identity)
  if (!hit) return { ...identity }

  const out: FundIdentityHit = { ...identity }

  if (!out.code && hit.code) {
    out.code = hit.code
    out.cacheHit = 'code'
  }
  if (!out.name && hit.name) {
    out.name = hit.name
    out.cacheHit = out.cacheHit ?? 'name'
  }
  if (!out.shareClass && hit.shareClass) {
    out.shareClass = hit.shareClass
    out.cacheHit = out.cacheHit ?? 'class'
  }

  return out
}

/** 写入/更新一条记录；按代码去重，最近的放最前，最多保留 max 条 */
export function upsertFund(
  records: FundRecord[],
  entry: Omit<FundRecord, 'updatedAt'> & { updatedAt?: number },
  max = 500,
): FundRecord[] {
  const code = normalizeFundCode(entry.code)
  const name = normalizeFundName(entry.name)
  if (!code || !name) return records

  const prev = records.find((r) => r.code === code)
  const next: FundRecord = {
    code,
    name,
    shareClass: entry.shareClass ?? prev?.shareClass,
    updatedAt: entry.updatedAt ?? Date.now(),
  }

  return [next, ...records.filter((r) => r.code !== code)].slice(0, max)
}
