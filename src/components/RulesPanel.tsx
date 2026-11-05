import type { ReactNode } from 'react'
import type { RuleParams } from '../core/types'

interface Props {
  rules: RuleParams
  onChange: (next: RuleParams) => void
}

function PctInput({
  value,
  onChange,
  step = 1,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <span className="inline-num">
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        value={Math.round(value * 10000) / 100}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(Math.max(0, n) / 100)
        }}
      />
      <span>%</span>
    </span>
  )
}

function Row({
  title,
  desc,
  enabled,
  onToggle,
  children,
}: {
  title: string
  desc: string
  enabled: boolean
  onToggle: (v: boolean) => void
  children?: ReactNode
}) {
  return (
    <div className={enabled ? 'rule' : 'rule off'}>
      <label className="rule-toggle">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        <span>
          <b>{title}</b>
          <em>{desc}</em>
        </span>
      </label>
      {enabled && children ? <div className="rule-params">{children}</div> : null}
    </div>
  )
}

export function RulesPanel({ rules, onChange }: Props) {
  function patch<K extends keyof RuleParams>(key: K, value: Partial<RuleParams[K]>) {
    onChange({ ...rules, [key]: { ...rules[key], ...value } })
  }

  return (
    <section className="card">
      <details>
        <summary className="rules-summary">
          <h2>高级：自己调参数</h2>
          <span className="muted">改完立刻生效</span>
        </summary>

        <div className="rules">
          <Row
            title="目标仓位"
            desc="占比超过目标就减回目标"
            enabled={rules.targetWeight.enabled}
            onToggle={(v) => patch('targetWeight', { enabled: v })}
          >
            <label className="param">
              目标占比 <PctInput value={rules.targetWeight.weight} onChange={(v) => patch('targetWeight', { weight: v })} />
            </label>
          </Row>

          <Row
            title="目标止盈"
            desc="收益率达标后按比例减仓"
            enabled={rules.takeProfit.enabled}
            onToggle={(v) => patch('takeProfit', { enabled: v })}
          >
            <label className="param">
              目标收益率{' '}
              <PctInput value={rules.takeProfit.targetRate} onChange={(v) => patch('takeProfit', { targetRate: v })} />
            </label>
            <label className="param">
              达标减{' '}
              <PctInput value={rules.takeProfit.reducePct} onChange={(v) => patch('takeProfit', { reducePct: v })} />
            </label>
          </Row>

          <Row
            title="回撤止盈"
            desc="从历史最高净值回落就减，专治浮盈回吐"
            enabled={rules.trailingStop.enabled}
            onToggle={(v) => patch('trailingStop', { enabled: v })}
          >
            <label className="param">
              回撤阈值 <PctInput value={rules.trailingStop.drawdown} onChange={(v) => patch('trailingStop', { drawdown: v })} />
            </label>
            <label className="param">
              触发减 <PctInput value={rules.trailingStop.reducePct} onChange={(v) => patch('trailingStop', { reducePct: v })} />
            </label>
          </Row>

          <Row
            title="收回本金"
            desc="卖出成本额，剩下的都是利润"
            enabled={rules.recoverPrincipal.enabled}
            onToggle={(v) => patch('recoverPrincipal', { enabled: v })}
          />

          <Row
            title="止损线"
            desc="亏损超过阈值按比例减仓"
            enabled={rules.stopLoss.enabled}
            onToggle={(v) => patch('stopLoss', { enabled: v })}
          >
            <label className="param">
              亏损超过 <PctInput value={rules.stopLoss.lossRate} onChange={(v) => patch('stopLoss', { lossRate: v })} />
            </label>
            <label className="param">
              触发减 <PctInput value={rules.stopLoss.reducePct} onChange={(v) => patch('stopLoss', { reducePct: v })} />
            </label>
          </Row>
        </div>
      </details>
    </section>
  )
}
