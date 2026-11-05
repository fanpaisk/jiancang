import { useCallback, useEffect, useRef, useState } from 'react'
import type { LayoutResult } from '../core/layout'
import type { ParsedHolding } from '../core/parse'
import { recognizeHoldingImage, statusText, type OcrStatus } from '../lib/ocr'

interface Props {
  onApply: (parsed: ParsedHolding) => void
  onClose: () => void
}

type Phase = 'idle' | 'crop' | 'working' | 'done' | 'error'

interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

const FIELD_ROWS: { key: keyof LayoutResult; label: string; format: (v: number) => string }[] = [
  { key: 'shares', label: '份额', format: (v) => v.toFixed(2) },
  { key: 'costPerShare', label: '单位成本', format: (v) => v.toFixed(4) },
  { key: 'holdDays', label: '持有天数', format: (v) => `${Math.round(v)} 天` },
  { key: 'nav', label: '当前净值', format: (v) => v.toFixed(4) },
  { key: 'weightPct', label: '持仓占比', format: (v) => `${v.toFixed(2)}%` },
  { key: 'marketValue', label: '持有金额', format: (v) => `¥${v.toFixed(2)}` },
  { key: 'returnRatePct', label: '收益率', format: (v) => `${v.toFixed(2)}%` },
  {
    key: 'dayChangePct',
    label: '当日涨跌幅',
    format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`,
  },
]

const MIN_BOX = 24

function normalize(r: Rect): Rect {
  return {
    x0: Math.min(r.x0, r.x1),
    y0: Math.min(r.y0, r.y1),
    x1: Math.max(r.x0, r.x1),
    y1: Math.max(r.y0, r.y1),
  }
}

function toParsed(r: LayoutResult): ParsedHolding {
  return {
    name: r.name,
    code: r.code,
    shares: r.shares,
    costPerShare: r.costPerShare,
    holdDays: r.holdDays,
    marketValue: r.marketValue,
    nav: r.nav,
    weight: r.weightPct != null ? r.weightPct / 100 : undefined,
    returnRate: r.returnRatePct != null ? r.returnRatePct / 100 : undefined,
    shareClass: r.shareClass,
    dayChange: r.dayChangePct != null ? r.dayChangePct / 100 : undefined,
  }
}

export function OcrImport({ onApply, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [status, setStatus] = useState<OcrStatus>('loading-engine')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<LayoutResult | null>(null)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [disp, setDisp] = useState<{ w: number; h: number } | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)

  const dragStart = useRef<Rect | null>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const pick = useCallback((f: File) => {
    setFile(f)
    setResult(null)
    setRect(null)
    setError('')
    setNatural(null)
    setDisp(null)
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(f)
    })
    setPhase('crop')
  }, [])

  // 支持直接 Ctrl+V 粘贴截图
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? [])
      const imageItem = items.find((i) => i.type.startsWith('image/'))
      const pasted = imageItem?.getAsFile()
      if (pasted) {
        e.preventDefault()
        pick(pasted)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [pick])

  const run = useCallback(
    async (target: File, box: Rect | null) => {
      setPhase('working')
      setError('')
      setResult(null)
      setProgress(0)
      setStatus('loading-engine')

      const crop =
        box && disp && natural
          ? {
              x: Math.round((box.x0 / disp.w) * natural.w),
              y: Math.round((box.y0 / disp.h) * natural.h),
              width: Math.round(((box.x1 - box.x0) / disp.w) * natural.w),
              height: Math.round(((box.y1 - box.y0) / disp.h) * natural.h),
            }
          : undefined

      try {
        const res = await recognizeHoldingImage(target, { crop }, (s, p) => {
          setStatus(s)
          setProgress(p)
        })
        setResult(res)
        setPhase('done')
      } catch {
        setError('识别失败。换个更清晰的截图，或者只框住持仓那一块再试。')
        setPhase('error')
      }
    },
    [disp, natural],
  )

  // ── 框选 ──────────────────────────────────────────────────────
  function localPoint(e: React.PointerEvent<HTMLDivElement>) {
    const box = layerRef.current?.getBoundingClientRect()
    if (!box) return { x: 0, y: 0 }
    return {
      x: Math.min(Math.max(e.clientX - box.left, 0), box.width),
      y: Math.min(Math.max(e.clientY - box.top, 0), box.height),
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e)
    const next = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
    dragStart.current = next
    setRect(next)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return
    const p = localPoint(e)
    setRect({ ...dragStart.current, x1: p.x, y1: p.y })
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return
    const p = localPoint(e)
    const box = normalize({ ...dragStart.current, x1: p.x, y1: p.y })
    dragStart.current = null
    if (box.x1 - box.x0 < MIN_BOX || box.y1 - box.y0 < MIN_BOX) setRect(null)
    else setRect(box)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  const matched = result?.matched.length ?? 0
  // 只有认出「份额 + 成本（或净值）」才允许覆盖表单，避免把用户手填的数清光
  const canApply =
    result != null &&
    result.shares != null &&
    (result.costPerShare != null || result.nav != null || result.marketValue != null)

  return (
    <div className="ocr">
      <div className="ocr-head">
        <span>
          截图识别 <em>首次需加载约 5MB 模型，之后有缓存</em>
        </span>
        <button className="link" type="button" onClick={onClose}>
          关闭
        </button>
      </div>

      {phase === 'idle' ? (
        <button className="ocr-drop" type="button" onClick={() => inputRef.current?.click()}>
          <b>选择截图</b>
          <span>也可以直接 Ctrl+V 粘贴</span>
        </button>
      ) : null}

      {phase === 'crop' ? (
        <>
          <p className="ocr-tip">
            {rect ? (
              <>
                已框选，点右下角开始识别。
                <button className="link" type="button" onClick={() => setRect(null)}>
                  清除
                </button>
              </>
            ) : (
              '在图上框住「持仓卡片」，识别会准很多；不框就识别整张。'
            )}
          </p>

          <div className="crop-box">
            <img
              className="crop-img"
              src={preview ?? ''}
              alt="待识别截图"
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget
                setNatural({ w: img.naturalWidth, h: img.naturalHeight })
                setDisp({ w: img.clientWidth, h: img.clientHeight })
              }}
            />
            <div
              className="crop-layer"
              ref={layerRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {rect ? (
                <div
                  className="crop-sel"
                  style={{
                    left: rect.x0,
                    top: rect.y0,
                    width: rect.x1 - rect.x0,
                    height: rect.y1 - rect.y0,
                  }}
                />
              ) : (
                <span className="crop-hint">拖拽框选</span>
              )}
            </div>
          </div>

          <div className="ocr-actions">
            <button className="ghost" type="button" onClick={() => inputRef.current?.click()}>
              换一张
            </button>
            <button
              className="primary small"
              type="button"
              onClick={() => file && void run(file, rect)}
            >
              {rect ? '识别框选' : '识别整张'}
            </button>
          </div>
        </>
      ) : null}

      {phase === 'working' ? (
        <div
          className="ocr-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label="识别进度"
        >
          <div className="bar">
            <i style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }} />
          </div>
          <span>
            {statusText(status)} {Math.round(progress * 100)}%
          </span>
        </div>
      ) : null}

      {phase === 'error' ? (
        <>
          <p className="error">{error}</p>
          <div className="ocr-actions">
            <button className="ghost" type="button" onClick={() => file && void run(file, rect)}>
              重试
            </button>
            <button className="ghost" type="button" onClick={() => setPhase('crop')}>
              回到框选
            </button>
          </div>
        </>
      ) : null}

      {phase === 'done' && result ? (
        <>
          <dl className="ocr-identity">
            <div>
              <dt>基金名称</dt>
              <dd>{result.name ?? '未识别'}</dd>
            </div>
            <div>
              <dt>代码</dt>
              <dd>{result.code ?? '未识别'}</dd>
            </div>
            <div>
              <dt>份额类别</dt>
              <dd>
                {result.shareClass
                  ? `${result.shareClass} 类（按名称自动识别）`
                  : '未识别，请手动选择 A/C'}
              </dd>
            </div>
          </dl>

          {matched === 0 ? (
            <p className="error">
              没认出持仓字段。回去框住持仓卡片再试，或用「粘贴识别」。
            </p>
          ) : (
            <>
              <ul className="ocr-fields">
                {FIELD_ROWS.map((row) => {
                  const value = result[row.key]
                  if (typeof value !== 'number') return null
                  return (
                    <li key={row.key}>
                      <span>{row.label}</span>
                      <b>{row.format(value)}</b>
                    </li>
                  )
                })}
              </ul>
              <p className="ocr-note">识别结果仅供参考，填入后请核对一遍再算。</p>
              {(() => {
                const missing = [
                  result.shares == null ? '份额' : '',
                  result.costPerShare == null ? '单位成本' : '',
                  result.holdDays == null ? '持有天数' : '',
                ].filter(Boolean)
                if (missing.length === 0) return null
                return (
                  <p className="ocr-note warn">
                    这张图里没有「{missing.join('、')}」。点「填入表单」后这些字段会被清空，需要你手动补。
                  </p>
                )
              })()}
              {!canApply ? (
                <p className="error">
                  至少要有「份额 + 单位成本（或净值）」。先框住持仓卡片重试，或直接手填。
                </p>
              ) : null}
            </>
          )}

          <div className="ocr-actions">
            <button className="ghost" type="button" onClick={() => setPhase('crop')}>
              重新框选
            </button>
            <button
              className="primary small"
              type="button"
              disabled={!canApply}
              onClick={() => {
                onApply(toParsed(result))
                onClose()
              }}
            >
              填入表单
            </button>
          </div>
        </>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const picked = e.target.files?.[0]
          if (picked) pick(picked)
          e.target.value = ''
        }}
      />
    </div>
  )
}
