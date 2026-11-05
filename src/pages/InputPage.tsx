import type { AppState } from '../app/useAppState'
import { InputPanel } from '../components/InputPanel'

export function InputPage({ state }: { state: AppState }) {
  return (
    <>
      <p className="page-lead">抄四个数，算清楚该减多少。按你设的规则算，不做投资建议。</p>
      <InputPanel
        form={state.form}
        set={state.setField}
        fee={state.fee}
        onApplyParsed={state.applyParsed}
        onExample={state.loadExample}
      />
    </>
  )
}
