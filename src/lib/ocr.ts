/**
 * 浏览器端 OCR。
 *
 * 全部资源自托管：jsdelivr 在国内被墙，默认 CDN 路径不可用，
 * 所以引擎（worker + wasm）和中文模型都从本站加载。
 * 首次识别约需下载 5MB，之后走缓存。
 */
import type { Worker } from 'tesseract.js'
import {
  FIELD_KEYS,
  parseLayout,
  type LayoutResult,
  type OcrWord,
} from '../core/layout'

export type OcrStatus =
  | 'loading-engine'
  | 'loading-model'
  | 'recognizing'
  | 'done'

const STATUS_TEXT: Record<OcrStatus, string> = {
  'loading-engine': '加载识别引擎',
  'loading-model': '加载中文模型',
  recognizing: '识别中',
  done: '完成',
}

export function statusText(s: OcrStatus): string {
  return STATUS_TEXT[s]
}

let workerPromise: Promise<Worker> | null = null
let onStatus: ((status: OcrStatus, progress: number) => void) | null = null

function emit(status: OcrStatus, progress: number) {
  onStatus?.(status, progress)
}

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      // 动态引入：tesseract.js 只在用户真的点「截图识别」时才加载，
      // 主包体积不受影响
      const { createWorker } = await import('tesseract.js')
      return createWorker('chi_sim', 1, {
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract',
        langPath: '/tessdata',
        logger: (m) => {
          const progress = typeof m.progress === 'number' ? m.progress : 0
          if (m.status === 'recognizing text') emit('recognizing', progress)
          else if (m.status === 'loading language traineddata') emit('loading-model', progress)
          else if (
            m.status === 'loading tesseract core' ||
            m.status === 'initializing tesseract'
          ) {
            emit('loading-engine', progress)
          }
        },
      })
    })().catch((err) => {
      // 失败后允许重试：把缓存的 promise 清掉
      workerPromise = null
      throw err
    })
  }
  return workerPromise
}

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface RecognizeOptions {
  /** 用户框选的区域（原图像素坐标）。不传就识别整张 */
  crop?: CropRect
}

/** 小图放大再识别，手机上截的小图识别率明显更高 */
async function prepareImage(file: Blob, crop?: CropRect): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)

  const sx = crop ? Math.max(0, Math.min(crop.x, bitmap.width - 1)) : 0
  const sy = crop ? Math.max(0, Math.min(crop.y, bitmap.height - 1)) : 0
  const sw = crop
    ? Math.max(1, Math.min(crop.width, bitmap.width - sx))
    : bitmap.width
  const sh = crop
    ? Math.max(1, Math.min(crop.height, bitmap.height - sy))
    : bitmap.height

  // 框选区域通常不大，放大到 900px 宽能显著提升小字识别率
  const target = crop ? 900 : 800
  const scale = Math.min(2.5, Math.max(1, target / sw))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw * scale)
  canvas.height = Math.round(sh * scale)

  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  }
  bitmap.close?.()
  return canvas
}

interface TessWord {
  text: string
  confidence: number
  bbox: { x0: number; x1: number; y0: number; y1: number }
}
interface TessLine {
  words?: TessWord[]
}
interface TessParagraph {
  lines?: TessLine[]
}
interface TessBlock {
  paragraphs?: TessParagraph[]
}

function extractWords(data: unknown): OcrWord[] {
  const blocks = (data as { blocks?: TessBlock[] }).blocks ?? []
  const out: OcrWord[] = []

  for (const block of blocks) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const w of line.words ?? []) {
          const text = w.text?.trim()
          if (!text || !w.bbox) continue
          out.push({
            text,
            x0: w.bbox.x0,
            x1: w.bbox.x1,
            y0: w.bbox.y0,
            y1: w.bbox.y1,
            conf: w.confidence,
          })
        }
      }
    }
  }
  return out
}

/**
 * 分带：很多 App 的持仓卡片是一整块彩色区域，tesseract 会把它当成图片整块跳过。
 * 裁成横条之后，这块区域就变成「文字区域」了。三带重叠，保证卡片一定被完整包含。
 */
const BANDS: [number, number][] = [
  [0, 0.46],
  [0, 0.35],
  [0, 0.5],
  [0.15, 0.55],
  [0.3, 0.7],
  [0.5, 1],
]

export async function recognizeHoldingImage(
  file: Blob,
  options: RecognizeOptions = {},
  onProgress?: (status: OcrStatus, progress: number) => void,
): Promise<LayoutResult> {
  onStatus = onProgress ?? null
  emit('loading-engine', 0)

  try {
    const worker = await getWorker()
    const base = await prepareImage(file, options.crop)

    emit('recognizing', 0)
    let result = await runPass(worker, base)

    // 整张图就够了就别再折腾（浅色布局一般一次成功）
    if (result.matched.length < 4) {
      for (let i = 0; i < BANDS.length; i++) {
        emit('recognizing', (i + 1) / (BANDS.length + 1))
        const band = cropBand(base, BANDS[i][0], BANDS[i][1])
        result = mergeResults(result, await runPass(worker, band))
        if (result.matched.length >= 4) break
      }
    }

    emit('done', 1)
    return result
  } finally {
    onStatus = null
  }
}

async function runPass(worker: Worker, canvas: HTMLCanvasElement): Promise<LayoutResult> {
  const { data } = await worker.recognize(canvas, {}, { blocks: true })
  return parseLayout(extractWords(data))
}

/** 裁出横向条带；宽度不足时放大，提升小字识别率 */
function cropBand(src: HTMLCanvasElement, from: number, to: number): HTMLCanvasElement {
  const y0 = Math.round(src.height * from)
  const y1 = Math.round(src.height * to)
  const height = Math.max(1, y1 - y0)
  const scale = Math.min(2, Math.max(1, 1000 / src.width))

  const out = document.createElement('canvas')
  out.width = Math.round(src.width * scale)
  out.height = Math.round(height * scale)

  const ctx = out.getContext('2d')
  if (ctx) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(src, 0, y0, src.width, height, 0, 0, out.width, out.height)
  }
  return out
}

/** 多遍识别的结果按字段合并：同名字段取置信度高的那个 */
function mergeResults(a: LayoutResult, b: LayoutResult): LayoutResult {
  const out: LayoutResult = { matched: [], conf: {} }
  const sink = out as unknown as Record<string, unknown>

  for (const key of FIELD_KEYS) {
    const va = a[key]
    const vb = b[key]
    const hasA = typeof va === 'number'
    const hasB = typeof vb === 'number'
    if (!hasA && !hasB) continue

    let value: number
    let conf: number
    if (!hasA) {
      value = vb as number
      conf = b.conf[key] ?? 0
    } else if (!hasB) {
      value = va as number
      conf = a.conf[key] ?? 0
    } else {
      const ca = a.conf[key] ?? 0
      const cb = b.conf[key] ?? 0
      value = cb > ca ? (vb as number) : (va as number)
      conf = Math.max(ca, cb)
    }

    sink[key] = value
    out.conf[key] = conf
    out.matched.push(key)
  }

  out.name = a.name ?? b.name

  const ca = a.conf.code ?? 0
  const cb = b.conf.code ?? 0
  if (a.code && b.code) {
    out.code = cb > ca ? b.code : a.code
  } else {
    out.code = a.code ?? b.code
  }
  if (out.code) out.conf.code = Math.max(ca, cb)

  // 类别是字符串字段，不走数值合并；两遍识别取先命中的
  out.shareClass = a.shareClass ?? b.shareClass
  return out
}
