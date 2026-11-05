/**
 * 生成 .ics 日历事件（RFC 5545）。
 *
 * 没有后端就发不了推送，于是把「费率跳档日」交给用户自己的日历。
 * 零成本、跨平台、用户可控，也不需要在服务端存任何东西。
 */

export interface IcsEvent {
  uid: string
  /** 事件日期（本地时区，按整天处理） */
  date: Date
  summary: string
  description: string
}

const encoder = new TextEncoder()

/** 转义 RFC 5545 的保留字符 */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 本地日期 -> YYYYMMDD */
export function icsDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

/** UTC 时间 -> YYYYMMDDTHHMMSSZ */
export function icsStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

/**
 * 按 75 字节折行（RFC 5545 要求），中文一个字符占 3 字节，不能按字符数折。
 */
function foldLine(line: string): string {
  const parts: string[] = []
  let current = ''
  let bytes = 0

  for (const ch of line) {
    const size = encoder.encode(ch).length
    if (bytes + size > 74 && current.length > 0) {
      parts.push(current)
      current = ' ' + ch
      bytes = 1 + size
    } else {
      current += ch
      bytes += size
    }
  }
  parts.push(current)
  return parts.join('\r\n')
}

export function buildIcs(events: IcsEvent[], now: Date = new Date()): string {
  const stamp = icsStamp(now)
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//jiancang//减仓计算器//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const event of events) {
    const end = new Date(event.date)
    end.setDate(end.getDate() + 1)

    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(event.date)}`,
      `DTEND;VALUE=DATE:${icsDate(end)}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
      `DESCRIPTION:${escapeIcsText(event.description)}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/** 费率跳档事件的日期：今天 + 还差的天数 */
export function feeDropDate(daysToNextTier: number, now: Date = new Date()): Date {
  const d = new Date(now)
  d.setDate(d.getDate() + Math.max(0, Math.ceil(daysToNextTier)))
  return d
}
