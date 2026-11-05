/**
 * OCR 版面配对：把「一堆带坐标的词」还原成「字段 → 数值」。
 *
 * 为什么不能直接按文字顺序匹配？
 * 基金 App 的持仓页是三列网格：标签一行、数值一行，
 * 直接读出来是「持有金额 持有份额 持仓占比 / 1,209.70 591.28 19.3%」，
 * 顺序完全对不上。所以必须用坐标：按行分组，再按列（x 轴重叠）配对。
 *
 * 这里是纯函数，不依赖 DOM 也不依赖 Tesseract，可以直接用真实 OCR 坐标做测试。
 */

import { inferShareClass } from './fund'
import type { ShareClass } from './types'

export interface OcrWord {
  text: string
  x0: number
  x1: number
  y0: number
  y1: number
  conf?: number
}

export interface LayoutResult {
  name?: string
  code?: string
  shares?: number
  costPerShare?: number
  holdDays?: number
  /** 百分数，19.3 表示 19.3% */
  weightPct?: number
  marketValue?: number
  /** 当前净值（最新净值），可直接填表 */
  nav?: number
  /** 百分数，-31.42 表示 -31.42% */
  returnRatePct?: number
  /** 份额类别；从名称后缀推断，推断不出为 undefined */
  shareClass?: ShareClass
  /** 身份字段是否由本机记录补全（仅 UI 使用） */
  cacheHit?: 'code' | 'name' | 'class'
  /** 当日涨跌幅，百分数；-5.22 表示 -5.22% */
  dayChangePct?: number
  /** 命中并成功取值的字段名，用于在 UI 上打勾 */
  matched: string[]
  /** 每个字段来源词的平均置信度，用于两次识别结果合并时择优 */
  conf: Record<string, number>
}

export const FIELD_KEYS = [
  'marketValue',
  'shares',
  'weightPct',
  'costPerShare',
  'holdDays',
  'nav',
  'returnRatePct',
  'dayChangePct',
] as const

export type FieldKey = (typeof FIELD_KEYS)[number]

interface Span {
  start: number
  end: number
  x0: number
  x1: number
}

interface Line {
  y0: number
  y1: number
  words: OcrWord[]
  text: string
  spans: Span[]
}

const FIELD_LABELS: { key: FieldKey; aliases: string[] }[] = [
  // 各家叫法不一样：持有金额 / 持有资产 / 参考市值……
  { key: 'marketValue', aliases: ['持有金额', '持有资产', '持仓金额', '持仓市值', '参考市值', '金额'] },
  { key: 'shares', aliases: ['持有份额', '持仓份额', '可用份额', '份额'] },
  { key: 'weightPct', aliases: ['持仓占比', '仓位占比', '仓位比例', '占比'] },
  { key: 'costPerShare', aliases: ['单位成本', '成本价', '持仓成本'] },
  { key: 'holdDays', aliases: ['持有天数', '持仓天数', '天数'] },
  { key: 'nav', aliases: ['最新净值', '单位净值', '净值'] },
  { key: 'returnRatePct', aliases: ['持有收益率', '持仓收益率', '收益率'] },
  // 只认明确的「当日」，避免把「近1年涨跌幅」当成当天涨跌
  {
    key: 'dayChangePct',
    aliases: ['当日涨幅', '当日涨跌幅', '日涨跌幅', '今日涨跌幅', '今日涨幅', '本日涨幅'],
  },
]

/** 把词按 y 聚成行，并把行内文字拼起来、记录每个字符落在哪个词的 x 区间里 */
function groupLines(words: OcrWord[]): Line[] {
  const sorted = words
    .filter((w) => w.text && w.text.trim())
    .sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)

  if (sorted.length === 0) return []

  const heights = sorted.map((w) => w.y1 - w.y0).filter((h) => h > 0).sort((a, b) => a - b)
  const medianH = heights.length ? heights[Math.floor(heights.length / 2)] : 20
  const threshold = Math.max(6, medianH * 0.6)

  const lines: Line[] = []
  for (const w of sorted) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(w.y0 - last.y0) <= threshold) {
      last.words.push(w)
      last.y0 = Math.min(last.y0, w.y0)
      last.y1 = Math.max(last.y1, w.y1)
    } else {
      lines.push({ y0: w.y0, y1: w.y1, words: [w], text: '', spans: [] })
    }
  }

  for (const line of lines) {
    line.words.sort((a, b) => a.x0 - b.x0)
    let text = ''
    const spans: Span[] = []
    for (const w of line.words) {
      const start = text.length
      text += w.text
      spans.push({ start, end: text.length, x0: w.x0, x1: w.x1 })
    }
    line.text = text
    line.spans = spans
  }

  return lines
}

function xRangeFor(line: Line, start: number, end: number): { x0: number; x1: number } | null {
  const head = line.spans.find((s) => start >= s.start && start < s.end)
  let tail: Span | undefined
  for (const s of line.spans) {
    if (end > s.start && end <= s.end) tail = s
  }
  if (!head || !tail) return null
  return { x0: head.x0, x1: tail.x1 }
}

/** 把 OCR 的字符串还原成数字，处理千分位被误识别成小数点的情况 */
export function parseOcrNumber(raw: string): { value: number; percent: boolean } | null {
  let t = raw.replace(/[\s,，]/g, '').replace(/[¥￥$]/g, '')
  const percent = t.includes('%')
  t = t.replace(/%/g, '')
  // OCR 有时会把正号识别出来；Number('+4.1') 是合法的
  t = t.replace(/^\+/, '')
  // 「1.8825(11-03)」这种带日期的净值：只取括号前的数字
  t = t.replace(/[（(].*$/, '')

  // 「1.209.70」→ 1209.70：两位小数的金额被识别成了两个点
  if (/^\d{1,3}\.\d{3}\.\d{1,2}$/.test(t)) {
    t = t.replace('.', '')
  }

  if (!/^-?\d+(?:\.\d+)?$/.test(t)) return null
  const value = Number(t)
  if (!Number.isFinite(value)) return null
  return { value, percent }
}

interface Picked {
  value: number
  conf: number
}

/** 在标签下方 1–2 行里，找与标签 x 区间重叠最多的那个数值 */
function pickValue(
  lines: Line[],
  lineIndex: number,
  x0: number,
  x1: number,
): Picked | null {
  const width = Math.max(1, x1 - x0)

  // ① 同一行、标签右侧
  const sameLine = lines[lineIndex].words
    .filter((w) => w.x0 >= x1 - 2)
    .sort((a, b) => a.x0 - b.x0)
  for (const w of sameLine) {
    const parsed = parseOcrNumber(w.text)
    if (parsed) return { value: parsed.value, conf: w.conf ?? 0 }
  }

  // ② 下面 1–2 行、同一列
  let best: { overlap: number; pick: Picked } | null = null

  for (let d = 1; d <= 2 && lineIndex + d < lines.length; d++) {
    const line = lines[lineIndex + d]
    // 距离太远就停（防止跨到下一个字段块）
    if (line.y0 - lines[lineIndex].y1 > 120) break

    for (const w of line.words) {
      const overlap = Math.min(x1, w.x1) - Math.max(x0, w.x0)
      if (overlap <= width * 0.25) continue
      const parsed = parseOcrNumber(w.text)
      if (parsed && (!best || overlap > best.overlap)) {
        best = { overlap, pick: { value: parsed.value, conf: w.conf ?? 0 } }
      }
    }
  }

  return best ? best.pick : null
}

function findLabel(
  lines: Line[],
  aliases: string[],
): { lineIndex: number; x0: number; x1: number } | null {
  for (const alias of aliases) {
    for (let i = 0; i < lines.length; i++) {
      const idx = lines[i].text.indexOf(alias)
      if (idx < 0) continue
      const range = xRangeFor(lines[i], idx, idx + alias.length)
      if (range) return { lineIndex: i, ...range }
    }
  }
  return null
}

/** 合理区间校验：OCR 偶尔会吐出「32353740 这样的成本」，必须挡掉 */
const PLAUSIBLE: Record<FieldKey, (v: number) => boolean> = {
  shares: (v) => v > 0 && v < 1e8,
  costPerShare: (v) => v > 0.001 && v < 1000,
  holdDays: (v) => v >= 0 && v < 20000,
  weightPct: (v) => v >= 0 && v <= 100,
  marketValue: (v) => v > 0 && v < 1e9,
  nav: (v) => v > 0.01 && v < 1000,
  returnRatePct: (v) => v > -100 && v < 1000,
  dayChangePct: (v) => v > -100 && v < 100,
}

/** 低于这个置信度的词不可信 */
const MIN_CONF = 20

/**
 * 只从页面上部 / 基金名附近找 6 位代码。
 * 全场乱找会把金额、日期里的 6 位数字误当代码；找不到就空着，不猜。
 */
function pickCode(
  words: OcrWord[],
  nameLine: Line | undefined,
  pageBottom: number,
): { code: string; conf: number } | null {
  const candidates: { code: string; conf: number; top: number; near: number }[] = []

  for (const w of words) {
    const text = w.text.trim().replace(/[.。:：,，]+$/, '')
    // 只认「6 位数字」或「6 位数字 + A/C 类别后缀」，
    // 避免把 123456.78 这类金额的整数部分当成代码
    const m = text.match(/^(\d{6})(?:[A-Ca-c])?$/)
    if (!m) continue
    const conf = w.conf ?? 0
    if (conf < MIN_CONF) continue

    const y = (w.y0 + w.y1) / 2
    const top = pageBottom > 0 ? y / pageBottom : 1
    const near = nameLine
      ? Math.abs(y - (nameLine.y0 + nameLine.y1) / 2)
      : Number.POSITIVE_INFINITY
    candidates.push({ code: m[1], conf, top, near })
  }

  if (!candidates.length) return null

  // 优先页面上部（标题/代码行），再优先离基金名近的
  const header = candidates.filter((c) => c.top <= 0.45)
  const pool = header.length ? header : candidates.filter((c) => c.near <= 240)
  if (!pool.length) return null

  pool.sort((a, b) => a.near - b.near || b.conf - a.conf)
  return { code: pool[0].code, conf: pool[0].conf }
}

export function parseLayout(words: OcrWord[]): LayoutResult {
  const lines = groupLines(words)
  const result: LayoutResult = { matched: [], conf: {} }

  for (const field of FIELD_LABELS) {
    const hit = findLabel(lines, field.aliases)
    if (!hit) continue
    const picked = pickValue(lines, hit.lineIndex, hit.x0, hit.x1)
    if (!picked) continue
    if ((picked.conf ?? 0) < MIN_CONF) continue

    const value = picked.value
    if (!PLAUSIBLE[field.key](value)) continue

    if (field.key === 'shares') result.shares = value
    else if (field.key === 'costPerShare') result.costPerShare = value
    else if (field.key === 'holdDays') result.holdDays = Math.round(value)
    else if (field.key === 'weightPct') result.weightPct = value
    else if (field.key === 'marketValue') result.marketValue = value
    else if (field.key === 'nav') result.nav = value
    else if (field.key === 'returnRatePct') result.returnRatePct = value
    else if (field.key === 'dayChangePct') result.dayChangePct = value

    result.conf[field.key] = picked.conf
    result.matched.push(field.key)
  }

  // 基金名称：优先取页面上部、不像图表图例的那一行
  const pageBottom = lines.reduce((max, l) => Math.max(max, l.y1), 0)
  const nameCandidates = lines.filter(
    (l) =>
      l.text.length >= 4 &&
      l.text.length <= 40 &&
      /(基金|ETF|联接|混合|债券|指数|股票|货币)/.test(l.text) &&
      !/本基金|同类|平均|涨跌|净值|收益|份额|金额|占比|成本|天数|明细|计划/.test(l.text),
  )
  const nameLine =
    nameCandidates.find((l) => pageBottom > 0 && l.y0 / pageBottom < 0.35) ?? nameCandidates[0]

  if (nameLine) {
    result.name = nameLine.text
      .replace(/\s+/g, '')
      .replace(/详情[>›»]?$/, '')
      .replace(/[>›»]+$/, '')
    result.shareClass = inferShareClass(result.name) ?? undefined
  }

  const code = pickCode(words, nameLine, pageBottom)
  if (code) {
    result.code = code.code
    result.conf.code = code.conf
  }

  // 没读到净值时，用「单位成本 × (1 + 收益率)」反推
  if (result.nav == null && result.costPerShare != null && result.returnRatePct != null) {
    const derived = result.costPerShare * (1 + result.returnRatePct / 100)
    if (PLAUSIBLE.nav(derived)) {
      result.nav = Number(derived.toFixed(4))
      result.matched.push('nav')
      result.conf.nav = Math.min(result.conf.costPerShare ?? 0, result.conf.returnRatePct ?? 0)
    }
  }

  // 「持仓成本」在各家含义不同：天天基金是每份成本，腾讯是总成本。
  // 用「市值 ÷ 份额」得到的净值做参照，差两个数量级就判定为总成本，丢掉。
  if (result.costPerShare != null && result.marketValue != null && result.shares) {
    const impliedNav = result.marketValue / result.shares
    if (impliedNav > 0) {
      const ratio = result.costPerShare / impliedNav
      if (ratio > 20 || ratio < 0.05) {
        delete result.costPerShare
        result.matched = result.matched.filter((k) => k !== 'costPerShare')
        delete result.conf.costPerShare
      }
    }
  }

  // 「份额 × 单位成本 × (1+收益率)」应该等于市值。三个数能对上才可信，
  // 差太多说明某个数字被 OCR 读错了（常见是少一位/多一位）。
  if (
    result.marketValue != null &&
    result.shares != null &&
    result.costPerShare != null &&
    result.returnRatePct != null
  ) {
    const expected = result.shares * result.costPerShare * (1 + result.returnRatePct / 100)
    const err = Math.abs(result.marketValue - expected) / Math.max(1, expected)
    if (err > 0.3) {
      delete result.marketValue
      result.matched = result.matched.filter((k) => k !== 'marketValue')
      delete result.conf.marketValue
    }
  }

  return result
}
