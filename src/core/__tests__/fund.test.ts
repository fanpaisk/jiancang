import { describe, expect, it } from 'vitest'
import { inferShareClass } from '../fund'

describe('inferShareClass', () => {
  it('名称以 C 结尾', () => {
    expect(inferShareClass('嘉实上证科创板芯片ETF联接C')).toBe('C')
  })

  it('名称以 C类 结尾', () => {
    expect(inferShareClass('某某成长混合C类')).toBe('C')
  })

  it('名称以 A 结尾', () => {
    expect(inferShareClass('某某沪深300指数A')).toBe('A')
  })

  it('全角括号里的类别', () => {
    expect(inferShareClass('某某基金（C）')).toBe('C')
  })

  it('没有类别后缀时返回 null', () => {
    expect(inferShareClass('某某灵活配置混合')).toBeNull()
  })

  it('QDII / FOF 不会被误判', () => {
    expect(inferShareClass('某某全球精选QDII')).toBeNull()
    expect(inferShareClass('某某养老目标FOF')).toBeNull()
  })

  it('空名称返回 null', () => {
    expect(inferShareClass()).toBeNull()
  })
})
