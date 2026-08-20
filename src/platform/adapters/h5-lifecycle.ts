import type { LifecycleListener } from '../lifecycle'

export function subscribeH5Lifecycle(listener: LifecycleListener): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => undefined

  const onVisibilityChange = () => {
    listener(document.visibilityState === 'hidden' ? 'hidden' : 'shown')
  }
  const onPageShow = () => listener('shown')
  const onPageHide = () => listener('hidden')

  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pageshow', onPageShow)
  window.addEventListener('pagehide', onPageHide)

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pageshow', onPageShow)
    window.removeEventListener('pagehide', onPageHide)
  }
}
