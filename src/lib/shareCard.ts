/**
 * 分享卡片：把一次试算结果画成一张 1080×1080 的图。
 *
 * 为什么用 canvas 手绘而不是截图 DOM：
 * 零依赖、不受样式影响、生成的是可以直接发给朋友的图。
 * 在中文内容生态里，图片比链接好传播得多。
 */

import { fmtMoney, fmtPct, fmtShares } from '../core/format'

export interface ShareCardData {
  presetName?: string
  fundName?: string
  sellPct: number
  sellShares: number
  sellAmount: number
  feeRate: number
  fee: number
  netProceeds: number
  afterWeight: number | null
  siteUrl?: string
  isDemo?: boolean
}

const W = 1080
const H = 1080
const PAD = 104
const FONT = '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", system-ui, sans-serif'

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function text(
  ctx: CanvasRenderingContext2D,
  content: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'left',
): void {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(content, x, y)
}

function truncate(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string {
  if (ctx.measureText(value).width <= maxWidth) return value
  let out = value
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1)
  }
  return `${out}…`
}

export function renderShareCard(data: ShareCardData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // 背景
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#eef4ff')
  bg.addColorStop(1, '#f8fbff')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // 白卡片
  ctx.save()
  ctx.shadowColor = 'rgba(15, 23, 42, 0.10)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 12
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, 40, 40, W - 80, H - 80, 44)
  ctx.fill()
  ctx.restore()

  // 顶部标识
  ctx.fillStyle = '#2563eb'
  roundRect(ctx, PAD, 96, 236, 52, 26)
  ctx.fill()
  text(ctx, '减仓计算器', PAD + 24, 132, `600 26px ${FONT}`, '#ffffff')

  // 演示数据要一眼看出来，避免被当成真实持仓转发
  if (data.isDemo) {
    text(ctx, '示例数据 · 非真实持仓', W - PAD, 132, `500 24px ${FONT}`, '#b45309', 'right')
  }

  // 基金名
  if (data.fundName) {
    text(
      ctx,
      truncate(ctx, data.fundName, W - PAD * 2),
      PAD,
      216,
      `400 32px ${FONT}`,
      '#64748b',
    )
  }

  // 主结论
  text(ctx, '按规则应减', PAD, 320, `400 32px ${FONT}`, '#94a3b8')
  text(ctx, fmtPct(data.sellPct, 0), PAD - 6, 560, `800 240px ${FONT}`, '#2563eb')

  // 关键金额
  text(
    ctx,
    `卖出 ${fmtShares(data.sellShares)} 份 · 净到手 ¥${fmtMoney(data.netProceeds)}`,
    PAD,
    640,
    `500 36px ${FONT}`,
    '#0f172a',
  )

  // 分隔线
  ctx.strokeStyle = '#e6ebf2'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, 700)
  ctx.lineTo(W - PAD, 700)
  ctx.stroke()

  // 三列明细
  const cols: { label: string; value: string }[] = [
    { label: '赎回费率', value: fmtPct(data.feeRate) },
    { label: '赎回费', value: `¥${fmtMoney(data.fee)}` },
    {
      label: '减完占比',
      value: data.afterWeight == null ? '—' : fmtPct(data.afterWeight),
    },
  ]
  cols.forEach((col, i) => {
    const x = PAD + i * 292
    text(ctx, col.label, x, 770, `400 24px ${FONT}`, '#94a3b8')
    text(ctx, col.value, x, 816, `700 40px ${FONT}`, '#0f172a')
  })

  // 口径与免责
  text(
    ctx,
    data.presetName ? `按「${data.presetName}」规则计算` : '按自定义规则计算',
    PAD,
    916,
    `400 24px ${FONT}`,
    '#64748b',
  )
  text(
    ctx,
    '费率以平台为准 · 不构成投资建议',
    PAD,
    962,
    `400 22px ${FONT}`,
    '#a8b5c7',
  )
  if (data.siteUrl) {
    text(
      ctx,
      data.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      PAD,
      1010,
      `500 24px ${FONT}`,
      '#2563eb',
    )
  }

  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => resolve(blob), 'image/png')
    } else {
      resolve(null)
    }
  })
}
