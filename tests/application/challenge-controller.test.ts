import { describe, expect, it } from 'vitest'

import {
  createChallengeUiState,
  createFreeModeUiState,
  deriveFreeModeViewModel,
  freeModeReducer,
  type FreeModeAction,
  type FreeModeUiState,
} from '../../src/application/free-mode-controller'
import { EXACT_ZERO_REGRESSION_PATH } from '../../src/data/products'
import { deriveRunTotals, getProductQuantity } from '../../src/domain/game-state'

const START = 2_000_000

function reduce(state: FreeModeUiState, action: FreeModeAction): FreeModeUiState {
  return freeModeReducer(state, action)
}

function start(mode: 'challenge-30' | 'challenge-60' | 'challenge-300'): FreeModeUiState {
  return reduce(createChallengeUiState(mode, `${mode}-ui`, START - 1), {
    type: 'start-challenge',
    timestamp: START,
  })
}

describe('challenge application controller', () => {
  it('separates selecting a duration from starting its authoritative clock', () => {
    const ready = createChallengeUiState('challenge-60', 'ready-ui', START)
    expect(ready.run).toMatchObject({
      mode: 'challenge-60',
      status: 'ready',
      startedAt: null,
      deadlineAt: null,
      durationMs: null,
    })
    expect(deriveFreeModeViewModel(ready)).toMatchObject({
      canPurchase: false,
      isReadOnly: true,
      isFrozen: false,
      challengeDurationMs: 60_000,
      remainingChallengeMs: 60_000,
    })

    const active = reduce(ready, { type: 'start-challenge', timestamp: START + 500 })
    expect(active.run).toMatchObject({
      status: 'active',
      startedAt: START + 500,
      deadlineAt: START + 60_500,
      durationMs: 60_000,
    })
    expect(deriveFreeModeViewModel(active).canPurchase).toBe(true)
  })

  it('repaints from timestamps and opens an expired frozen result at the deadline', () => {
    let state = start('challenge-30')
    state = reduce(state, { type: 'reconcile-time', timestamp: START + 9_876 })
    expect(state.run.status).toBe('active')
    expect(deriveFreeModeViewModel(state).remainingChallengeMs).toBe(20_124)

    state = reduce(state, { type: 'reconcile-time', timestamp: START + 30_000 })
    const view = deriveFreeModeViewModel(state)
    expect(state.run.status).toBe('expired')
    expect(state.view).toBe('result')
    expect(view.isFrozen).toBe(true)
    expect(view.canPurchase).toBe(false)
    expect(view.challengeResult).toMatchObject({ actualDurationMs: 30_000, exactZeroClear: false })
  })

  it('turns a late product action into timeout without applying the purchase', () => {
    let state = start('challenge-30')
    state = reduce(state, {
      type: 'increment',
      productId: 'lucky-sticker',
      timestamp: START + 30_001,
    })
    expect(state.run.status).toBe('expired')
    expect(state.view).toBe('result')
    expect(state.errorCode).toBe('CHALLENGE_EXPIRED')
    expect(getProductQuantity(state.run, 'lucky-sticker')).toBe(0)
  })

  it('does not force an expired read-only catalog back to results on a later page show', () => {
    let state = start('challenge-30')
    state = reduce(state, { type: 'reconcile-time', timestamp: START + 30_000 })
    state = reduce(state, { type: 'show-products' })
    expect(state.view).toBe('products')

    state = reduce(state, { type: 'reconcile-time', timestamp: START + 90_000 })
    expect(state.run.status).toBe('expired')
    expect(state.view).toBe('products')
    expect(deriveFreeModeViewModel(state).isFrozen).toBe(true)
  })

  it('finishes early, derives exact elapsed milliseconds, and preserves frozen round trips', () => {
    let state = start('challenge-60')
    EXACT_ZERO_REGRESSION_PATH.forEach((line, index) => {
      state = reduce(state, {
        type: 'set-quantity',
        productId: line.productId,
        rawQuantity: String(line.quantity),
        timestamp: index === EXACT_ZERO_REGRESSION_PATH.length - 1 ? START + 12_438 : START + index,
      })
    })

    const completedRun = state.run
    const completedResult = deriveFreeModeViewModel(state).challengeResult
    expect(state.run.status).toBe('completed')
    expect(completedResult).toMatchObject({
      outcome: 'cleared-before-deadline',
      actualDurationMs: 12_438,
      exactZeroClear: true,
    })
    expect(state.run.runUnlockedAchievementIds).toContain('challenge-clear')

    state = reduce(state, { type: 'show-products' })
    expect(state.view).toBe('products')
    expect(deriveFreeModeViewModel(state).isFrozen).toBe(true)
    state = reduce(state, { type: 'show-result' })
    expect(state.view).toBe('result')
    expect(state.run).toBe(completedRun)
    expect(deriveFreeModeViewModel(state).challengeResult).toEqual(completedResult)
  })

  it('retries the same duration as ready and can select another challenge without refresh', () => {
    let state = start('challenge-30')
    state = reduce(state, { type: 'reconcile-time', timestamp: START + 30_000 })
    state = reduce(state, {
      type: 'play-again',
      runId: 'challenge-30-retry',
      timestamp: START + 31_000,
    })
    expect(state.run).toMatchObject({ mode: 'challenge-30', status: 'ready' })
    expect(deriveRunTotals(state.run).totalSpentUsd).toBe(0)

    state = reduce(state, { type: 'open-mode-picker' })
    expect(state.modePickerOpen).toBe(true)
    state = reduce(state, {
      type: 'select-mode',
      mode: 'challenge-300',
      runId: 'challenge-300-new',
      timestamp: START + 32_000,
    })
    expect(state.run).toMatchObject({ mode: 'challenge-300', status: 'ready' })
    expect(state.modePickerOpen).toBe(false)
  })

  it('requires confirmation before discarding a purchased Free Mode run for a challenge', () => {
    let state = createFreeModeUiState('free-before-challenge', START)
    state = reduce(state, {
      type: 'increment',
      productId: 'lucky-sticker',
      timestamp: START + 1,
    })
    state = reduce(state, {
      type: 'select-mode',
      mode: 'challenge-60',
      runId: 'pending-challenge',
      timestamp: START + 2,
    })
    expect(state.restartConfirmationOpen).toBe(true)
    expect(state.pendingMode).toBe('challenge-60')
    expect(state.run.mode).toBe('free')

    state = reduce(state, {
      type: 'confirm-restart',
      runId: 'confirmed-challenge',
      timestamp: START + 3,
    })
    expect(state.run).toMatchObject({ mode: 'challenge-60', status: 'ready' })
    expect(deriveRunTotals(state.run).totalSpentUsd).toBe(0)
  })
})
