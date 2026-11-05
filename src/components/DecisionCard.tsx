import { fmtMoney, fmtPct, fmtShares, fmtSignedMoney } from '../core/format'
import type { FeeInfo, Position, Recommendation, RuleResult, SellPlan } from '../core/types'

interface Props {
  pos: Position
  plan: SellPlan
  fee: FeeInfo
  rec: Recommendation
  results: RuleResult[]
  sellPct: number
  isManual: boolean
  ready: boolean
  /** 该基金占全部持仓的比例；未知传 null */
  currentWeight: number | null
  /** 按当前减仓比例卖出后的占比；未填占比时为 null */
  afterWeight: number | null
  onSellPct: (pct: number) => void
  onReset: () => void
  onAddToCalendar: () => void
  onShare: () => void
  /** 空状态时跳回输入页 */
  onGoInput?: () => void
  /** 当前命中的流派名；自定义时为 undefined */
  presetName?: string
}

const PRESETS: { label: string; value: number }[] = [
  { label: '不减', value: 0 },
  { label: '25%', value: 0.25 },
  { label: '1/3', value: 1 / 3 },
  { label: '一半', value: 0.5 },
  { label: '清仓', value: 1 },
]

export function DecisionCard({
  pos,
  plan,
  fee,
  rec,
  results,
  sellPct,
  isManual,
  ready,
  currentWeight,
  afterWeight,
  onSellPct,
  onReset,
  onAddToCalendar,
  onShare,
  onGoInput,
  presetName,
}: Props) {
  if (!ready) {
    return (
      <section className="card empty">
        <h2>结果</h2>
        <p>
          填入 <b>份额</b> 和 <b>单位成本</b>，这里会告诉你该减多少、要付多少费。
        </p>
        {onGoInput ? (
          <button className="page-cta" type="button" onClick={onGoInput}>
            去填持仓
          </button>
        ) : null}
      </section>
    )
  }

  const nextTier = fee.nextTier
  const canWait = nextTier != null && fee.daysToNextTier != null && fee.rateDelta > 0
  const savings = plan.sellAmount * Math.max(0, fee.rateDelta)
  const pnlClass = pos.pnl >= 0 ? 'up' : 'down'
  const realizedClass = plan.realizedPnl >= 0 ? 'up' : 'down'
  const shownPct = Math.round(sellPct * 100)

  return (
    <section className="card">
      <div className="card-head">
        <h2>结果</h2>
        <span className="muted">数据只在本机</span>
      </div>

      <div className="verdict">
        <div className="verdict-label">
          <span>按规则应减</span>
          {presetName ? <span className="verdict-preset">· {presetName}</span> : null}
        </div>
        <div className="verdict-value">{fmtPct(rec.recommendedPct, 0)}</div>
        {rec.hasSignal && rec.maxPct - rec.minPct > 0.005 ? (
          <div className="verdict-range">
            区间 {fmtPct(rec.minPct, 0)} – {fmtPct(rec.maxPct, 0)}
          </div>
        ) : (
          <div className="verdict-range">
            {rec.hasSignal ? '只有一条规则被触发' : '没有规则被触发，暂不需要减仓'}
          </div>
        )}
      </div>

      {!rec.hasSignal && rec.nearest ? (
        <p className="nearest">
          最近的一条：<b>{rec.nearest.label}</b> · {rec.nearest.gapLabel}
        </p>
      ) : null}

      <ul className="rule-status">
        {results
          .filter((r) => r.enabled)
          .map((r) => (
            <li key={r.id} className={r.triggered ? 'hit' : r.gap == null ? 'idle' : ''}>
              <span className="dot" aria-hidden>
                {r.triggered ? '✓' : '·'}
              </span>
              <span className="rule-name">{r.label}</span>
              <span className="rule-note">
                {r.triggered ? `减 ${fmtPct(r.reducePct, 0)}` : r.gapLabel || r.detail}
              </span>
            </li>
          ))}
      </ul>

      <div className="slider-block">
        <div className="slider-head">
          <span>
            减仓比例 <b>{shownPct}%</b>
            {isManual ? <span className="badge">手动</span> : null}
          </span>
          {isManual ? (
            <button className="link" type="button" onClick={onReset}>
              恢复规则值
            </button>
          ) : null}
        </div>
        <input
          className="slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={shownPct}
          aria-label="减仓比例"
          onChange={(e) => onSellPct(Number(e.target.value) / 100)}
        />
        <div className="presets">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={Math.abs(sellPct - p.value) < 0.005 ? 'preset active' : 'preset'}
              onClick={() => onSellPct(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <dl className="kv">
        <div>
          <dt>卖出份额</dt>
          <dd>{fmtShares(plan.sellShares)}</dd>
        </div>
        <div>
          <dt>卖出金额</dt>
          <dd>¥{fmtMoney(plan.sellAmount)}</dd>
        </div>
        <div>
          <dt>赎回费率</dt>
          <dd>
            {fmtPct(plan.feeRate)}
            <span className={fee.isOverride ? 'badge ok' : 'badge'}>
              {fee.isOverride ? '手填' : '估算'}
            </span>
          </dd>
        </div>
        <div>
          <dt>赎回费</dt>
          <dd>¥{fmtMoney(plan.fee)}</dd>
        </div>
        <div>
          <dt>净到手</dt>
          <dd className="strong">¥{fmtMoney(plan.netProceeds)}</dd>
        </div>
        <div>
          <dt>实现盈亏</dt>
          <dd className={realizedClass}>¥{fmtSignedMoney(plan.realizedPnl)}</dd>
        </div>
        <div>
          <dt>减完剩余份额</dt>
          <dd>{fmtShares(plan.remainingShares)}</dd>
        </div>
        <div>
          <dt>剩余成本</dt>
          <dd>¥{fmtMoney(plan.remainingCost)}</dd>
        </div>
      </dl>

      <p className="pnl-line">
        当前市值 <b>¥{fmtMoney(pos.marketValue)}</b> · 浮动盈亏{' '}
        <b className={pnlClass}>¥{fmtSignedMoney(pos.pnl)}</b>
        <span className={pnlClass}>（{fmtPct(pos.returnRate)}）</span>
      </p>

      {afterWeight != null && currentWeight != null ? (
        <p className="pnl-line">
          减完占比 <b>{fmtPct(afterWeight)}</b>（当前 {fmtPct(currentWeight)}）
        </p>
      ) : null}

      <div className="aside">
        <div className="aside-title">临界点</div>
        {nextTier == null ? (
          <p>{plan.feeRate <= 0 ? '费率已经是 0，不存在更优时点。' : '已在最低费率档。'}</p>
        ) : fee.isOverride ? (
          <p>
            按估算表，还有 <b>{Math.ceil(fee.daysToNextTier ?? 0)} 天</b> 进入下一档（约{' '}
            {fmtPct(nextTier.rate)}）。你填的是平台真实费率，以平台为准。
          </p>
        ) : canWait ? (
          <p>
            再持有 <b>{Math.ceil(fee.daysToNextTier ?? 0)} 天</b>，费率从 {fmtPct(fee.tier.rate)} 降到{' '}
            {fmtPct(nextTier.rate)}。这笔卖出可省 <b>¥{fmtMoney(savings)}</b>
            ，相当于净值多涨 {fmtPct(fee.rateDelta)}。
          </p>
        ) : (
          <p>已在最低费率档。</p>
        )}
        {canWait ? (
          <button className="aside-action" type="button" onClick={onAddToCalendar}>
            加到日历提醒
          </button>
        ) : null}
      </div>

      <button className="share-btn" type="button" onClick={onShare}>
        生成分享卡片
      </button>
    </section>
  )
}
