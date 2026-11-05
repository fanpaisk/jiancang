import { describe, expect, it } from 'vitest'
import { defaultRules, evaluateRules } from '../rules'
import {
  cloneRules,
  DEFAULT_PRESET_ID,
  detectPreset,
  isDefaultPreset,
  PRESETS,
  presetSummary,
  sameRules,
} from '../presets'
import { summarize } from '../position'
import type { RuleParams } from '../types'

describe('预设集合', () => {
  it('至少提供 7 个流派', () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(7)
  })

  it('id 唯一', () => {
    const ids = PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('名称与流派名唯一且非空', () => {
    expect(new Set(PRESETS.map((p) => p.name)).size).toBe(PRESETS.length)
    expect(new Set(PRESETS.map((p) => p.school)).size).toBe(PRESETS.length)
    for (const p of PRESETS) {
      expect(p.name.trim().length).toBeGreaterThan(0)
      expect(p.school.trim().length).toBeGreaterThan(0)
      expect(p.tagline.trim().length).toBeGreaterThan(0)
      expect(p.idea.trim().length).toBeGreaterThan(0)
    }
  })

  it('每个流派至少启用一条规则（否则等于没选）', () => {
    for (const p of PRESETS) {
      expect(presetSummary(p.rules).length, p.id).toBeGreaterThan(0)
    }
  })

  it('每个流派的参数都落在合理区间', () => {
    for (const p of PRESETS) {
      const r = p.rules
      expect(r.targetWeight.weight, p.id).toBeGreaterThan(0)
      expect(r.targetWeight.weight, p.id).toBeLessThan(1)
      expect(r.takeProfit.targetRate, p.id).toBeGreaterThan(0)
      expect(r.takeProfit.reducePct, p.id).toBeGreaterThan(0)
      expect(r.takeProfit.reducePct, p.id).toBeLessThanOrEqual(1)
      expect(r.trailingStop.drawdown, p.id).toBeGreaterThan(0)
      expect(r.trailingStop.drawdown, p.id).toBeLessThan(1)
      expect(r.trailingStop.reducePct, p.id).toBeGreaterThan(0)
      expect(r.stopLoss.lossRate, p.id).toBeGreaterThan(0)
      expect(r.stopLoss.lossRate, p.id).toBeLessThan(1)
    }
  })

  it('每个流派都能跑一遍规则引擎而不抛错', () => {
    const pos = summarize(1000, 1, 1.2, 100)
    for (const p of PRESETS) {
      expect(() => evaluateRules({ pos, currentWeight: 0.3, peakNav: 1.3 }, p.rules)).not.toThrow()
    }
  })

  it('流派之间的参数不是互相复制的（必须真的不一样）', () => {
    const shapes = PRESETS.map((p) => JSON.stringify(p.rules))
    expect(new Set(shapes).size).toBe(shapes.length)
  })
})

describe('detectPreset', () => {
  it('默认规则命中默认流派，首屏不会显示「自定义」', () => {
    expect(DEFAULT_PRESET_ID).toBe('steady')
    expect(detectPreset(defaultRules)?.id).toBe(DEFAULT_PRESET_ID)
  })

  it('isDefaultPreset 与 detectPreset 结论一致', () => {
    expect(isDefaultPreset(defaultRules)).toBe(true)
  })

  it('改过一个参数后就不再命中任何流派', () => {
    const tweaked: RuleParams = {
      ...defaultRules,
      takeProfit: { ...defaultRules.takeProfit, targetRate: 0.5 },
    }
    expect(detectPreset(tweaked)).toBeNull()
    expect(isDefaultPreset(tweaked)).toBe(false)
  })

  it('数值上等价（浮点误差内）仍判定为同一流派', () => {
    const near: RuleParams = {
      ...defaultRules,
      takeProfit: { ...defaultRules.takeProfit, reducePct: 0.3333333333 },
    }
    expect(detectPreset(near)?.id).toBe('steady')
  })
})

describe('sameRules', () => {
  it('完全相同返回 true', () => {
    expect(sameRules(defaultRules, defaultRules)).toBe(true)
  })

  it('只有 enabled 不同也返回 false', () => {
    const other: RuleParams = {
      ...defaultRules,
      stopLoss: { ...defaultRules.stopLoss, enabled: true },
    }
    expect(sameRules(defaultRules, other)).toBe(false)
  })
})

describe('cloneRules', () => {
  it('是深拷贝：改副本不影响原对象', () => {
    const original = PRESETS[1].rules
    const copy = cloneRules(original)
    copy.trailingStop.drawdown = 0.99
    copy.stopLoss.enabled = !copy.stopLoss.enabled
    expect(original.trailingStop.drawdown).not.toBe(0.99)
  })

  it('拷贝后内容相等', () => {
    const original = PRESETS[0].rules
    expect(sameRules(cloneRules(original), original)).toBe(true)
  })
})

describe('presetSummary', () => {
  it('每条启用的规则都翻译成一句人话', () => {
    const chips = presetSummary(PRESETS[0].rules)
    expect(chips.length).toBeGreaterThan(0)
    expect(chips.some((c) => c.includes('涨'))).toBe(true)
    expect(chips.some((c) => c.includes('回撤'))).toBe(true)
  })

  it('关闭的规则不产生标签', () => {
    const chips = presetSummary(PRESETS.find((p) => p.id === 'balance')!.rules)
    expect(chips).toHaveLength(1)
    expect(chips[0]).toContain('占比')
  })
})
