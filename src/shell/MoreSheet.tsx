import { useEffect, useRef, useState } from 'react'
import type { AppState } from '../app/useAppState'
import { APP_VERSION, BUILD_TIME, FEEDBACK_URL, REPO_URL } from '../config'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Sheet } from '../ui/Sheet'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface Props {
  open: boolean
  onClose: () => void
  state: AppState
}

export function MoreSheet({ open, onClose, state }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="更多"
      subtitle="备份、口径、隐私与关于"
      footer={
        <p className="sheet-foot-note">
          MIT License · 本工具只做算术，不构成投资建议
        </p>
      }
    >
      <section className="sheet-section">
        <h3>数据与备份</h3>
        <div className="sheet-actions">
          <Button onClick={state.exportJson}>
            <Icon name="download" size={17} />
            导出备份
          </Button>
          <Button onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={17} />
            导入
          </Button>
          <Button variant="danger" onClick={state.clearAll}>
            <Icon name="trash" size={17} />
            清空
          </Button>
        </div>
        <p className="sheet-hint">
          数据保存在这台设备的浏览器里，不上传。换设备或清缓存前，先导出备份。
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void state.importJson(file)
            e.target.value = ''
          }}
        />
      </section>

      {installPrompt ? (
        <section className="sheet-section">
          <Button
            variant="primary"
            block
            onClick={async () => {
              await installPrompt.prompt()
              await installPrompt.userChoice
              setInstallPrompt(null)
            }}
          >
            添加到主屏幕
          </Button>
          <p className="sheet-hint">装到桌面后可以离线打开，和 App 一样。</p>
        </section>
      ) : null}

      <section className="sheet-section">
        <h3>说明</h3>

        <details className="sheet-details">
          <summary>计算口径与已知误差</summary>
          <ul className="note-list">
            <li>
              金额 = 份额 × 净值。净值取最新公布值，<b>实际成交净值以确认单为准</b>。
            </li>
            <li>15:00 前提交赎回按当日净值，之后按下一交易日净值。</li>
            <li>赎回费 = 卖出金额 × 费率。费率为估算时，以平台卖出页为准。</li>
            <li>盈亏未扣申购费，假设「单位成本」已包含申购费。</li>
            <li>红利再投时，份额与成本由平台自动调整，按平台数据填即可。</li>
            <li>不做分笔 FIFO 精算：跨档持仓请直接抄平台的「本次赎回费率」。</li>
          </ul>
        </details>

        <details className="sheet-details">
          <summary>隐私说明</summary>
          <p>
            没有账号、没有服务器、没有统计代码。持仓和规则保存在本机
            <code>localStorage</code>，不会上传。截图识别用的引擎和中文模型从本站加载，
            图片不会离开浏览器。换设备时用「导出备份」搬数据。
          </p>
        </details>

        <details className="sheet-details">
          <summary>常见问题</summary>
          <dl className="faq">
            <dt>为什么结果是 0%？</dt>
            <dd>0% 就是答案：当前没有一条规则被触发。工具不会为了给建议而给建议。</dd>
            <dt>费率和平台不一样？</dt>
            <dd>内置表只是估算；卖出页上那个数更准，填进「赎回费率」即可覆盖。</dd>
            <dt>换手机怎么办？</dt>
            <dd>旧设备「导出备份」，新设备「导入」，不需要登录。</dd>
            <dt>支持哪些基金？</dt>
            <dd>场外开放式基金。不支持场内 ETF、股票、货币基金和银行理财。</dd>
          </dl>
        </details>
      </section>

      <section className="sheet-section">
        <h3>关于</h3>
        <div className="about-rows">
          <div>
            <span>版本</span>
            <b>v{APP_VERSION}</b>
          </div>
          <div>
            <span>构建</span>
            <b>{BUILD_TIME || '本地开发'}</b>
          </div>
        </div>
        <div className="sheet-actions">
          <a className="btn btn-secondary" href={REPO_URL} target="_blank" rel="noreferrer">
            <Icon name="spark" size={16} />
            GitHub 源码
          </a>
          <a className="btn btn-ghost" href={FEEDBACK_URL} target="_blank" rel="noreferrer">
            反馈问题
          </a>
        </div>
      </section>
    </Sheet>
  )
}
