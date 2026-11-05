/**
 * 纯前端持久化：数据只存在用户自己的浏览器里，不上传任何服务器。
 * 换设备 / 清缓存后可用「导出 JSON」恢复。
 */

const KEY = 'jiancang.v1'

interface Envelope {
  version: number
  savedAt: string
  data: unknown
}

export function saveState(data: unknown): void {
  try {
    const envelope: Envelope = {
      version: 1,
      savedAt: new Date().toISOString(),
      data,
    }
    localStorage.setItem(KEY, JSON.stringify(envelope))
  } catch {
    // 隐私模式或容量不足时静默失败——不影响计算
  }
}

export function loadState<T>(): T | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Envelope | null
    if (!parsed || parsed.version !== 1) return null
    return parsed.data as T
  } catch {
    return null
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
