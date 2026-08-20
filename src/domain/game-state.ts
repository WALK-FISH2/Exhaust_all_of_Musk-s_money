import type { AchievementId } from './achievement-types'
import type { ProductDefinition } from './catalog'
import { getChallengeDurationMs } from '../data/challenges'
import { CATALOG_VERSION } from '../data/config'
import { PRODUCTS } from '../data/products'
import { domainFailure, domainSuccess, type DomainResult } from './errors'
import {
  INITIAL_BUDGET_USD,
  addUsd,
  assertValidUsd,
  isNonNegativeSafeInteger,
  multiplyUsd,
  subtractUsd,
} from './money'

export type ChallengeMode = 'challenge-30' | 'challenge-60' | 'challenge-300'
export type RunMode = 'free' | ChallengeMode
export type RunStatus = 'ready' | 'active' | 'completed' | 'expired'

export interface RunState {
  readonly id: string
  readonly catalogVersion: number
  readonly mode: RunMode
  readonly initialBudgetUsd: number
  readonly quantities: Readonly<Record<string, number>>
  readonly unitPriceSnapshotsUsd: Readonly<Record<string, number>>
  readonly startedAt: number | null
  readonly deadlineAt: number | null
  readonly durationMs: number | null
  readonly completedAt: number | null
  readonly status: RunStatus
  readonly runUnlockedAchievementIds: readonly AchievementId[]
}

export interface CreateRunInput {
  readonly id: string
  readonly mode: RunMode
  readonly timestamp: number
}

export interface RunTotals {
  readonly totalSpentUsd: number
  readonly remainingBalanceUsd: number
}

export type RunStateIssueCode =
  | 'INVALID_INITIAL_BUDGET'
  | 'UNKNOWN_PRODUCT'
  | 'INVALID_QUANTITY'
  | 'CAP_EXCEEDED'
  | 'INVALID_PRICE_SNAPSHOT'
  | 'SPEND_EXCEEDS_BUDGET'
  | 'INVALID_COMPLETION_STATE'
  | 'INVALID_TIMING_STATE'

export interface RunStateIssue {
  readonly code: RunStateIssueCode
  readonly productId?: string
}

export interface RunStateValidationResult {
  readonly valid: boolean
  readonly issues: readonly RunStateIssue[]
  readonly totals: RunTotals | null
}

export class RunStateError extends Error {
  readonly code = 'INVALID_STATE' as const

  constructor(readonly issues: readonly RunStateIssue[]) {
    super('INVALID_STATE')
    this.name = 'RunStateError'
  }
}

export function createRun(input: CreateRunInput): DomainResult<RunState> {
  if (input.id.trim().length === 0) return domainFailure('INVALID_RUN_ID')
  if (!isNonNegativeSafeInteger(input.timestamp)) return domainFailure('INVALID_TIMESTAMP')

  const isFreeMode = input.mode === 'free'
  return domainSuccess({
    id: input.id,
    catalogVersion: CATALOG_VERSION,
    mode: input.mode,
    initialBudgetUsd: INITIAL_BUDGET_USD,
    quantities: {},
    unitPriceSnapshotsUsd: {},
    startedAt: isFreeMode ? input.timestamp : null,
    deadlineAt: null,
    durationMs: null,
    completedAt: null,
    status: isFreeMode ? 'active' : 'ready',
    runUnlockedAchievementIds: [],
  })
}

export function isChallengeMode(mode: RunMode): mode is ChallengeMode {
  return mode !== 'free'
}

export function getProductQuantity(state: RunState, productId: string): number {
  return state.quantities[productId] ?? 0
}

export function getProductUnitPriceUsd(state: RunState, product: ProductDefinition): number {
  return state.unitPriceSnapshotsUsd[product.id] ?? product.priceUsd
}

export function validateRunState(
  state: RunState,
  products: readonly ProductDefinition[] = PRODUCTS,
): RunStateValidationResult {
  const issues: RunStateIssue[] = []
  const productsById = new Map(products.map((product) => [product.id, product]))
  let totalSpentUsd = 0

  try {
    assertValidUsd(state.initialBudgetUsd)
    if (state.initialBudgetUsd !== INITIAL_BUDGET_USD) {
      issues.push({ code: 'INVALID_INITIAL_BUDGET' })
    }
  } catch {
    issues.push({ code: 'INVALID_INITIAL_BUDGET' })
  }

  for (const [productId, quantity] of Object.entries(state.quantities)) {
    const product = productsById.get(productId)
    if (product === undefined) {
      issues.push({ code: 'UNKNOWN_PRODUCT', productId })
      continue
    }
    if (!isNonNegativeSafeInteger(quantity)) {
      issues.push({ code: 'INVALID_QUANTITY', productId })
      continue
    }
    if (quantity > product.maxQuantityPerRun) {
      issues.push({ code: 'CAP_EXCEEDED', productId })
      continue
    }

    const unitPriceUsd = getProductUnitPriceUsd(state, product)
    try {
      assertValidUsd(unitPriceUsd)
      totalSpentUsd = addUsd(totalSpentUsd, multiplyUsd(unitPriceUsd, quantity))
    } catch {
      issues.push({ code: 'INVALID_PRICE_SNAPSHOT', productId })
    }
  }

  if (totalSpentUsd > state.initialBudgetUsd) {
    issues.push({ code: 'SPEND_EXCEEDS_BUDGET' })
  }

  let totals: RunTotals | null = null
  if (issues.length === 0) {
    totals = {
      totalSpentUsd,
      remainingBalanceUsd: subtractUsd(state.initialBudgetUsd, totalSpentUsd),
    }
    if (state.status === 'completed' && totals.remainingBalanceUsd !== 0) {
      issues.push({ code: 'INVALID_COMPLETION_STATE' })
      totals = null
    }
    if (state.status === 'active' && totals?.remainingBalanceUsd === 0) {
      issues.push({ code: 'INVALID_COMPLETION_STATE' })
      totals = null
    }
  }

  const validTimestamp = (value: number | null): value is number =>
    value !== null && isNonNegativeSafeInteger(value)
  let timingValid = true
  if (state.mode === 'free') {
    timingValid =
      validTimestamp(state.startedAt) &&
      state.deadlineAt === null &&
      state.durationMs === null &&
      (state.status === 'active' || state.status === 'completed') &&
      (state.status === 'active'
        ? state.completedAt === null
        : validTimestamp(state.completedAt) && state.completedAt >= state.startedAt)
  } else if (state.status === 'ready') {
    timingValid =
      state.startedAt === null &&
      state.deadlineAt === null &&
      state.durationMs === null &&
      state.completedAt === null
  } else {
    const expectedDurationMs = getChallengeDurationMs(state.mode)
    const startedAt = state.startedAt
    const deadlineAt = state.deadlineAt
    timingValid =
      validTimestamp(startedAt) &&
      validTimestamp(deadlineAt) &&
      state.durationMs === expectedDurationMs &&
      Number.isSafeInteger(startedAt + expectedDurationMs) &&
      deadlineAt === startedAt + expectedDurationMs
    if (timingValid && state.status === 'active') timingValid = state.completedAt === null
    if (timingValid && state.status === 'completed') {
      timingValid =
        validTimestamp(startedAt) &&
        validTimestamp(deadlineAt) &&
        validTimestamp(state.completedAt) &&
        state.completedAt >= startedAt &&
        state.completedAt < deadlineAt
    }
    if (timingValid && state.status === 'expired') {
      timingValid = state.completedAt === deadlineAt
    }
  }
  if (!timingValid) {
    issues.push({ code: 'INVALID_TIMING_STATE' })
    totals = null
  }

  return { valid: issues.length === 0, issues, totals }
}

export function deriveRunTotals(
  state: RunState,
  products: readonly ProductDefinition[] = PRODUCTS,
): RunTotals {
  const validation = validateRunState(state, products)
  if (!validation.valid || validation.totals === null) {
    throw new RunStateError(validation.issues)
  }
  return validation.totals
}

export function isRestorableUnfinishedRun(state: RunState): boolean {
  if (state.status !== 'active' && state.status !== 'ready') return false
  return deriveRunTotals(state).remainingBalanceUsd > 0
}
