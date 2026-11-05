/**
 * 粘贴识别：从平台持仓页复制出来的文字里提取字段。
 *
 * 为什么不用 OCR？
 * 文本解析是「解析」不是「识别」，准确率接近 100%，零依赖、零成本、纯前端。
 * 维护成本也低：多支持一个平台，通常只是多一条正则。
 */

import { inferShareClass } from './fund'
import type { ShareClass } from './types'

export interface ParsedHolding {
  name?: string
  code?: string
  shares?: number
  marketValue?: number
  costPerShare?: number
  holdDays?: number
  /** 直接读到的净值；没有时由「金额 ÷ 份额」反推 */
  nav?: number
  /** 小数，-0.3142 表示 -31.42% */
  returnRate?: number
  /** 小数，0.193 表示 19.3% */
  weight?: number
  /** 从名称后缀推断的份额类别；推断不出为 undefined */
  shareClass?: ShareClass
  /** 小数，-0.0522 表示 -5.22% */
  dayChange?: number
}

const NUM = String.raw`(-?\d[\d,]*(?:\.\d+)?)`
const PCT = String.raw`([+-]?\d+(?:\.\d+)?)\s*%`

const RE = {
  shares: new RegExp(String.raw`持有份额[\s：:]*${NUM}`),
  marketValue: new RegExp(String.raw`持有金额[\s：:]*${NUM}`),
  cost: new RegExp(String.raw`(?:持仓成本|单位成本|成本价)[\s：:]*${NUM}`),
  days: /持有天数[\s：:]*(\d+)/,
  returnRate: new RegExp(String.raw`持有收益率[\s：:]*${PCT}`),
  weight: new RegExp(String.raw`(?:持仓占比|仓位占比)[\s：:]*${PCT}`),
  code: /(?:^|\D)(\d{6})(?:\D|$)/,
  name: /(?:ETF联接|联接|混合|债券|指数|股票|货币|QDII|FOF|基金)[A-C]?$/,
  dayChange: new RegExp(
    String.raw`(?:当日涨幅|当日涨跌幅|日涨跌幅|今日涨跌幅|今日涨幅|本日涨幅)[\s：:]*${PCT}`,
  ),
} as const

function pickNumber(text: string, re: RegExp): number | undefined {
  const m = text.match(re)
  if (!m) return undefined
  const n = Number(m[1].replace(/[,，]/g, ''))
  return Number.isFinite(n) ? n : undefined
}

export function parseHoldingText(raw: string): ParsedHolding {
  const text = raw.replace(/\r/g, '')
  const out: ParsedHolding = {}

  const shares = pickNumber(text, RE.shares)
  if (shares !== undefined) out.shares = shares

  const marketValue = pickNumber(text, RE.marketValue)
  if (marketValue !== undefined) out.marketValue = marketValue

  const cost = pickNumber(text, RE.cost)
  if (cost !== undefined) out.costPerShare = cost

  const days = pickNumber(text, RE.days)
  if (days !== undefined) out.holdDays = days

  const ret = pickNumber(text, RE.returnRate)
  if (ret !== undefined) out.returnRate = ret / 100

  const weight = pickNumber(text, RE.weight)
  if (weight !== undefined) out.weight = weight / 100

  const dayChange = pickNumber(text, RE.dayChange)
  if (dayChange !== undefined) out.dayChange = dayChange / 100

  const code = text.match(RE.code)
  if (code) out.code = code[1]

  const nameLine = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !/[：:]/.test(l) && RE.name.test(l))
  if (nameLine) {
    out.name = nameLine
    out.shareClass = inferShareClass(nameLine) ?? undefined
  }

  return out
}

/** 是否解析出了「够算一笔」的最小字段 */
export function hasEnoughToCompute(p: ParsedHolding): boolean {
  return (p.shares ?? 0) > 0 && ((p.costPerShare ?? 0) > 0 || (p.marketValue ?? 0) > 0)
}
