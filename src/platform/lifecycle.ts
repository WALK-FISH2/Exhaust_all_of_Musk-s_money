import type { Clock } from './clock'

export type LifecyclePhase = 'hidden' | 'shown'
export type LifecycleListener = (phase: LifecyclePhase) => void

export interface LifecycleReconciler {
  readonly handle: LifecycleListener
}

export function createLifecycleReconciler(
  clock: Clock,
  reconcile: (timestamp: number) => void,
): LifecycleReconciler {
  return {
    handle: (phase) => {
      if (phase === 'shown') reconcile(clock.now())
    },
  }
}
