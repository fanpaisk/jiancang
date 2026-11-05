import type { RuleParams } from '../core/types'
import { cloneRules, detectPreset, PRESETS, presetSummary } from '../core/presets'

interface Props {
  rules: RuleParams
  onSelect: (rules: RuleParams) => void
}

export function PresetPicker({ rules, onSelect }: Props) {
  const active = detectPreset(rules)

  return (
    <section className="card">
      <div className="card-head">
        <h2>选个流派</h2>
        <span className="muted">{active ? active.name : '自定义中'}</span>
      </div>

      <p className="preset-intro">
        {active
          ? active.idea
          : '你正在用自己调的参数。想省事的话，点一个流派就能一键套用，之后仍然可以逐条改。'}
      </p>

      <ul className="preset-list">
        {PRESETS.map((preset) => {
          const isActive = active?.id === preset.id
          const chips = presetSummary(preset.rules)

          return (
            <li key={preset.id}>
              <button
                type="button"
                className={isActive ? 'preset-card active' : 'preset-card'}
                aria-pressed={isActive}
                onClick={() => onSelect(cloneRules(preset.rules))}
              >
                <span className="preset-top">
                  <b>{preset.name}</b>
                  <em>{preset.school}</em>
                  {isActive ? (
                    <span className="preset-check" aria-hidden>
                      ✓
                    </span>
                  ) : null}
                </span>
                <span className="preset-tagline">{preset.tagline}</span>
                {isActive ? (
                  <span className="preset-chips">
                    {chips.map((chip) => (
                      <span key={chip} className="chip">
                        {chip}
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>

      <p className="preset-foot">选中的流派只是一个起点，所有参数都能在下面「高级」里改。</p>
    </section>
  )
}
