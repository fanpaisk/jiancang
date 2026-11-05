import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SITE_URL } from '../config'
import { resolveFee } from '../core/fee'
import { fmtPct } from '../core/format'
import { buildIcs, feeDropDate, icsDate } from '../core/ics'
import type { ParsedHolding } from '../core/parse'
import { computeSellPlan, weightAfterSell } from '../core/plan'
import { summarize } from '../core/position'
import { detectPreset } from '../core/presets'
import { recommend } from '../core/recommend'
import { evaluateRules } from '../core/rules'
import { clearState, loadState, saveState } from '../core/storage'
import { toNum } from '../core/util'
import {
  defaultForm,
  defaultRules,
  demoForms,
  hasUserInput,
  type DemoMode,
  type FormState,
  type PersistedApp,
} from '../state'

export const PAGES = ['input', 'rules', 'result'] as const
export type Page = (typeof PAGES)[number]

export const PAGE_LABEL: Record<Page, string> = {
  input: '持仓',
  rules: '规则',
  result: '结果',
}

function readDemo(): DemoMode | null {
  if (typeof window === 'undefined') return null
  const d = new URLSearchParams(window.location.search).get('demo')
  return d === '1' ? 'loss' : d === '2' ? 'profit' : null
}

function savedForm(): FormState {
  return { ...defaultForm, ...(loadState<PersistedApp>()?.form ?? {}) }
}

/** 让地址栏和当前模式保持一致，刷新后不会悄悄换回真实数据/示例 */
function syncDemoParam(mode: DemoMode | null): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (mode) url.searchParams.set('demo', mode === 'loss' ? '1' : '2')
  else url.searchParams.delete('demo')
  window.history.replaceState({}, '', url)
}

export function useAppState() {
  const [demo, setDemo] = useState<DemoMode | null>(() => readDemo())
  const [page, setPage] = useState<Page>('input')
  const [form, setForm] = useState<FormState>(() => {
    const d = readDemo()
    return d ? demoForms[d] : savedForm()
  })
  const [rules, setRules] = useState(() => {
    const d = readDemo()
    return d ? defaultRules : (loadState<PersistedApp>()?.rules ?? defaultRules)
  })
  const [manualPct, setManualPct] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  // 演示模式不落盘，避免把示例数据写进用户的存档
  useEffect(() => {
    if (demo) return
    const timer = window.setTimeout(() => saveState({ form, rules }), 300)
    return () => window.clearTimeout(timer)
  }, [form, rules, demo])

  const flash = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2600)
  }, [])

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  /** 改规则（换流派或手动调参）时，丢掉手动设定的比例，回到规则给的值 */
  const applyRules = useCallback((next: typeof defaultRules) => {
    setRules(next)
    setManualPct(null)
  }, [])

  const resetManual = useCallback(() => setManualPct(null), [])

  const applyParsed = useCallback(
    (parsed: ParsedHolding) => {
      setForm((prev) => {
        const next: FormState = { ...prev }
        // 「填入表单」= 用识别结果覆盖；没认出的一律清空，
        // 否则旧值会冒充新值，比没填更危险
        next.name = parsed.name ?? ''
        next.code = parsed.code ?? ''
        next.shareClass = parsed.shareClass ?? prev.shareClass
        next.shares = parsed.shares != null ? String(parsed.shares) : ''
        next.costPerShare = parsed.costPerShare != null ? String(parsed.costPerShare) : ''
        next.holdDays = parsed.holdDays != null ? String(parsed.holdDays) : ''
        next.currentWeight = parsed.weight != null ? (parsed.weight * 100).toFixed(2) : ''
        next.dayChange = parsed.dayChange != null ? (parsed.dayChange * 100).toFixed(2) : ''

        if (parsed.nav != null) {
          next.nav = String(parsed.nav)
        } else if (parsed.shares && parsed.shares > 0 && parsed.marketValue) {
          next.nav = (parsed.marketValue / parsed.shares).toFixed(4)
        } else {
          next.nav = ''
        }
        return next
      })
      setManualPct(null)

      const missing = [
        parsed.shares == null ? '份额' : '',
        parsed.costPerShare == null ? '成本' : '',
        parsed.holdDays == null ? '天数' : '',
        parsed.dayChange == null ? '当日涨跌幅' : '',
      ].filter(Boolean)
      if (parsed.shareClass == null) {
        flash(
          missing.length
            ? `已填入；未识别的 ${missing.join('、')} 已清空；份额类别请手动确认`
            : '已填入；份额类别未识别，请手动确认 A/C',
        )
      } else {
        flash(
          missing.length
            ? `已填入；未识别的 ${missing.join('、')} 已清空`
            : '已填入，核对一下再算',
        )
      }
    },
    [flash],
  )

  const exitDemo = useCallback(() => {
    setDemo(null)
    setForm(savedForm())
    setRules(loadState<PersistedApp>()?.rules ?? defaultRules)
    setManualPct(null)
    setPage('input')
    syncDemoParam(null)
  }, [])

  const loadExample = useCallback(() => {
    if (typeof window !== 'undefined' && demo == null && hasUserInput(form)) {
      if (!window.confirm('载入示例会覆盖当前填的内容，确定吗？')) return
    }
    setDemo('loss')
    setForm(demoForms.loss)
    setRules(defaultRules)
    setManualPct(null)
    setPage('input')
    syncDemoParam('loss')
    flash('已载入示例数据（不是你的持仓）')
  }, [demo, flash, form])

  const exportJson = useCallback(() => {
    const payload = JSON.stringify(
      {
        schemaVersion: 1,
        appVersion: __APP_VERSION__,
        savedAt: new Date().toISOString(),
        data: { form, rules },
      },
      null,
      2,
    )
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `减仓计算器-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    flash('已导出备份')
  }, [form, rules, flash])

  const importJson = useCallback(
    async (file: File) => {
      try {
        const parsed: unknown = JSON.parse(await file.text())
        const data = (parsed as { data?: unknown })?.data ?? parsed
        const candidate = data as { form?: Partial<FormState>; rules?: typeof rules } | null
        if (!candidate?.form || typeof candidate.form !== 'object') throw new Error('missing form')
        if (
          typeof window !== 'undefined' &&
          !window.confirm('导入会覆盖当前填的内容，确定吗？')
        ) {
          return
        }
        setForm({ ...defaultForm, ...candidate.form })
        if (candidate.rules) setRules({ ...defaultRules, ...candidate.rules })
        setDemo(null)
        setManualPct(null)
        syncDemoParam(null)
        flash('已导入备份')
      } catch {
        flash('文件读不出来，可能不是本工具导出的备份')
      }
    },
    [flash, rules],
  )

  const clearAll = useCallback(() => {
    if (typeof window !== 'undefined' && !window.confirm('清空后无法恢复，确定吗？')) return
    setForm(defaultForm)
    setRules(defaultRules)
    setManualPct(null)
    setDemo(null)
    clearState()
    syncDemoParam(null)
    flash('已清空')
  }, [flash])

  // ── 派生数据：全部来自 core/ 的纯函数 ──────────────────────────
  const shares = toNum(form.shares)
  const costPerShare = toNum(form.costPerShare)
  const nav = toNum(form.nav)
  const holdDays = toNum(form.holdDays)
  const feeOverride = form.feeOverride.trim() === '' ? null : toNum(form.feeOverride) / 100
  const currentWeight = form.currentWeight.trim() === '' ? null : toNum(form.currentWeight) / 100
  const peakNav = form.peakNav.trim() === '' ? null : toNum(form.peakNav) || null

  const pos = useMemo(
    () => summarize(shares, costPerShare, nav, holdDays),
    [shares, costPerShare, nav, holdDays],
  )
  const fee = useMemo(
    () => resolveFee(form.shareClass, holdDays, feeOverride),
    [form.shareClass, holdDays, feeOverride],
  )
  const results = useMemo(
    () => evaluateRules({ pos, currentWeight, peakNav }, rules),
    [pos, currentWeight, peakNav, rules],
  )
  const rec = useMemo(() => recommend(results), [results])
  const activePreset = useMemo(() => detectPreset(rules), [rules])

  const sellPct = manualPct ?? rec.recommendedPct
  const plan = useMemo(() => computeSellPlan(pos, sellPct, fee.rate), [pos, sellPct, fee.rate])
  const portfolioValue =
    currentWeight != null && currentWeight > 0 ? pos.marketValue / currentWeight : null
  const afterWeight = portfolioValue != null ? weightAfterSell(plan, portfolioValue) : null
  const ready = shares > 0 && nav > 0 && costPerShare > 0

  const addToCalendar = useCallback(() => {
    if (fee.nextTier == null || fee.daysToNextTier == null) return
    const date = feeDropDate(fee.daysToNextTier)
    const label = form.name || form.code || '持仓'
    const ics = buildIcs([
      {
        uid: `${form.code || 'fund'}-${icsDate(date)}@jiancang`,
        date,
        summary: `${label} 赎回费降至 ${fmtPct(fee.nextTier.rate)}`,
        description:
          `持有满 ${fee.nextTier.minDays} 天，费率从 ${fmtPct(fee.tier.rate)} 降到 ` +
          `${fmtPct(fee.nextTier.rate)}。费率以平台为准，本提醒由减仓计算器生成。`,
      },
    ])
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `赎回费跳档-${form.code || 'fund'}.ics`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    flash('已生成日历文件')
  }, [fee, form, flash])

  const shareCard = useCallback(async () => {
    const { canvasToBlob, renderShareCard } = await import('../lib/shareCard')
    const canvas = renderShareCard({
      presetName: activePreset?.name,
      fundName: form.name || undefined,
      sellPct: plan.sellPct,
      sellShares: plan.sellShares,
      sellAmount: plan.sellAmount,
      feeRate: plan.feeRate,
      fee: plan.fee,
      netProceeds: plan.netProceeds,
      afterWeight,
      siteUrl: SITE_URL,
      isDemo: demo != null,
    })
    const blob = await canvasToBlob(canvas)
    if (!blob) {
      flash('卡片没生成出来，换个浏览器试试')
      return
    }

    const filename = `减仓卡片-${new Date().toISOString().slice(0, 10)}.png`
    const file = new File([blob], filename, { type: 'image/png' })
    const shareNav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean
      share?: (data?: ShareData) => Promise<void>
    }

    if (shareNav.share && shareNav.canShare?.({ files: [file] })) {
      try {
        await shareNav.share({ files: [file], title: '我的减仓方案' })
        return
      } catch {
        // 用户取消分享，退回下载
      }
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    flash('已生成分享卡片')
  }, [activePreset, form.name, plan, afterWeight, demo, flash])

  return {
    demo,
    page,
    setPage,
    form,
    rules,
    manualPct,
    setManualPct,
    resetManual,
    setField,
    applyRules,
    applyParsed,
    exitDemo,
    loadExample,
    exportJson,
    importJson,
    clearAll,
    addToCalendar,
    shareCard,
    toast,
    flash,
    shares,
    costPerShare,
    nav,
    holdDays,
    feeOverride,
    currentWeight,
    peakNav,
    pos,
    fee,
    results,
    rec,
    activePreset,
    sellPct,
    plan,
    portfolioValue,
    afterWeight,
    ready,
  }
}

export type AppState = ReturnType<typeof useAppState>
