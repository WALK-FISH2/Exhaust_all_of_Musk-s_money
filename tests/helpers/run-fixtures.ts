import { PRODUCT_BY_ID } from '../../src/data/products'
import { getChallengeDurationMs } from '../../src/data/challenges'
import type { DomainTransitionEvent } from '../../src/domain/achievement-events'
import {
  createRun,
  deriveRunTotals,
  type RunMode,
  type RunState,
  type RunStatus,
} from '../../src/domain/game-state'
import { INITIAL_BUDGET_USD } from '../../src/domain/money'

export const EXACT_ZERO_QUANTITIES: Readonly<Record<string, number>> = {
  'orbital-ring-study': 1,
  'mars-city': 1,
  'lunar-base': 2,
  'ocean-cleanup': 1,
  'football-club': 1,
  'theme-park': 1,
}

export function createTestRun(id = 'test-run', timestamp = 1_000): RunState {
  const result = createRun({ id, mode: 'free', timestamp })
  if (!result.ok) throw new Error(`Test fixture could not create run: ${result.error.code}`)
  return result.value
}

export interface BuildRunOptions {
  readonly quantities?: Readonly<Record<string, number>>
  readonly mode?: RunMode
  readonly status?: RunStatus
  readonly id?: string
  readonly timestamp?: number
}

export function buildRunState(options: BuildRunOptions = {}): RunState {
  const mode = options.mode ?? 'free'
  const timestamp = options.timestamp ?? 1_000
  const result = createRun({ id: options.id ?? 'fixture-run', mode, timestamp })
  if (!result.ok) throw new Error(`Test fixture could not create run: ${result.error.code}`)

  const quantities = options.quantities ?? {}
  const unitPriceSnapshotsUsd: Record<string, number> = {}
  let totalSpentUsd = 0
  for (const [productId, quantity] of Object.entries(quantities)) {
    const product = PRODUCT_BY_ID.get(productId)
    if (product === undefined) throw new Error(`Unknown fixture product: ${productId}`)
    unitPriceSnapshotsUsd[productId] = product.priceUsd
    totalSpentUsd += product.priceUsd * quantity
  }

  const status = options.status ?? (totalSpentUsd === INITIAL_BUDGET_USD ? 'completed' : 'active')
  const durationMs = mode === 'free' || status === 'ready' ? null : getChallengeDurationMs(mode)
  const startedAt = status === 'ready' ? null : timestamp
  const deadlineAt = durationMs === null ? null : timestamp + durationMs
  const completedAt =
    status === 'completed' ? timestamp + 500 : status === 'expired' ? deadlineAt : null
  return {
    ...result.value,
    quantities: { ...quantities },
    unitPriceSnapshotsUsd,
    startedAt,
    deadlineAt,
    durationMs,
    status,
    completedAt,
  }
}

export function buildTransitionEvent(
  beforeState: RunState,
  afterState: RunState,
  overrides: Partial<DomainTransitionEvent> = {},
): DomainTransitionEvent {
  const beforeTotals = deriveRunTotals(beforeState)
  const afterTotals = deriveRunTotals(afterState)
  return {
    commandKind: overrides.commandKind ?? 'purchase',
    productId: overrides.productId ?? null,
    quantityDelta: overrides.quantityDelta ?? 0,
    balanceBeforeUsd: overrides.balanceBeforeUsd ?? beforeTotals.remainingBalanceUsd,
    balanceAfterUsd: overrides.balanceAfterUsd ?? afterTotals.remainingBalanceUsd,
    timestamp: overrides.timestamp ?? 2_000,
    challengeOutcome: overrides.challengeOutcome ?? null,
  }
}
