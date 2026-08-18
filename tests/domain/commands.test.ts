import { describe, expect, it } from 'vitest'

import {
  decrementProduct,
  incrementProduct,
  maxProduct,
  purchaseProduct,
  removeProduct,
  setProductQuantity,
  type CommandResult,
} from '../../src/domain/commands'
import { deriveRunTotals, getProductQuantity, type RunState } from '../../src/domain/game-state'
import { INITIAL_BUDGET_USD } from '../../src/domain/money'
import { buildRunState, createTestRun, EXACT_ZERO_QUANTITIES } from '../helpers/run-fixtures'

function requireSuccess(result: CommandResult): RunState {
  if (!result.ok) throw new Error(result.error.code)
  return result.value.state
}

describe('purchase commands', () => {
  it('applies one or multiple quantities with exact totals', () => {
    const initial = createTestRun()
    const one = purchaseProduct(initial, {
      productId: 'bubble-tea',
      quantity: 1,
      timestamp: 2_000,
    })
    expect(one.ok).toBe(true)
    if (!one.ok) return
    expect(getProductQuantity(one.value.state, 'bubble-tea')).toBe(1)
    expect(deriveRunTotals(one.value.state)).toEqual({
      totalSpentUsd: 6,
      remainingBalanceUsd: INITIAL_BUDGET_USD - 6,
    })

    const multiple = purchaseProduct(one.value.state, {
      productId: 'bubble-tea',
      quantity: 9,
      timestamp: 2_001,
    })
    expect(multiple.ok).toBe(true)
    if (!multiple.ok) return
    expect(getProductQuantity(multiple.value.state, 'bubble-tea')).toBe(10)
    expect(deriveRunTotals(multiple.value.state).totalSpentUsd).toBe(60)
  })

  it('returns stable errors for unknown and invalid inputs', () => {
    const state = createTestRun()
    expect(purchaseProduct(state, { productId: 'missing', quantity: 1, timestamp: 2_000 })).toEqual(
      { ok: false, error: { code: 'UNKNOWN_PRODUCT', productId: 'missing' } },
    )

    for (const quantity of [0, -1, 1.5, Number.NaN]) {
      expect(
        purchaseProduct(state, { productId: 'lucky-sticker', quantity, timestamp: 2_000 }),
      ).toEqual({
        ok: false,
        error: { code: 'INVALID_QUANTITY', productId: 'lucky-sticker' },
      })
    }
    expect(
      purchaseProduct(state, {
        productId: 'lucky-sticker',
        quantity: Number.MAX_SAFE_INTEGER + 1,
        timestamp: 2_000,
      }),
    ).toEqual({
      ok: false,
      error: { code: 'UNSAFE_INTEGER', productId: 'lucky-sticker' },
    })
  })

  it('rejects cap overflow without partially applying the purchase', () => {
    const state = createTestRun()
    const snapshot = structuredClone(state)
    const result = purchaseProduct(state, {
      productId: 'private-train',
      quantity: 8_000,
      timestamp: 2_000,
    })
    expect(result).toEqual({
      ok: false,
      error: { code: 'CAP_EXCEEDED', productId: 'private-train' },
    })
    expect(state).toEqual(snapshot)
  })

  it('rejects insufficient balance atomically', () => {
    const initial = createTestRun()
    const nearEmpty = requireSuccess(
      purchaseProduct(initial, {
        productId: 'private-train',
        quantity: 7_999,
        timestamp: 2_000,
      }),
    )
    const snapshot = structuredClone(nearEmpty)
    const result = purchaseProduct(nearEmpty, {
      productId: 'private-jet',
      quantity: 1,
      timestamp: 2_001,
    })

    expect(deriveRunTotals(nearEmpty).remainingBalanceUsd).toBe(50_000_000)
    expect(result).toEqual({
      ok: false,
      error: { code: 'INSUFFICIENT_BALANCE', productId: 'private-jet' },
    })
    expect(nearEmpty).toEqual(snapshot)
  })

  it('rejects every mutation after exact-zero completion', () => {
    const completed = buildRunState({ quantities: EXACT_ZERO_QUANTITIES })
    expect(completed.status).toBe('completed')
    expect(
      purchaseProduct(completed, {
        productId: 'lucky-sticker',
        quantity: 1,
        timestamp: 2_000,
      }),
    ).toEqual({
      ok: false,
      error: { code: 'GAME_ALREADY_COMPLETED', productId: 'lucky-sticker' },
    })
  })

  it('keeps the old state immutable after success', () => {
    const state = createTestRun()
    const snapshot = structuredClone(state)
    const result = purchaseProduct(state, {
      productId: 'lucky-sticker',
      quantity: 10,
      timestamp: 2_000,
    })
    expect(result.ok).toBe(true)
    expect(state).toEqual(snapshot)
    if (result.ok) expect(result.value.state).not.toBe(state)
  })
})

describe('remove/decrement commands', () => {
  it('refunds exact fixed-price money and can reduce quantity to zero', () => {
    const purchased = requireSuccess(
      purchaseProduct(createTestRun(), {
        productId: 'bubble-tea',
        quantity: 10,
        timestamp: 2_000,
      }),
    )
    const reduced = requireSuccess(
      removeProduct(purchased, {
        productId: 'bubble-tea',
        quantity: 4,
        timestamp: 2_001,
      }),
    )
    expect(getProductQuantity(reduced, 'bubble-tea')).toBe(6)
    expect(deriveRunTotals(reduced).totalSpentUsd).toBe(36)

    const zero = requireSuccess(
      removeProduct(reduced, {
        productId: 'bubble-tea',
        quantity: 6,
        timestamp: 2_002,
      }),
    )
    expect(getProductQuantity(zero, 'bubble-tea')).toBe(0)
    expect(deriveRunTotals(zero).remainingBalanceUsd).toBe(INITIAL_BUDGET_USD)
  })

  it('rejects invalid or excessive removal', () => {
    const state = requireSuccess(
      purchaseProduct(createTestRun(), {
        productId: 'bubble-tea',
        quantity: 2,
        timestamp: 2_000,
      }),
    )
    expect(
      removeProduct(state, { productId: 'bubble-tea', quantity: 3, timestamp: 2_001 }),
    ).toEqual({
      ok: false,
      error: { code: 'OWNED_QUANTITY_EXCEEDED', productId: 'bubble-tea' },
    })
    expect(
      removeProduct(state, { productId: 'bubble-tea', quantity: -1, timestamp: 2_001 }),
    ).toEqual({
      ok: false,
      error: { code: 'INVALID_QUANTITY', productId: 'bubble-tea' },
    })
  })

  it('makes decrement at zero an immutable no-op', () => {
    const state = createTestRun()
    const result = decrementProduct(state, { productId: 'bubble-tea', timestamp: 2_000 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.changed).toBe(false)
    expect(result.value.state).toBe(state)
  })
})

describe('direct quantity and increment commands', () => {
  it('increments by one with affordability validation', () => {
    const result = incrementProduct(createTestRun(), {
      productId: 'bubble-tea',
      timestamp: 2_000,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(getProductQuantity(result.value.state, 'bubble-tea')).toBe(1)
  })

  it('sanitizes negative direct values to zero and rejects decimals', () => {
    const purchased = requireSuccess(
      purchaseProduct(createTestRun(), {
        productId: 'bubble-tea',
        quantity: 10,
        timestamp: 2_000,
      }),
    )
    const sanitized = setProductQuantity(purchased, {
      productId: 'bubble-tea',
      quantity: -5,
      timestamp: 2_001,
    })
    expect(sanitized.ok).toBe(true)
    if (sanitized.ok) expect(getProductQuantity(sanitized.value.state, 'bubble-tea')).toBe(0)

    expect(
      setProductQuantity(purchased, {
        productId: 'bubble-tea',
        quantity: 1.2,
        timestamp: 2_001,
      }),
    ).toEqual({
      ok: false,
      error: { code: 'INVALID_QUANTITY', productId: 'bubble-tea' },
    })
  })

  it('clamps direct values to both cap and affordability', () => {
    const capLimited = setProductQuantity(createTestRun(), {
      productId: 'lucky-sticker',
      quantity: 2_000_000_000,
      timestamp: 2_000,
    })
    expect(capLimited.ok).toBe(true)
    if (capLimited.ok) {
      expect(getProductQuantity(capLimited.value.state, 'lucky-sticker')).toBe(1_000_000_000)
    }

    const balanceLimited = setProductQuantity(createTestRun(), {
      productId: 'private-jet',
      quantity: 10_000,
      timestamp: 2_000,
    })
    expect(balanceLimited.ok).toBe(true)
    if (balanceLimited.ok) {
      expect(getProductQuantity(balanceLimited.value.state, 'private-jet')).toBe(5_333)
      expect(deriveRunTotals(balanceLimited.value.state).remainingBalanceUsd).toBe(25_000_000)
    }
  })
})

describe('MAX command', () => {
  it('returns a no-op when the balance is below the unit price', () => {
    const nearEmpty = requireSuccess(
      purchaseProduct(createTestRun(), {
        productId: 'private-train',
        quantity: 7_999,
        timestamp: 2_000,
      }),
    )
    const result = maxProduct(nearEmpty, { productId: 'private-jet', timestamp: 2_001 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.changed).toBe(false)
    expect(result.value.state).toBe(nearEmpty)
    expect(result.value.newlyUnlockedAchievementIds).not.toContain('max-button')
  })

  it('uses affordability when it is tighter than the cap', () => {
    const result = maxProduct(createTestRun(), {
      productId: 'private-jet',
      timestamp: 2_000,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(getProductQuantity(result.value.state, 'private-jet')).toBe(5_333)
    expect(result.value.newlyUnlockedAchievementIds).toContain('max-button')
  })

  it('uses the remaining cap when it is tighter than affordability', () => {
    const result = maxProduct(createTestRun(), {
      productId: 'private-train',
      timestamp: 2_000,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(getProductQuantity(result.value.state, 'private-train')).toBe(7_999)
    expect(deriveRunTotals(result.value.state).remainingBalanceUsd).toBe(50_000_000)
  })

  it('accounts for current holdings', () => {
    const state = requireSuccess(
      purchaseProduct(createTestRun(), {
        productId: 'private-train',
        quantity: 7_990,
        timestamp: 2_000,
      }),
    )
    const result = maxProduct(state, { productId: 'private-train', timestamp: 2_001 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.event.quantityDelta).toBe(9)
    expect(getProductQuantity(result.value.state, 'private-train')).toBe(7_999)
  })
})
