import { getChallengeDurationMs } from '../data/challenges'
import type { AchievementId } from './achievement-types'
import type { DomainTransitionEvent } from './achievement-events'
import { calculateNewAchievementUnlocks } from './achievements'
import { domainFailure, domainSuccess, type DomainResult } from './errors'
import { deriveRunTotals, isChallengeMode, type RunState } from './game-state'
import { isNonNegativeSafeInteger } from './money'

export interface ChallengeReconciliation {
  readonly state: RunState
  readonly event: DomainTransitionEvent | null
  readonly newlyUnlockedAchievementIds: readonly AchievementId[]
  readonly changed: boolean
}

export function startChallenge(state: RunState, timestamp: number): DomainResult<RunState> {
  if (!isNonNegativeSafeInteger(timestamp)) return domainFailure('INVALID_TIMESTAMP')
  if (!isChallengeMode(state.mode)) return domainFailure('INVALID_CHALLENGE_MODE')
  if (state.status === 'completed' || state.status === 'expired') {
    return domainFailure('GAME_ALREADY_COMPLETED')
  }
  if (state.status !== 'ready') return domainFailure('CHALLENGE_ALREADY_STARTED')

  const durationMs = getChallengeDurationMs(state.mode)
  const deadlineAt = timestamp + durationMs
  if (!Number.isSafeInteger(deadlineAt)) return domainFailure('INVALID_TIMESTAMP')

  return domainSuccess({
    ...state,
    startedAt: timestamp,
    deadlineAt,
    durationMs,
    completedAt: null,
    status: 'active',
  })
}

export function deriveRemainingChallengeMs(state: RunState, timestamp: number): number {
  if (!isChallengeMode(state.mode)) return 0
  if (state.status === 'ready') return getChallengeDurationMs(state.mode)
  if (state.deadlineAt === null || state.status !== 'active') return 0
  return Math.max(0, state.deadlineAt - timestamp)
}

export function reconcileChallengeTime(
  state: RunState,
  timestamp: number,
): DomainResult<ChallengeReconciliation> {
  if (!isNonNegativeSafeInteger(timestamp)) return domainFailure('INVALID_TIMESTAMP')
  if (!isChallengeMode(state.mode) || state.status !== 'active') {
    return domainSuccess({
      state,
      event: null,
      newlyUnlockedAchievementIds: [],
      changed: false,
    })
  }
  if (state.deadlineAt === null || state.startedAt === null || state.durationMs === null) {
    return domainFailure('INVALID_STATE')
  }
  if (timestamp < state.deadlineAt) {
    return domainSuccess({
      state,
      event: null,
      newlyUnlockedAchievementIds: [],
      changed: false,
    })
  }

  const totals = deriveRunTotals(state)
  const expiredState: RunState = {
    ...state,
    status: 'expired',
    completedAt: state.deadlineAt,
  }
  const event: DomainTransitionEvent = {
    commandKind: 'challenge-completed',
    productId: null,
    quantityDelta: 0,
    balanceBeforeUsd: totals.remainingBalanceUsd,
    balanceAfterUsd: totals.remainingBalanceUsd,
    timestamp,
    challengeOutcome: 'expired',
  }
  const newlyUnlockedAchievementIds = calculateNewAchievementUnlocks(
    { beforeState: state, afterState: expiredState, event },
    state.runUnlockedAchievementIds,
  )
  const finalState: RunState =
    newlyUnlockedAchievementIds.length === 0
      ? expiredState
      : {
          ...expiredState,
          runUnlockedAchievementIds: [
            ...expiredState.runUnlockedAchievementIds,
            ...newlyUnlockedAchievementIds,
          ],
        }

  return domainSuccess({
    state: finalState,
    event,
    newlyUnlockedAchievementIds,
    changed: true,
  })
}
