interface RowProps {
  label: string
  value: string
  tag: string
  highlight?: boolean
}

function Row({ label, value, tag, highlight }: RowProps) {
  return (
    <div className={highlight ? 'guide-row hl' : 'guide-row'}>
      <span className="guide-label">{label}</span>
      <span className="guide-value">{value}</span>
      <span className="guide-tag">{tag}</span>
    </div>
  )
}

/**
 * 「这些数在哪找」的示意图。
 *
 * 刻意不用真实 App 的截图：一是版权和时效（界面一改图就废），
 * 二是示意图能把「抄哪一行」标得更清楚。
 */
export function GuideFigure() {
  return (
    <div className="guide">
      <div className="guide-block">
        <div className="guide-cap">
          <b>①</b> 持仓页 —— 大部分数在这里
        </div>
        <div className="guide-phone">
          <div className="guide-bar" />
          <Row label="持有金额" value="1,209.70" tag="③" />
          <Row label="持有份额" value="591.28" tag="①" />
          <Row label="持仓成本" value="2.9833" tag="②" />
          <Row label="持仓占比" value="19.3%" tag="⑤" />
          <Row label="持有天数" value="107" tag="④" />
        </div>
      </div>

      <div className="guide-block">
        <div className="guide-cap">
          <b>⑥</b> 卖出页 —— 点了「卖出」才出现
        </div>
        <div className="guide-phone">
          <div className="guide-bar" />
          <Row label="本次赎回费率" value="0.50%" tag="⑥" highlight />
          <p className="guide-warn">抄这个，不是费率表里的某一档</p>
        </div>
      </div>

      <div className="guide-block">
        <div className="guide-cap">
          <b>⑦</b> 详情页的净值走势 —— 找买入以来的最高点
        </div>
        <div className="guide-phone">
          <div className="guide-bar" />
          <div className="guide-spark" aria-hidden>
            <svg viewBox="0 0 200 56" preserveAspectRatio="none">
              <polyline
                points="4,46 24,40 44,43 64,31 84,24 104,29 124,13 144,21 164,27 184,34 196,30"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="124" y1="13" x2="124" y2="52" stroke="#bfd3f7" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="124" cy="13" r="4" fill="#2563eb" />
            </svg>
          </div>
          <Row label="历史最高净值" value="2.3580" tag="⑦" />
        </div>
      </div>

      <ul className="guide-legend">
        <li>
          <b>①</b> 持有份额 → 填「份额」
        </li>
        <li>
          <b>②</b> 持仓成本 → 填「单位成本」
        </li>
        <li>
          <b>③</b> 持有金额 → 不直接填，用来算净值：<code>金额 ÷ 份额</code>
        </li>
        <li>
          <b>④</b> 持有天数 → 直接填
        </li>
        <li>
          <b>⑤</b> 持仓占比 → 直接填（占你全部基金资产的比重）
        </li>
        <li>
          <b>⑥</b> 本次赎回费率 → 填「赎回费率」，跨档持仓时尤其重要
        </li>
        <li>
          <b>⑦</b> 历史最高净值 → 选填，只影响「回撤止盈」
        </li>
      </ul>

      <p className="guide-foot">
        找不到也没关系：不填「占比」和「最高净值」，只是那两条规则不参与计算，其余照样能用。
      </p>
    </div>
  )
}
