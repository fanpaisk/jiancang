import { APP_NAME } from '../config'
import { Brand } from '../ui/Brand'
import { Icon } from '../ui/Icon'

interface Props {
  onMore: () => void
  demo: boolean
}

export function TopBar({ onMore, demo }: Props) {
  return (
    <header className="topbar">
      <a className="brand" href="./" aria-label={`${APP_NAME}首页`}>
        <Brand />
        <span className="brand-name">{APP_NAME}</span>
      </a>
      <div className="topbar-actions">
        <span className="topbar-tag" title="持仓数据只保存在这台设备的浏览器里">
          <Icon name="shield" size={13} />
          不上传数据
        </span>
        <button
          className="icon-btn"
          type="button"
          aria-label="更多：备份、帮助、隐私与关于"
          onClick={onMore}
        >
          <Icon name="more" />
        </button>
      </div>
      {demo ? <span className="sr-only">当前为示例数据</span> : null}
    </header>
  )
}
