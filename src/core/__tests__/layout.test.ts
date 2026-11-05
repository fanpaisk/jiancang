import { describe, expect, it } from 'vitest'
import { parseLayout, parseOcrNumber, type OcrWord } from '../layout'

const W = (text: string, x0: number, x1: number, y0: number, h = 30): OcrWord => ({
  text,
  x0,
  x1,
  y0,
  y1: y0 + h,
  conf: 90,
})

/**
 * 真实用例：对 017470 持仓页截图跑 tesseract（chi_sim）得到的原始坐标。
 * 注意这是「标签一行、数值一行」的三列布局，直接按文字顺序读会张冠李戴。
 */
const REAL_SCREENSHOT: OcrWord[] = [
  // 标题行
  W('嘉实', 340, 445, 38),
  W('上', 444, 484, 38),
  W('证', 483, 524, 38),
  W('科', 530, 570, 38),
  W('创', 582, 616, 38),
  W('板', 620, 666, 38),
  W('芯片', 688, 752, 38),
  W('ETF', 751, 806, 38),
  W('联', 825, 849, 38),
  W('接', 864, 893, 38),
  W('C', 899, 921, 38),
  // 代码行
  W(':', 65, 96, 63),
  W('4', 262, 291, 63),
  W('017470', 557, 702, 63),
  // 金额 / 份额 / 占比：标签行 + 数值行
  W('持', 55, 92, 600),
  W('有', 112, 132, 600),
  W('金额', 150, 213, 600),
  W('持', 475, 512, 600),
  W('有', 532, 568, 600),
  W('份额', 567, 633, 600),
  W('持仓', 895, 1052, 600),
  W('占', 990, 1029, 600),
  W('比', 1028, 1056, 600),
  W('1.209.70', 59, 255, 674),
  W('591.28', 476, 632, 674),
  W('19.3%', 899, 1024, 674),
  // 收益 / 收益率 / 成本
  W('持', 55, 92, 790),
  W('有', 112, 148, 790),
  W('收益', 151, 213, 790),
  W('持', 475, 512, 790),
  W('有', 532, 568, 790),
  W('收益', 571, 633, 790),
  W('率', 649, 673, 790),
  W('持仓', 895, 1053, 790),
  W('成', 994, 1032, 790),
  W('本', 1031, 1056, 790),
  W('-554.27', 57, 237, 864),
  W('-31.42%', 477, 657, 864),
  W('2.9833', 896, 1050, 864),
  // 当日 / 昨日 / 天数
  W('当日', 59, 150, 980),
  W('收益', 151, 213, 980),
  W('昨日', 477, 570, 980),
  W('收益', 572, 633, 980),
  W('持', 895, 1053, 980),
  W('有', 952, 981, 980),
  W('天', 980, 1026, 980),
  W('数', 1025, 1056, 980),
  W('-66.58', 57, 208, 1054),
  W('+42.45', 476, 638, 1054),
  W('107', 894, 981, 1054),
]

describe('parseLayout · 真实截图坐标', () => {
  const r = parseLayout(REAL_SCREENSHOT)

  it('份额取自「持有份额」这一列，而不是同行的持有金额', () => {
    expect(r.shares).toBeCloseTo(591.28, 6)
  })

  it('单位成本', () => {
    expect(r.costPerShare).toBeCloseTo(2.9833, 6)
  })

  it('持有天数', () => {
    expect(r.holdDays).toBe(107)
  })

  it('持仓占比', () => {
    expect(r.weightPct).toBeCloseTo(19.3, 6)
  })

  it('持有金额：千分位被误识别成小数点也能修回来', () => {
    expect(r.marketValue).toBeCloseTo(1209.7, 6)
  })

  it('收益率', () => {
    expect(r.returnRatePct).toBeCloseTo(-31.42, 6)
  })

  it('基金名称与代码', () => {
    expect(r.name).toBe('嘉实上证科创板芯片ETF联接C')
    expect(r.code).toBe('017470')
  })

  it('没读到净值时，用「成本 × (1+收益率)」反推', () => {
    expect(r.nav).toBeCloseTo(2.0459, 3)
  })

  it('七个字段全部命中', () => {
    expect(r.matched).toHaveLength(7)
  })
})

describe('parseLayout · 标签与数值同行', () => {
  const words = [
    W('持有份额:', 40, 160, 100),
    W('593.28', 170, 250, 100),
    W('持仓成本', 40, 150, 160),
    W('1.2500', 170, 250, 160),
  ]

  it('同一行右侧取值', () => {
    const r = parseLayout(words)
    expect(r.shares).toBeCloseTo(593.28, 6)
    expect(r.costPerShare).toBeCloseTo(1.25, 6)
  })
})

describe('parseLayout · 空输入与噪声', () => {
  it('空数组不抛错', () => {
    expect(() => parseLayout([])).not.toThrow()
    expect(parseLayout([]).matched).toHaveLength(0)
  })

  it('只有文字没有数字时，不会瞎填', () => {
    const r = parseLayout([W('持有份额', 10, 100, 10), W('暂无', 10, 60, 50)])
    expect(r.shares).toBeUndefined()
  })
})

describe('parseOcrNumber', () => {
  it('普通数字', () => {
    expect(parseOcrNumber('591.28')?.value).toBeCloseTo(591.28, 6)
  })

  it('负数', () => {
    expect(parseOcrNumber('-554.27')?.value).toBeCloseTo(-554.27, 6)
  })

  it('百分数', () => {
    const r = parseOcrNumber('19.3%')
    expect(r?.value).toBeCloseTo(19.3, 6)
    expect(r?.percent).toBe(true)
  })

  it('千分位逗号', () => {
    expect(parseOcrNumber('1,209.70')?.value).toBeCloseTo(1209.7, 6)
  })

  it('千分位被识别成小数点：1.209.70 → 1209.70', () => {
    expect(parseOcrNumber('1.209.70')?.value).toBeCloseTo(1209.7, 6)
  })

  it('四位的净值不会被误修', () => {
    expect(parseOcrNumber('2.9833')?.value).toBeCloseTo(2.9833, 6)
  })

  it('货币符号被忽略', () => {
    expect(parseOcrNumber('¥5,152.68')?.value).toBeCloseTo(5152.68, 6)
  })

  it('纯文字返回 null', () => {
    expect(parseOcrNumber('持有份额')).toBeNull()
  })

  it('乱码返回 null', () => {
    expect(parseOcrNumber('-D.224')).toBeNull()
  })
})
