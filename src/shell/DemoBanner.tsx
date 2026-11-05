import { Icon } from '../ui/Icon'

interface Props {
  label: string
  onExit: () => void
}

export function DemoBanner({ label, onExit }: Props) {
  return (
    <div className="demo-banner" role="status">
      <span className="demo-banner-text">
        <b>示例数据</b>
        <span>· {label}，不是你的持仓</span>
      </span>
      <button className="link" type="button" onClick={onExit}>
        退出示例
        <Icon name="chevron" size={13} />
      </button>
    </div>
  )
}
