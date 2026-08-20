import { describe, expect, it } from 'vitest'

import type { Clock } from '../../src/platform/clock'
import { createLifecycleReconciler } from '../../src/platform/lifecycle'

class ManualClock implements Clock {
  constructor(private timestamp: number) {}

  now(): number {
    return this.timestamp
  }

  set(timestamp: number): void {
    this.timestamp = timestamp
  }
}

describe('shared lifecycle reconciliation contract', () => {
  it('reconciles with the current clock when hidden then shown after deadline', () => {
    const clock = new ManualClock(1_000)
    const reconciledAt: number[] = []
    const lifecycle = createLifecycleReconciler(clock, (timestamp) => reconciledAt.push(timestamp))

    lifecycle.handle('hidden')
    clock.set(121_000)
    lifecycle.handle('shown')
    expect(reconciledAt).toEqual([121_000])
  })

  it('reconciles an early foreground return without inventing elapsed ticks', () => {
    const clock = new ManualClock(1_000)
    const reconciledAt: number[] = []
    const lifecycle = createLifecycleReconciler(clock, (timestamp) => reconciledAt.push(timestamp))

    lifecycle.handle('hidden')
    clock.set(10_999)
    lifecycle.handle('shown')
    expect(reconciledAt).toEqual([10_999])
  })
})
