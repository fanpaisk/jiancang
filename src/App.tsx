import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react'
import { PAGES, useAppState, type Page } from './app/useAppState'
import { ONBOARDING_KEY } from './config'
import { InputPage } from './pages/InputPage'
import { ResultPage } from './pages/ResultPage'
import { RulesPage } from './pages/RulesPage'
import { DemoBanner } from './shell/DemoBanner'
import { MoreSheet } from './shell/MoreSheet'
import { Onboarding } from './shell/Onboarding'
import { TabBar } from './shell/TabBar'
import { Toast } from './shell/Toast'
import { TopBar } from './shell/TopBar'
import { DEMO_LABEL } from './state'

function shouldOnboard(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(ONBOARDING_KEY) !== '1'
  } catch {
    return false
  }
}

export default function App() {
  const state = useAppState()
  const [moreOpen, setMoreOpen] = useState(false)
  const [onboardOpen, setOnboardOpen] = useState(
    () => shouldOnboard() && state.demo == null && !state.form.shares,
  )
  const pageRef = useRef<HTMLElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  // 换页时回到顶部，否则会继承上一页的滚动位置
  useEffect(() => {
    pageRef.current?.scrollTo({ top: 0 })
  }, [state.page])

  const finishOnboarding = useCallback(() => {
    setOnboardOpen(false)
    try {
      localStorage.setItem(ONBOARDING_KEY, '1')
    } catch {
      // 隐私模式写入失败不影响使用
    }
  }, [])

  const startExample = useCallback(() => {
    finishOnboarding()
    state.loadExample()
  }, [finishOnboarding, state])

  // ── 左右滑动切页 ──────────────────────────────────────────────
  const onTouchStart = useCallback((e: TouchEvent<HTMLElement>) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }, [])

  const onTouchEnd = useCallback(
    (e: TouchEvent<HTMLElement>) => {
      const start = touchStart.current
      touchStart.current = null
      if (!start) return
      const t = e.changedTouches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y

      // 只认「明显水平」的滑动：阈值 60px，且横向位移要显著大于纵向，
      // 否则会和页内正常滚动打架。
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6) return

      const index = PAGES.indexOf(state.page)
      const next = dx < 0 ? index + 1 : index - 1
      if (next >= 0 && next < PAGES.length) state.setPage(PAGES[next] as Page)
    },
    [state],
  )

  return (
    <div className="app">
      <TopBar demo={state.demo != null} onMore={() => setMoreOpen(true)} />

      {state.demo ? (
        <DemoBanner label={DEMO_LABEL[state.demo]} onExit={state.exitDemo} />
      ) : null}

      <main className="page" ref={pageRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div
          className="page-inner"
          key={state.page}
          id={`panel-${state.page}`}
          role="tabpanel"
          aria-labelledby={`tab-${state.page}`}
        >
          {state.page === 'input' ? <InputPage state={state} /> : null}
          {state.page === 'rules' ? (
            <RulesPage state={state} onMore={() => setMoreOpen(true)} />
          ) : null}
          {state.page === 'result' ? <ResultPage state={state} /> : null}
        </div>
      </main>

      <TabBar page={state.page} ready={state.ready} onNavigate={state.setPage} />

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} state={state} />

      <Onboarding
        open={onboardOpen}
        onClose={finishOnboarding}
        onExample={startExample}
      />

      <Toast message={state.toast} />
    </div>
  )
}
