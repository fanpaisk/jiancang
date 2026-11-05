import { describe, expect, it } from 'vitest'
import { hasEnoughToCompute, parseHoldingText } from '../parse'

/** 模拟用户从「嘉实上证科创板芯片ETF联接C」持仓页长按复制出来的文字 */
const SCREENSHOT_TEXT = `嘉实上证科创板芯片ETF联接C
017470
持有金额
1,209.70
持有份额
591.28
持仓占比
19.3%
持有收益
-554.27
持有收益率
-31.42%
持仓成本
2.9833
当日收益
-66.58
昨日收益
+42.45
持有天数
107`

describe('parseHoldingText · 截图真实数据', () => {
  const p = parseHoldingText(SCREENSHOT_TEXT)

  it('提取份额', () => {
    expect(p.shares).toBeCloseTo(591.28, 6)
  })

  it('提取持有金额（含千分位逗号）', () => {
    expect(p.marketValue).toBeCloseTo(1209.7, 6)
  })

  it('提取持仓成本', () => {
    expect(p.costPerShare).toBeCloseTo(2.9833, 6)
  })

  it('提取持有天数', () => {
    expect(p.holdDays).toBe(107)
  })

  it('收益率转成小数', () => {
    expect(p.returnRate).toBeCloseTo(-0.3142, 6)
  })

  it('持仓占比转成小数', () => {
    expect(p.weight).toBeCloseTo(0.193, 6)
  })

  it('提取基金代码', () => {
    expect(p.code).toBe('017470')
  })

  it('提取基金名称', () => {
    expect(p.name).toBe('嘉实上证科创板芯片ETF联接C')
  })

  it('字段足够直接计算', () => {
    expect(hasEnoughToCompute(p)).toBe(true)
  })
})

describe('parseHoldingText · 同屏排版', () => {
  it('标签和数字在同一行也能识别（半角冒号）', () => {
    const p = parseHoldingText('持有份额: 1000.50 持仓成本: 1.2345 持有天数: 45')
    expect(p.shares).toBeCloseTo(1000.5, 6)
    expect(p.costPerShare).toBeCloseTo(1.2345, 6)
    expect(p.holdDays).toBe(45)
  })

  it('全角冒号与中文空格', () => {
    const p = parseHoldingText('持有份额：　800.00\n持有天数：　20')
    expect(p.shares).toBeCloseTo(800, 6)
    expect(p.holdDays).toBe(20)
  })

  it('没有百分号的收益率不误判', () => {
    const p = parseHoldingText('持有收益率 12.5')
    expect(p.returnRate).toBeUndefined()
  })
})

describe('parseHoldingText · 缺字段与异常', () => {
  it('空文本返回空对象', () => {
    expect(parseHoldingText('')).toEqual({})
  })

  it('乱七八糟的文字不会抛错', () => {
    expect(() => parseHoldingText('今天天气不错 🌤 123 abc')).not.toThrow()
  })

  it('只有份额、没有成本时不足以计算', () => {
    const p = parseHoldingText('持有份额 100')
    expect(hasEnoughToCompute(p)).toBe(false)
  })

  it('只有成本、没有份额时不足以计算', () => {
    const p = parseHoldingText('持仓成本 2.5')
    expect(hasEnoughToCompute(p)).toBe(false)
  })
})
