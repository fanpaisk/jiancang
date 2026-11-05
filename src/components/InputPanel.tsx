import { useState } from 'react'
import { tierLabel } from '../core/fee'
import { fmtPct } from '../core/format'
import { hasEnoughToCompute, parseHoldingText, type ParsedHolding } from '../core/parse'
import type { FeeInfo } from '../core/types'
import type { FormState } from '../state'
import { Field } from './Field'
import { GuideFigure } from './GuideFigure'
import { OcrImport } from './OcrImport'

interface Props {
  form: FormState
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void
  fee: FeeInfo
  onApplyParsed: (parsed: ParsedHolding) => void
  onExample: () => void
}

export function InputPanel({ form, set, fee, onApplyParsed, onExample }: Props) {
  const [pasteOpen, setPasteOpen] = useState(false)
  const [ocrOpen, setOcrOpen] = useState(false)
  const [paste, setPaste] = useState('')
  const [error, setError] = useState('')

  function handleParse() {
    const parsed = parseHoldingText(paste)
    if (!hasEnoughToCompute(parsed)) {
      setError('没认出「份额 + 成本」，换个持仓页再复制一次试试')
      return
    }
    onApplyParsed(parsed)
    setPaste('')
    setError('')
    setPasteOpen(false)
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>持仓</h2>
        <div className="head-actions">
          <button className="ghost" onClick={onExample} type="button">
            载入示例
          </button>
          <button
            className={pasteOpen ? 'ghost active' : 'ghost'}
            onClick={() => {
              setPasteOpen((v) => !v)
              setOcrOpen(false)
            }}
            type="button"
          >
            粘贴识别
          </button>
          <button
            className={ocrOpen ? 'ghost active' : 'ghost'}
            onClick={() => {
              setOcrOpen((v) => !v)
              setPasteOpen(false)
            }}
            type="button"
          >
            截图识别
          </button>
        </div>
      </div>

      {ocrOpen ? (
        <OcrImport onApply={onApplyParsed} onClose={() => setOcrOpen(false)} />
      ) : null}

      {pasteOpen ? (
        <div className="paste">
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="在 App 的持仓页长按全选、复制，粘贴到这里。例如：&#10;持有金额 1,209.70&#10;持有份额 591.28&#10;持仓成本 2.9833&#10;持有天数 107"
            rows={5}
          />
          <div className="paste-actions">
            <span className="error">{error}</span>
            <button className="primary small" onClick={handleParse} type="button">
              识别并填入
            </button>
          </div>
        </div>
      ) : null}

      <p className="section-label">必填 · 四个数</p>
      <div className="grid2">
        <Field label="份额" value={form.shares} onChange={(v) => set('shares', v)} />
        <Field
          label="单位成本"
          value={form.costPerShare}
          onChange={(v) => set('costPerShare', v)}
        />
        <Field label="当前净值" value={form.nav} onChange={(v) => set('nav', v)} />
        <Field
          label="持有天数"
          value={form.holdDays}
          onChange={(v) => set('holdDays', v)}
          inputMode="numeric"
        />
        <div className="field">
          <span className="field-label">份额类别</span>
          <div className="segment" role="group" aria-label="份额类别">
            {(['A', 'C'] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={form.shareClass === k ? 'active' : ''}
                onClick={() => set('shareClass', k)}
              >
                {k} 类
              </button>
            ))}
          </div>
        </div>
        <Field
          label="赎回费率"
          value={form.feeOverride}
          onChange={(v) => set('feeOverride', v)}
          placeholder={(fee.tier.rate * 100).toFixed(2)}
          suffix="%"
        />
      </div>

      <p className="fee-hint">
        {fee.isOverride ? (
          <>
            费率用了你填的 <b>{fmtPct(fee.rate)}</b>，以平台为准。
          </>
        ) : (
          <>
            费率按 {form.shareClass} 类「{tierLabel(fee.tier)}」估算 <b>{fmtPct(fee.tier.rate)}</b>
            ，卖出页上那个数更准。留空即用估算。
          </>
        )}
      </p>
      <p className="fee-hint">净值用最新公布值，15:00 前赎回按当日净值，之后按下一交易日。</p>

      <p className="section-label">选填 · 填了更准</p>
      <div className="grid2">
        <Field
          label="当前占比"
          value={form.currentWeight}
          onChange={(v) => set('currentWeight', v)}
          suffix="%"
        />
        <Field
          label="历史最高净值"
          value={form.peakNav}
          onChange={(v) => set('peakNav', v)}
        />
        <Field
          label="基金名称"
          wide
          value={form.name}
          onChange={(v) => set('name', v)}
          placeholder="选填"
          inputMode="text"
        />
        <Field
          label="代码"
          wide
          value={form.code}
          onChange={(v) => set('code', v)}
          placeholder="选填"
          inputMode="numeric"
        />
      </div>

      <details className="guide-wrap">
        <summary>不知道这些数在哪找？看这张图</summary>
        <GuideFigure />
      </details>
    </section>
  )
}
