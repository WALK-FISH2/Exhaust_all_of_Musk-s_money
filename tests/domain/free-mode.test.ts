import { describe, expect, it } from 'vitest'

import { EXACT_ZERO_REGRESSION_PATH } from '../../src/data/products'
import { purchaseProduct } from '../../src/domain/commands'
import { createRun, deriveRunTotals, isRestorableUnfinishedRun } from '../../src/domain/game-state'
import { INITIAL_BUDGET_USD } from '../../src/domain/money'

function requireRun(id: string) {
  const result = createRun({ id, mode: 'free', timestamp: 100 })
  if (!result.ok) throw new Error(result.error.code)
  return result.value
}

describe('Free Mode lifecycle', () => {
  it('creates an active, restorable run at exactly $400B', () => {
    const state = requireRun('free-1')
    expect(state.status).toBe('active')
    expect(deriveRunTotals(state)).toEqual({
      totalSpentUsd: 0,
      remainingBalanceUsd: INITIAL_BUDGET_USD,
    })
    expect(isRestorableUnfinishedRun(state)).toBe(true)
  })

  it('completes and freezes after the official exact-zero sequence', () => {
    let state = requireRun('free-complete')
    for (const [index, line] of EXACT_ZERO_REGRESSION_PATH.entries()) {
      const result = purchaseProduct(state, {
        ...line,
        timestamp: 200 + index,
      })
      if (!result.ok) throw new Error(result.error.code)
      state = result.value.state
    }

    expect(state.status).toBe('completed')
    expect(state.completedAt).toBe(205)
    expect(deriveRunTotals(state).remainingBalanceUsd).toBe(0)
    expect(isRestorableUnfinishedRun(state)).toBe(false)
    expect(
      purchaseProduct(state, { productId: 'lucky-sticker', quantity: 1, timestamp: 300 }),
    ).toEqual({
      ok: false,
      error: { code: 'GAME_ALREADY_COMPLETED', productId: 'lucky-sticker' },
    })
  })

  it('starts a new run without carrying quantities or run achievements', () => {
    const previous = requireRun('previous')
    const purchase = purchaseProduct(previous, {
      productId: 'lucky-sticker',
      quantity: 1,
      timestamp: 200,
    })
    if (!purchase.ok) throw new Error(purchase.error.code)

    const next = requireRun('next')
    expect(next.id).not.toBe(purchase.value.state.id)
    expect(next.quantities).toEqual({})
    expect(next.runUnlockedAchievementIds).toEqual([])
    expect(deriveRunTotals(next).remainingBalanceUsd).toBe(INITIAL_BUDGET_USD)
  })
})
