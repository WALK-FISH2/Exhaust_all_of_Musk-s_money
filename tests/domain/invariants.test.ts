import { describe, expect, it } from 'vitest'

import { PRODUCT_BY_ID, PRODUCTS } from '../../src/data/products'
import {
  maxProduct,
  purchaseProduct,
  removeProduct,
  setProductQuantity,
  type CommandResult,
} from '../../src/domain/commands'
import {
  deriveRunTotals,
  getProductQuantity,
  validateRunState,
  type RunState,
} from '../../src/domain/game-state'
import { createTestRun } from '../helpers/run-fixtures'

interface GeneratedCommand {
  readonly kind: 'purchase' | 'remove' | 'set' | 'max'
  readonly productId: string
  readonly quantity: number
  readonly timestamp: number
}

function nextRandom(seed: number): number {
  return (seed * 1_664_525 + 1_013_904_223) >>> 0
}

function generateCommands(count: number): readonly GeneratedCommand[] {
  const products = PRODUCTS.slice(0, 15)
  const commands: GeneratedCommand[] = []
  let seed = 0x5eed1234
  for (let index = 0; index < count; index += 1) {
    seed = nextRandom(seed)
    const product = products[seed % products.length]!
    seed = nextRandom(seed)
    const kind = (['purchase', 'remove', 'set', 'max'] as const)[seed % 4]!
    seed = nextRandom(seed)
    commands.push({
      kind,
      productId: product.id,
      quantity: (seed % 25) + 1,
      timestamp: 10_000 + index,
    })
  }
  return commands
}

function execute(state: RunState, command: GeneratedCommand): CommandResult {
  switch (command.kind) {
    case 'purchase':
      return purchaseProduct(state, command)
    case 'remove':
      return removeProduct(state, command)
    case 'set':
      return setProductQuantity(state, command)
    case 'max':
      return maxProduct(state, command)
  }
}

function assertInvariants(state: RunState): void {
  const validation = validateRunState(state)
  expect(validation.valid, JSON.stringify(validation.issues)).toBe(true)
  const totals = deriveRunTotals(state)
  expect(totals.remainingBalanceUsd).toBeGreaterThanOrEqual(0)
  expect(totals.totalSpentUsd).toBeGreaterThanOrEqual(0)
  expect(totals.remainingBalanceUsd + totals.totalSpentUsd).toBe(state.initialBudgetUsd)

  for (const [productId, quantity] of Object.entries(state.quantities)) {
    const product = PRODUCT_BY_ID.get(productId)
    expect(product).toBeDefined()
    expect(Number.isSafeInteger(quantity)).toBe(true)
    expect(quantity).toBeGreaterThanOrEqual(0)
    expect(quantity).toBeLessThanOrEqual(product?.maxQuantityPerRun ?? -1)
  }
}

describe('domain invariants under generated command sequences', () => {
  it('preserves money and quantity invariants across 1,000 deterministic mutations', () => {
    let state = createTestRun('generated-sequence')
    assertInvariants(state)

    for (const command of generateCommands(1_000)) {
      const result = execute(state, command)
      if (result.ok) state = result.value.state
      assertInvariants(state)
    }
  })

  it('replays an identical command sequence deterministically', () => {
    let left = createTestRun('deterministic')
    let right = createTestRun('deterministic')
    for (const command of generateCommands(250)) {
      const leftResult = execute(left, command)
      const rightResult = execute(right, command)
      expect(leftResult.ok).toBe(rightResult.ok)
      if (leftResult.ok && rightResult.ok) {
        left = leftResult.value.state
        right = rightResult.value.state
      }
    }
    expect(right).toEqual(left)
  })

  it('uses the captured unit-price snapshot for an existing run', () => {
    const purchased = purchaseProduct(createTestRun('price-snapshot'), {
      productId: 'bubble-tea',
      quantity: 10,
      timestamp: 2_000,
    })
    if (!purchased.ok) throw new Error(purchased.error.code)

    const changedCatalog = PRODUCTS.map((product) =>
      product.id === 'bubble-tea' ? { ...product, priceUsd: 999 } : product,
    )
    expect(deriveRunTotals(purchased.value.state, changedCatalog).totalSpentUsd).toBe(60)
    expect(getProductQuantity(purchased.value.state, 'bubble-tea')).toBe(10)
  })
})
