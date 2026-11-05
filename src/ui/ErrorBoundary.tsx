import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** 白屏兜底：渲染出错时至少给用户一条出路，而不是一片空白。 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[jiancang] render error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="fatal">
        <div className="fatal-card">
          <h1>页面出错了</h1>
          <p>你的数据还在本机。刷新通常能恢复；如果反复出错，先导出备份再清空。</p>
          <pre className="fatal-msg">{this.state.error.message}</pre>
          <div className="fatal-actions">
            <button type="button" className="btn btn-primary" onClick={() => location.reload()}>
              刷新页面
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                location.href = './'
              }}
            >
              回首页
            </button>
          </div>
        </div>
      </div>
    )
  }
}
