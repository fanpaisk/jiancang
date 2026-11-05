import { describe, expect, it } from 'vitest'
import { buildIcs, escapeIcsText, feeDropDate, icsDate, icsStamp } from '../ics'

const now = new Date('2026-10-29T05:00:00Z') // 北京时间 13:00

describe('escapeIcsText', () => {
  it('转义反斜杠、分号、逗号、换行', () => {
    expect(escapeIcsText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne')
  })

  it('普通中文不受影响', () => {
    expect(escapeIcsText('赎回费降低 0.25%')).toBe('赎回费降低 0.25%')
  })
})

describe('日期格式', () => {
  it('icsDate 输出 YYYYMMDD', () => {
    expect(icsDate(new Date(2026, 0, 5))).toBe('20260105')
  })

  it('icsStamp 输出 UTC 时间戳', () => {
    expect(icsStamp(now)).toBe('20261029T050000Z')
  })
})

describe('feeDropDate', () => {
  it('从今天往后推 N 天', () => {
    const d = feeDropDate(335, new Date(2026, 9, 29))
    expect(icsDate(d)).toBe('20270929')
  })

  it('小数天数向上取整', () => {
    const d = feeDropDate(1.2, new Date(2026, 9, 29))
    expect(icsDate(d)).toBe('20261031')
  })

  it('负数按 0 处理（不会生成过去的事件）', () => {
    const d = feeDropDate(-5, new Date(2026, 9, 29))
    expect(icsDate(d)).toBe('20261029')
  })
})

describe('buildIcs', () => {
  const ics = buildIcs(
    [
      {
        uid: '017470-20270929@jiancang',
        date: new Date(2027, 8, 29),
        summary: '017470 赎回费降至 0.25%',
        description: '持有满 730 天，费率从 0.5% 降到 0.25%；以平台为准。',
      },
    ],
    now,
  )

  it('包含 VCALENDAR 外壳', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
  })

  it('日期事件用 VALUE=DATE', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20270929')
    expect(ics).toContain('DTEND;VALUE=DATE:20270930')
  })

  it('换行统一为 CRLF', () => {
    expect(ics).toContain('\r\n')
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('描述里的半角分号被转义（用短行避免折行干扰）', () => {
    const small = buildIcs(
      [{ uid: 'x', date: new Date(2027, 0, 1), summary: 'a;b', description: 'c;d,e' }],
      now,
    )
    expect(small).toContain('SUMMARY:a\\;b')
    expect(small).toContain('DESCRIPTION:c\\;d\\,e')
  })

  it('每行不超过 75 字节（按 UTF-8 计）', () => {
    const enc = new TextEncoder()
    for (const line of ics.split('\r\n')) {
      if (line.length === 0) continue
      expect(enc.encode(line).length).toBeLessThanOrEqual(75)
    }
  })

  it('UID 与 DTSTAMP 都存在', () => {
    expect(ics).toContain('UID:017470-20270929@jiancang')
    expect(ics).toContain('DTSTAMP:20261029T050000Z')
  })

  it('多个事件都写入', () => {
    const multi = buildIcs(
      [
        { uid: 'a', date: new Date(2027, 0, 1), summary: 'A', description: '' },
        { uid: 'b', date: new Date(2027, 0, 2), summary: 'B', description: '' },
      ],
      now,
    )
    expect(multi.match(/BEGIN:VEVENT/g)).toHaveLength(2)
  })
})
