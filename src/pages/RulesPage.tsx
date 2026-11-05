import type { AppState } from '../app/useAppState'
import { PresetPicker } from '../components/PresetPicker'
import { RulesPanel } from '../components/RulesPanel'
import { Button } from '../ui/Button'

interface Props {
  state: AppState
  onMore: () => void
}

export function RulesPage({ state, onMore }: Props) {
  return (
    <>
      <PresetPicker rules={state.rules} onSelect={state.applyRules} />
      <RulesPanel rules={state.rules} onChange={state.applyRules} />

      <section className="card">
        <div className="card-head">
          <h2>数据与说明</h2>
        </div>
        <Button block onClick={onMore}>
          备份、计算口径、隐私与关于
        </Button>
        <p className="muted small card-note">
          导出/导入、清空和全部说明都收在「更多」里，避免这一页越堆越长。
        </p>
      </section>

      <footer className="footer">
        <p>本工具只做算术，不构成投资建议。赎回费率以你所在平台显示的为准。</p>
        <p>MIT License · 计算核心为纯函数，单元测试覆盖 7 / 30 / 365 / 730 天费率边界。</p>
      </footer>
    </>
  )
}
