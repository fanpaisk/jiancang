import { useCallback, type KeyboardEvent } from 'react'
import { PAGES, PAGE_LABEL, type Page } from '../app/useAppState'
import { Icon, type IconName } from '../ui/Icon'

interface Props {
  page: Page
  ready: boolean
  onNavigate: (page: Page) => void
}

const ICONS: Record<Page, IconName> = {
  input: 'holdings',
  rules: 'rules',
  result: 'result',
}

export function TabBar({ page, ready, onNavigate }: Props) {
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      const index = PAGES.indexOf(page)
      const next = e.key === 'ArrowRight' ? index + 1 : index - 1
      if (next < 0 || next >= PAGES.length) return
      const target = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('.tab')[
        next
      ]
      onNavigate(PAGES[next])
      target?.focus()
    },
    [page, onNavigate],
  )

  return (
    <nav className="tabbar" role="tablist" aria-label="页面切换">
      {PAGES.map((p) => {
        const active = page === p
        return (
          <button
            key={p}
            type="button"
            role="tab"
            id={`tab-${p}`}
            aria-selected={active}
            aria-controls={`panel-${p}`}
            tabIndex={active ? 0 : -1}
            className={active ? 'tab active' : 'tab'}
            onClick={() => onNavigate(p)}
            onKeyDown={onKeyDown}
          >
            <span className="tab-icon">
              <Icon name={ICONS[p]} size={21} />
              {p === 'result' && ready && !active ? (
                <i className="tab-dot" aria-hidden="true" />
              ) : null}
            </span>
            <span className="tab-label">{PAGE_LABEL[p]}</span>
          </button>
        )
      })}
    </nav>
  )
}
