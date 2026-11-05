import type { ShareClass } from './types'

/**
 * 从基金名称后缀推断 A/C 类别。
 *
 * 只认名称结尾的 A / C / A类 / C类（允许全角与右括号），
 * 避免把 QDII、FOF、ETF 这类结尾误判成类别。
 *
 * 推断不出来返回 null——调用方必须让用户手选，不能静默默认 A：
 * A/C 的赎回费差异很大，默认错比空着更危险。
 */
export function inferShareClass(name?: string): ShareClass | null {
  if (!name) return null
  const compact = name.replace(/\s+/g, '')
  if (/(?:C|Ｃ)(?:类)?[)）]?$/.test(compact)) return 'C'
  if (/(?:A|Ａ)(?:类)?[)）]?$/.test(compact)) return 'A'
  return null
}
