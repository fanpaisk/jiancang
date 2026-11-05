import type { AppState } from '../app/useAppState'
import { DecisionCard } from '../components/DecisionCard'

export function ResultPage({ state }: { state: AppState }) {
  return (
    <DecisionCard
      pos={state.pos}
      plan={state.plan}
      fee={state.fee}
      rec={state.rec}
      results={state.results}
      sellPct={state.sellPct}
      isManual={state.manualPct != null}
      ready={state.ready}
      currentWeight={state.currentWeight}
      afterWeight={state.afterWeight}
      onSellPct={state.setManualPct}
      onReset={state.resetManual}
      onAddToCalendar={state.addToCalendar}
      onShare={state.shareCard}
      onGoInput={() => state.setPage('input')}
      presetName={state.activePreset?.name}
    />
  )
}
