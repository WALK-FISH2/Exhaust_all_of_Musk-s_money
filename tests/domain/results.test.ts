import { describe, expect, it } from 'vitest'

import { setProductQuantity } from '../../src/domain/commands'
import { deriveResultMetrics } from '../../src/domain/results'
import { createTestRun } from '../helpers/run-fixtures'

function setQuantity(state: ReturnType<typeof createTestRun>, productId: string, quantity: number) {
  const result = setProductQuantity(state, { productId, quantity, timestamp: 2_000 })
  if (!result.ok) throw new Error(result.error.code)
  return result.value.state
}

describe('deterministic result derivations', () => {
  it('derives spend, quantities, product types, categories, and waste index', () => {
    let state = createTestRun()
    state = setQuantity(state, 'bubble-tea', 2)
    state = setQuantity(state, 'gaming-pc', 1)
    const metrics = deriveResultMetrics(state)

    expect(metrics.totalSpentUsd).toBe(5_012)
    expect(metrics.remainingBalanceUsd).toBe(399_999_994_988)
    expect(metrics.totalQuantity).toBe(3)
    expect(metrics.distinctProductCount).toBe(2)
    expect(metrics.categoriesTouched).toEqual(['food', 'tech'])
    expect(metrics.wasteIndex).toBe(0)
  })

  it('breaks equal-subtotal ties by higher unit price', () => {
    let state = createTestRun()
    state = setQuantity(state, 'bottled-water', 3)
    state = setQuantity(state, 'bubble-tea', 1)
    expect(deriveResultMetrics(state).highestSubtotalLine?.productId).toBe('bubble-tea')
  })

  it('breaks equal subtotal and unit-price ties by lower catalog order', () => {
    let state = createTestRun()
    state = setQuantity(state, 'giant-diamond', 1)
    state = setQuantity(state, 'polar-expedition', 1)
    expect(deriveResultMetrics(state).highestSubtotalLine?.productId).toBe('giant-diamond')
  })
})
