import { PRODUCT_BY_ID } from '../data/products'
import type { AchievementId } from './achievement-types'
import type { DomainCommandKind, DomainTransitionEvent } from './achievement-events'
import { calculateNewAchievementUnlocks } from './achievements'
import type { ProductDefinition } from './catalog'
import { domainFailure, domainSuccess, type DomainResult } from './errors'
import {
  deriveRunTotals,
  getProductQuantity,
  getProductUnitPriceUsd,
  type RunState,
} from './game-state'
import {
  addUsd,
  isNonNegativeSafeInteger,
  isPositiveSafeInteger,
  multiplyUsd,
  subtractUsd,
} from './money'

export interface QuantityCommand {
  readonly productId: string
  readonly quantity: number
  readonly timestamp: number
}

export interface UnitQuantityCommand {
  readonly productId: string
  readonly timestamp: number
}

export interface AppliedTransition {
  readonly state: RunState
  readonly event: DomainTransitionEvent
  readonly newlyUnlockedAchievementIds: readonly AchievementId[]
  readonly changed: boolean
}

export type CommandResult = DomainResult<AppliedTransition>

function ensureCommandCanRun(
  state: RunState,
  productId: string,
  timestamp: number,
): DomainResult<ProductDefinition> {
  if (state.status === 'completed' || state.status === 'expired') {
    return domainFailure('GAME_ALREADY_COMPLETED', productId)
  }
  if (state.status !== 'active') return domainFailure('GAME_NOT_ACTIVE', productId)
  if (!isNonNegativeSafeInteger(timestamp)) return domainFailure('INVALID_TIMESTAMP', productId)
  const product = PRODUCT_BY_ID.get(productId)
  return product === undefined
    ? domainFailure('UNKNOWN_PRODUCT', productId)
    : domainSuccess(product)
}

function invalidQuantityResult(productId: string, quantity: number): CommandResult {
  return Number.isFinite(quantity) && Number.isInteger(quantity) && !Number.isSafeInteger(quantity)
    ? domainFailure('UNSAFE_INTEGER', productId)
    : domainFailure('INVALID_QUANTITY', productId)
}

function applyTargetQuantity(
  state: RunState,
  product: ProductDefinition,
  targetQuantity: number,
  timestamp: number,
  commandKind: DomainCommandKind,
): CommandResult {
  const beforeTotals = deriveRunTotals(state)
  const currentQuantity = getProductQuantity(state, product.id)
  const quantityDelta = targetQuantity - currentQuantity
  const unitPriceUsd = getProductUnitPriceUsd(state, product)

  if (!Number.isSafeInteger(quantityDelta)) return domainFailure('UNSAFE_INTEGER', product.id)
  if (targetQuantity > product.maxQuantityPerRun) return domainFailure('CAP_EXCEEDED', product.id)

  if (quantityDelta > 0) {
    const costUsd = multiplyUsd(unitPriceUsd, quantityDelta)
    if (costUsd > beforeTotals.remainingBalanceUsd) {
      return domainFailure('INSUFFICIENT_BALANCE', product.id)
    }
  }

  const changed = quantityDelta !== 0
  const nextQuantities = changed
    ? { ...state.quantities, [product.id]: targetQuantity }
    : state.quantities
  const nextPriceSnapshots =
    changed && targetQuantity > 0 && state.unitPriceSnapshotsUsd[product.id] === undefined
      ? { ...state.unitPriceSnapshotsUsd, [product.id]: product.priceUsd }
      : state.unitPriceSnapshotsUsd

  const stateWithQuantity: RunState = changed
    ? {
        ...state,
        quantities: nextQuantities,
        unitPriceSnapshotsUsd: nextPriceSnapshots,
      }
    : state
  const absoluteDeltaUsd = multiplyUsd(unitPriceUsd, Math.abs(quantityDelta))
  const balanceAfterUsd =
    quantityDelta >= 0
      ? subtractUsd(beforeTotals.remainingBalanceUsd, absoluteDeltaUsd)
      : addUsd(beforeTotals.remainingBalanceUsd, absoluteDeltaUsd)
  const completed = balanceAfterUsd === 0
  const candidateState: RunState =
    completed && stateWithQuantity.status === 'active'
      ? { ...stateWithQuantity, status: 'completed', completedAt: timestamp }
      : stateWithQuantity
  deriveRunTotals(candidateState)
  const event: DomainTransitionEvent = {
    commandKind,
    productId: product.id,
    quantityDelta,
    balanceBeforeUsd: beforeTotals.remainingBalanceUsd,
    balanceAfterUsd,
    timestamp,
    challengeOutcome: null,
  }
  const newlyUnlockedAchievementIds = changed
    ? calculateNewAchievementUnlocks(
        { beforeState: state, afterState: candidateState, event },
        state.runUnlockedAchievementIds,
      )
    : []
  const finalState: RunState =
    newlyUnlockedAchievementIds.length === 0
      ? candidateState
      : {
          ...candidateState,
          runUnlockedAchievementIds: [
            ...candidateState.runUnlockedAchievementIds,
            ...newlyUnlockedAchievementIds,
          ],
        }

  return domainSuccess({
    state: finalState,
    event,
    newlyUnlockedAchievementIds,
    changed,
  })
}

export function purchaseProduct(state: RunState, command: QuantityCommand): CommandResult {
  const readiness = ensureCommandCanRun(state, command.productId, command.timestamp)
  if (!readiness.ok) return readiness
  if (!isPositiveSafeInteger(command.quantity)) {
    return invalidQuantityResult(command.productId, command.quantity)
  }

  const currentQuantity = getProductQuantity(state, command.productId)
  const targetQuantity = currentQuantity + command.quantity
  if (!Number.isSafeInteger(targetQuantity)) {
    return domainFailure('UNSAFE_INTEGER', command.productId)
  }
  if (targetQuantity > readiness.value.maxQuantityPerRun) {
    return domainFailure('CAP_EXCEEDED', command.productId)
  }
  return applyTargetQuantity(state, readiness.value, targetQuantity, command.timestamp, 'purchase')
}

export function incrementProduct(state: RunState, command: UnitQuantityCommand): CommandResult {
  const readiness = ensureCommandCanRun(state, command.productId, command.timestamp)
  if (!readiness.ok) return readiness
  const targetQuantity = getProductQuantity(state, command.productId) + 1
  if (!Number.isSafeInteger(targetQuantity)) {
    return domainFailure('UNSAFE_INTEGER', command.productId)
  }
  if (targetQuantity > readiness.value.maxQuantityPerRun) {
    return domainFailure('CAP_EXCEEDED', command.productId)
  }
  return applyTargetQuantity(state, readiness.value, targetQuantity, command.timestamp, 'increment')
}

export function removeProduct(state: RunState, command: QuantityCommand): CommandResult {
  const readiness = ensureCommandCanRun(state, command.productId, command.timestamp)
  if (!readiness.ok) return readiness
  if (!isPositiveSafeInteger(command.quantity)) {
    return invalidQuantityResult(command.productId, command.quantity)
  }
  const currentQuantity = getProductQuantity(state, command.productId)
  if (command.quantity > currentQuantity) {
    return domainFailure('OWNED_QUANTITY_EXCEEDED', command.productId)
  }
  return applyTargetQuantity(
    state,
    readiness.value,
    currentQuantity - command.quantity,
    command.timestamp,
    'decrement',
  )
}

export function decrementProduct(state: RunState, command: UnitQuantityCommand): CommandResult {
  const readiness = ensureCommandCanRun(state, command.productId, command.timestamp)
  if (!readiness.ok) return readiness
  const targetQuantity = Math.max(0, getProductQuantity(state, command.productId) - 1)
  return applyTargetQuantity(state, readiness.value, targetQuantity, command.timestamp, 'decrement')
}

export function setProductQuantity(state: RunState, command: QuantityCommand): CommandResult {
  const readiness = ensureCommandCanRun(state, command.productId, command.timestamp)
  if (!readiness.ok) return readiness
  if (!Number.isSafeInteger(command.quantity)) {
    return invalidQuantityResult(command.productId, command.quantity)
  }

  const currentQuantity = getProductQuantity(state, command.productId)
  const unitPriceUsd = getProductUnitPriceUsd(state, readiness.value)
  const balanceUsd = deriveRunTotals(state).remainingBalanceUsd
  const maxTarget = Math.min(
    readiness.value.maxQuantityPerRun,
    currentQuantity + Math.floor(balanceUsd / unitPriceUsd),
  )
  const sanitizedTarget = Math.max(0, command.quantity)
  const targetQuantity = Math.min(sanitizedTarget, maxTarget)
  return applyTargetQuantity(
    state,
    readiness.value,
    targetQuantity,
    command.timestamp,
    'set-quantity',
  )
}

export function maxProduct(state: RunState, command: UnitQuantityCommand): CommandResult {
  const readiness = ensureCommandCanRun(state, command.productId, command.timestamp)
  if (!readiness.ok) return readiness
  const currentQuantity = getProductQuantity(state, command.productId)
  const balanceUsd = deriveRunTotals(state).remainingBalanceUsd
  const unitPriceUsd = getProductUnitPriceUsd(state, readiness.value)
  const additionalQuantity = Math.min(
    Math.floor(balanceUsd / unitPriceUsd),
    readiness.value.maxQuantityPerRun - currentQuantity,
  )
  return applyTargetQuantity(
    state,
    readiness.value,
    currentQuantity + additionalQuantity,
    command.timestamp,
    'max',
  )
}
