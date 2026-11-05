import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App 冒烟 · 分页结构', () => {
  it('首屏渲染输入页，底部三个标签都在', () => {
    const html = renderToString(<App />)
    expect(html).toContain('减仓计算器')
    expect(html).toContain('抄四个数')
    expect(html).toContain('必填')
    expect(html).toContain('持仓')
    expect(html).toContain('结果')
    expect(html).toContain('规则')
  })

  it('分页生效：首屏不渲染结果页与规则页的内容', () => {
    const html = renderToString(<App />)
    expect(html).not.toContain('推荐减仓')
    expect(html).not.toContain('去填持仓')
    expect(html).not.toContain('选个流派')
  })

  it('没有输入时不会算出 NaN', () => {
    const html = renderToString(<App />)
    expect(html).not.toContain('NaN')
  })

  it('首屏有「四个数」和「选填」的说明，不会让人以为要填满所有字段', () => {
    const html = renderToString(<App />)
    expect(html).toContain('四个数')
    expect(html).toContain('选填')
  })
})
