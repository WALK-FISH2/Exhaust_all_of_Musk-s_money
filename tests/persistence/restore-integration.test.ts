import { describe, expect, it } from 'vitest'

import {
  createChallengeUiState,
  createFreeModeUiState,
  deriveFreeModeViewModel,
  freeModeReducer,
  type FreeModeAction,
  type FreeModeUiState,
} from '../../src/application/free-mode-controller'
import {
  createPersistedGameData,
  hydratePersistedGame,
} from '../../src/application/game-persistence'
import { EXACT_ZERO_REGRESSION_PATH } from '../../src/data/products'
import { getProductQuantity } from '../../src/domain/game-state'
import {
  createEmptyLocalRecords,
  updateLocalRecords,
  type ChallengeRecordCandidate,
} from '../../src/domain/records'
import { deriveChallengeResult } from '../../src/domain/results'
import { GAME_STORAGE_KEY, GameStorageRepository } from '../../src/storage/repository'
import { createDefaultPreferences } from '../../src/storage/schema'
import { MemoryStorageAdapter } from '../helpers/memory-storage'

const START = 1_000_000

function reduce(state: FreeModeUiState, action: FreeModeAction): FreeModeUiState {
  return freeModeReducer(state, action)
}

function setExactZero(state: FreeModeUiState, finalTimestamp: number): FreeModeUiState {
  return EXACT_ZERO_REGRESSION_PATH.reduce(
    (current, line, index) =>
      reduce(current, {
        type: 'set-quantity',
        productId: line.productId,
        rawQuantity: String(line.quantity),
        timestamp: index === EXACT_ZERO_REGRESSION_PATH.length - 1 ? finalTimestamp : START + index,
      }),
    state,
  )
}

async function roundTrip(state: FreeModeUiState) {
  const storage = new MemoryStorageAdapter()
  const repository = new GameStorageRepository(storage)
  expect(await repository.save(createPersistedGameData(state))).toEqual({ ok: true })
  const loaded = await repository.load()
  if (loaded.data === null) throw new Error(`Expected persisted data, got ${loaded.status}`)
  return { loaded: loaded.data, storage, repository }
}

describe('Free Mode persistence integration', () => {
  it('restores purchased quantities, money, receipt, and prompts before continuing', async () => {
    let state = createFreeModeUiState('free-active-save', START)
    state = reduce(state, {
      type: 'set-quantity',
      productId: 'gaming-pc',
      rawQuantity: '3',
      timestamp: START + 1,
    })
    const { loaded } = await roundTrip(state)
    const fallback = createFreeModeUiState('fallback', START + 5_000)
    const hydrated = hydratePersistedGame(loaded, fallback.run, START + 5_000)

    expect(hydrated.restorePromptOpen).toBe(true)
    expect(getProductQuantity(hydrated.run, 'gaming-pc')).toBe(3)
    const restored = reduce(fallback, { type: 'hydrate', progress: hydrated })
    expect(deriveFreeModeViewModel(restored).receipt.lines[0]).toMatchObject({
      productId: 'gaming-pc',
      quantity: 3,
      subtotalUsd: 15_000,
    })
    expect(reduce(restored, { type: 'continue-restored-run' }).restorePromptOpen).toBe(false)
  })

  it('restores a completed Free Mode run directly as the same frozen result', async () => {
    const completed = setExactZero(createFreeModeUiState('free-completed-save', START), START + 99)
    const metrics = deriveFreeModeViewModel(completed).metrics
    const { loaded } = await roundTrip(completed)
    const fallback = createFreeModeUiState('fallback', START + 9_000)
    const hydrated = hydratePersistedGame(loaded, fallback.run, START + 9_000)
    const restored = reduce(fallback, { type: 'hydrate', progress: hydrated })

    expect(restored.run.status).toBe('completed')
    expect(restored.view).toBe('result')
    expect(restored.restorePromptOpen).toBe(false)
    expect(deriveFreeModeViewModel(restored).isFrozen).toBe(true)
    expect(deriveFreeModeViewModel(restored).metrics).toEqual(metrics)
  })

  it('keeps lifetime achievements across new runs without duplicate permanent entries', async () => {
    let state = createFreeModeUiState('lifetime-source', START)
    state = reduce(state, {
      type: 'increment',
      productId: 'lucky-sticker',
      timestamp: START + 1,
    })
    expect(state.lifetimeAchievementIds).toEqual(['first-swipe'])

    state = reduce(state, {
      type: 'confirm-restart',
      runId: 'lifetime-next-run',
      timestamp: START + 2,
    })
    expect(state.lifetimeAchievementIds).toEqual(['first-swipe'])
    state = reduce(state, {
      type: 'increment',
      productId: 'bottled-water',
      timestamp: START + 3,
    })
    expect(state.run.runUnlockedAchievementIds).toContain('first-swipe')
    expect(state.lifetimeAchievementIds).toEqual(['first-swipe'])

    const { loaded } = await roundTrip(state)
    expect(loaded.lifetimeAchievementIds).toEqual(['first-swipe'])
  })

  it('clears current run, lifetime achievements, records, and preferences only after confirmation', () => {
    let state = createFreeModeUiState('clear-source', START)
    state = reduce(state, {
      type: 'increment',
      productId: 'lucky-sticker',
      timestamp: START + 1,
    })
    state = reduce(state, { type: 'request-clear-data' })
    expect(state.clearDataConfirmationOpen).toBe(true)
    state = reduce(state, { type: 'cancel-clear-data' })
    expect(state.lifetimeAchievementIds).toEqual(['first-swipe'])

    state = reduce(state, {
      type: 'clear-local-data',
      runId: 'after-clear',
      timestamp: START + 2,
    })
    expect(state.run.id).toBe('after-clear')
    expect(state.lifetimeAchievementIds).toEqual([])
    expect(state.records).toEqual(createEmptyLocalRecords())
    expect(state.preferences).toEqual(createDefaultPreferences())
    expect(state.persistenceRevision).toBe(0)
  })
})

describe('challenge persistence integration', () => {
  it('restores an active challenge with its original deadline and reduced remaining time', async () => {
    let state = createChallengeUiState('challenge-60', 'challenge-active-save', START - 1)
    state = reduce(state, { type: 'start-challenge', timestamp: START })
    state = reduce(state, {
      type: 'increment',
      productId: 'lucky-sticker',
      timestamp: START + 1,
    })
    const originalDeadline = state.run.deadlineAt
    const { loaded } = await roundTrip(state)
    const fallback = createFreeModeUiState('fallback', START + 20_000)
    const restored = reduce(fallback, {
      type: 'hydrate',
      progress: hydratePersistedGame(loaded, fallback.run, START + 20_000),
    })

    expect(restored.run.status).toBe('active')
    expect(restored.run.deadlineAt).toBe(originalDeadline)
    expect(deriveFreeModeViewModel(restored).remainingChallengeMs).toBe(40_000)
    expect(restored.restorePromptOpen).toBe(true)
  })

  it('restores an elapsed challenge directly to frozen expiry with configured duration', async () => {
    let state = createChallengeUiState('challenge-30', 'challenge-expired-save', START - 1)
    state = reduce(state, { type: 'start-challenge', timestamp: START })
    const { loaded } = await roundTrip(state)
    const fallback = createFreeModeUiState('fallback', START + 120_000)
    const hydrated = hydratePersistedGame(loaded, fallback.run, START + 120_000)
    const restored = reduce(fallback, { type: 'hydrate', progress: hydrated })

    expect(restored.run.status).toBe('expired')
    expect(restored.run.completedAt).toBe(START + 30_000)
    expect(restored.view).toBe('result')
    expect(deriveChallengeResult(restored.run)).toMatchObject({ actualDurationMs: 30_000 })
    expect(hydrated.requiresSave).toBe(true)
  })

  it('restores an early clear with its stable completedAt and millisecond duration', async () => {
    let completed = createChallengeUiState('challenge-60', 'challenge-clear-save', START - 1)
    completed = reduce(completed, { type: 'start-challenge', timestamp: START })
    completed = setExactZero(completed, START + 12_438)
    const { loaded } = await roundTrip(completed)
    const fallback = createFreeModeUiState('fallback', START + 500_000)
    const restored = reduce(fallback, {
      type: 'hydrate',
      progress: hydratePersistedGame(loaded, fallback.run, START + 500_000),
    })

    expect(restored.run.completedAt).toBe(START + 12_438)
    expect(deriveChallengeResult(restored.run)).toMatchObject({ actualDurationMs: 12_438 })
    expect(restored.restorePromptOpen).toBe(false)
  })

  it('updates a terminal challenge record atomically with achievements and the run', () => {
    let state = createChallengeUiState('challenge-30', 'record-terminal', START - 1)
    state = reduce(state, { type: 'start-challenge', timestamp: START })
    state = reduce(state, {
      type: 'increment',
      productId: 'orbital-ring-study',
      timestamp: START + 1,
    })
    state = reduce(state, { type: 'reconcile-time', timestamp: START + 30_000 })

    expect(state.records['challenge-30'].highestSpending).toMatchObject({
      totalSpentUsd: 200_000_000_000,
      actualDurationMs: 30_000,
    })
    expect(state.lifetimeAchievementIds).toEqual(
      expect.arrayContaining(['first-swipe', 'hundred-billion', 'challenge-half-30']),
    )
    expect(state.beatenRecordKinds).toEqual(['highest-spending'])
  })
})

describe('record persistence and autosave signals', () => {
  it('preserves higher/faster records and keeps lower/slower/equal candidates from replacing them', async () => {
    const spending = (totalSpentUsd: number): ChallengeRecordCandidate => ({
      mode: 'challenge-30',
      totalSpentUsd,
      actualDurationMs: 30_000,
      exactZeroClear: false,
    })
    const clear = (actualDurationMs: number): ChallengeRecordCandidate => ({
      mode: 'challenge-30',
      totalSpentUsd: 400_000_000_000,
      actualDurationMs,
      exactZeroClear: true,
    })
    let records = createEmptyLocalRecords()
    records = updateLocalRecords(records, spending(100)).records
    const firstSpending = records['challenge-30'].highestSpending
    records = updateLocalRecords(records, spending(99)).records
    records = updateLocalRecords(records, spending(100)).records
    expect(records['challenge-30'].highestSpending).toBe(firstSpending)
    records = updateLocalRecords(records, spending(101)).records
    expect(records['challenge-30'].highestSpending?.totalSpentUsd).toBe(101)

    records = updateLocalRecords(records, clear(12_438)).records
    const firstClear = records['challenge-30'].fastestClear
    records = updateLocalRecords(records, clear(12_439)).records
    records = updateLocalRecords(records, clear(12_438)).records
    expect(records['challenge-30'].fastestClear).toBe(firstClear)
    records = updateLocalRecords(records, clear(12_437)).records
    expect(records['challenge-30'].fastestClear?.actualDurationMs).toBe(12_437)

    const storage = new MemoryStorageAdapter()
    const repository = new GameStorageRepository(storage)
    const state = createFreeModeUiState('record-save', START)
    expect(
      await repository.save({
        ...createPersistedGameData(state),
        records,
        preferences: createDefaultPreferences(),
      }),
    ).toEqual({ ok: true })
    expect((await repository.load()).data?.records).toEqual(records)
    expect(storage.getRaw(GAME_STORAGE_KEY)).not.toBeNull()
  })

  it('increments persistence revision only for authoritative mutations', () => {
    let state = createChallengeUiState('challenge-30', 'autosave-signals', START - 1)
    expect(state.persistenceRevision).toBe(0)
    state = reduce(state, { type: 'search', query: 'mars' })
    state = reduce(state, { type: 'reconcile-time', timestamp: START - 1 })
    expect(state.persistenceRevision).toBe(0)

    state = reduce(state, { type: 'start-challenge', timestamp: START })
    expect(state.persistenceRevision).toBe(1)
    state = reduce(state, { type: 'reconcile-time', timestamp: START + 1_000 })
    expect(state.persistenceRevision).toBe(1)
    state = reduce(state, {
      type: 'increment',
      productId: 'lucky-sticker',
      timestamp: START + 2_000,
    })
    expect(state.persistenceRevision).toBe(2)
    state = reduce(state, { type: 'reconcile-time', timestamp: START + 30_000 })
    expect(state.persistenceRevision).toBe(3)
  })
})
