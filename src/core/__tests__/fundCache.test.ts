import { describe, expect, it } from 'vitest'
import {
  enrichIdentity,
  findFund,
  normalizeFundCode,
  normalizeFundName,
  upsertFund,
  type FundRecord,
} from '../fundCache'

const RECORDS: FundRecord[] = [
  {
    code: '017470',
    name: '嘉实上证科创板芯片ETF联接C',
    shareClass: 'C',
    updatedAt: 1,
  },
  {
    code: '017469',
    name: '嘉实上证科创板芯片ETF联接A',
    shareClass: 'A',
    updatedAt: 2,
  },
]

describe('normalizeFundName', () => {
  it('去掉空白和尾部箭头', () => {
    expect(normalizeFundName(' 嘉实 上证科创板芯片ETF联接C > ')).toBe(
      '嘉实上证科创板芯片ETF联接C',
    )
  })
})

describe('normalizeFundCode', () => {
  it('只接受 6 位数字', () => {
    expect(normalizeFundCode('017470')).toBe('017470')
    expect(normalizeFundCode('017470C')).toBe('017470')
    expect(normalizeFundCode('17470')).toBe('')
    expect(normalizeFundCode('abc')).toBe('')
  })
})

describe('findFund / enrichIdentity', () => {
  it('按代码找名称和类别', () => {
    const out = enrichIdentity({ code: '017470' }, RECORDS)
    expect(out.name).toBe('嘉实上证科创板芯片ETF联接C')
    expect(out.shareClass).toBe('C')
    expect(out.cacheHit).toBe('name')
  })

  it('按名称找代码和类别', () => {
    const out = enrichIdentity({ name: '嘉实上证科创板芯片ETF联接A' }, RECORDS)
    expect(out.code).toBe('017469')
    expect(out.shareClass).toBe('A')
    expect(out.cacheHit).toBe('code')
  })

  it('已有字段不被覆盖，只补类别', () => {
    const out = enrichIdentity(
      { code: '017470', name: '用户写的名字' },
      RECORDS,
    )
    expect(out.name).toBe('用户写的名字')
    expect(out.shareClass).toBe('C')
    expect(out.cacheHit).toBe('class')
  })

  it('找不到时原样返回，不猜', () => {
    expect(enrichIdentity({ code: '999999' }, RECORDS)).toEqual({ code: '999999' })
  })

  it('findFund 先按代码再按名称', () => {
    expect(findFund(RECORDS, { code: '017469', name: '不存在' })?.code).toBe('017469')
  })
})

describe('upsertFund', () => {
  it('同代码去重并更新到最前', () => {
    const next = upsertFund(RECORDS, {
      code: '017470',
      name: '嘉实上证科创板芯片ETF联接C',
      shareClass: 'C',
      updatedAt: 3,
    })
    expect(next).toHaveLength(2)
    expect(next[0].code).toBe('017470')
    expect(next[0].updatedAt).toBe(3)
  })

  it('保留旧记录里已有的类别', () => {
    const next = upsertFund(RECORDS, { code: '017470', name: '新名字' })
    expect(next[0].shareClass).toBe('C')
  })

  it('非法代码/空名称不写入', () => {
    expect(upsertFund(RECORDS, { code: '123', name: '某基金' })).toBe(RECORDS)
    expect(upsertFund(RECORDS, { code: '123456', name: '  ' })).toBe(RECORDS)
  })

  it('超过上限时淘汰最旧记录', () => {
    const list: FundRecord[] = Array.from({ length: 3 }, (_, i) => ({
      code: String(100000 + i),
      name: `基金${i}`,
      updatedAt: i,
    }))
    const next = upsertFund(list, { code: '200000', name: '新基金' }, 3)
    expect(next).toHaveLength(3)
    expect(next[0].code).toBe('200000')
  })
})
