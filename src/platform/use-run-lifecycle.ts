import { useDidHide, useDidShow } from '@tarojs/taro'
import { useEffect, useMemo, useRef } from 'react'

import { subscribeH5Lifecycle } from './adapters/h5-lifecycle'
import type { Clock } from './clock'
import { createLifecycleReconciler } from './lifecycle'

export function useRunLifecycle(clock: Clock, onReconcile: (timestamp: number) => void): void {
  const reconcileRef = useRef(onReconcile)
  reconcileRef.current = onReconcile
  const lifecycle = useMemo(
    () => createLifecycleReconciler(clock, (timestamp) => reconcileRef.current(timestamp)),
    [clock],
  )

  useDidShow(() => lifecycle.handle('shown'))
  useDidHide(() => lifecycle.handle('hidden'))

  useEffect(() => {
    if (process.env.TARO_ENV !== 'h5') return undefined
    return subscribeH5Lifecycle(lifecycle.handle)
  }, [lifecycle])
}
