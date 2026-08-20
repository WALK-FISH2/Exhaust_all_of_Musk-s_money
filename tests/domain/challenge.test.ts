import { describe, expect, it } from 'vitest'

import { CHALLENGE_DEFINITIONS, getChallengeDurationMs } from '../../src/data/challenges'
import { EXACT_ZERO_REGRESSION_PATH } from '../../src/data/products'
import {
  deriveRemainingChallengeMs,
  reconcileChallengeTime,
  startChallenge,
} from '../../src/domain/challenge'
import { incrementProduct, purchaseProduct } from '../../src/domain/commands'
import {
  createRun,
  deriveRunTotals,
  getProductQuantity,
  validateRunState,
  type ChallengeMode,
  type RunState,
} from '../../src/domain/game-state'
import { deriveChallengeResult } from '../../src/domain/results'
import { buildRunState } from '../helpers/run-fixtures'

const START = 1_000_000

function requireReady(mode: ChallengeMode, id: string = mode): RunState {
  const result = createRun({ id, mode, timestamp: START - 1 })
  if (!result.ok) throw new Error(result.error.code)
  return result.value
}

function requireActive(mode: ChallengeMode, id: string = mode): RunState {
  const result = startChallenge(requireReady(mode, id), START)
  if (!result.ok) throw new Error(result.error.code)
  return result.value
}

describe('challenge configuration and explicit start', () => {
  it('encodes exactly the formal 30/60/300 second modes', () => {
    expect(CHALLENGE_DEFINITIONS.map(({ mode, durationMs }) => [mode, durationMs])).toEqual([
      ['challenge-30', 30_000],
      ['challenge-60', 60_000],
      ['challenge-300', 300_000],
    ])
  })

  it('keeps selection ready and creates timestamps only on explicit start', () => {
    const ready = requireReady('challenge-60')
    expect(ready).toMatchObject({
      status: 'ready',
      startedAt: null,
      deadlineAt: null,
      durationMs: null,
    })
    expect(deriveRemainingChallengeMs(ready, START + 999_999)).toBe(60_000)

    const started = startChallenge(ready, START)
    expect(started.ok).toBe(true)
    if (!started.ok) return
    expect(started.value).toMatchObject({
      status: 'active',
      startedAt: START,
      deadlineAt: START + 60_000,
      durationMs: 60_000,
    })
    expect(validateRunState(started.value).valid).toBe(true)
  })

  it('rejects challenge start for Free Mode or an already active challenge', () => {
    const free = createRun({ id: 'free', mode: 'free', timestamp: START })
    if (!free.ok) throw new Error(free.error.code)
    expect(startChallenge(free.value, START)).toEqual({
      ok: false,
      error: { code: 'INVALID_CHALLENGE_MODE' },
    })
    expect(startChallenge(requireActive('challenge-30'), START + 1)).toEqual({
      ok: false,
      error: { code: 'CHALLENGE_ALREADY_STARTED' },
    })
  })
})

describe('deadline reconciliation and command ordering', () => {
  it.each(CHALLENGE_DEFINITIONS)(
    '$mode is active at deadline−1 and expired at deadline/deadline+1',
    ({ mode, durationMs }) => {
      const active = requireActive(mode)
      const deadline = START + durationMs

      const before = reconcileChallengeTime(active, deadline - 1)
      expect(before.ok && before.value.changed).toBe(false)
      expect(before.ok && before.value.state.status).toBe('active')
      expect(deriveRemainingChallengeMs(active, deadline - 1)).toBe(1)

      const at = reconcileChallengeTime(active, deadline)
      expect(at.ok && at.value.changed).toBe(true)
      expect(at.ok && at.value.state).toMatchObject({
        status: 'expired',
        completedAt: deadline,
      })
      if (at.ok) expect(deriveChallengeResult(at.value.state)?.actualDurationMs).toBe(durationMs)

      const after = reconcileChallengeTime(active, deadline + 1)
      expect(after.ok && after.value.state.status).toBe('expired')
      if (after.ok)
        expect(deriveChallengeResult(after.value.state)?.actualDurationMs).toBe(durationMs)
    },
  )

  it('allows a purchase at deadline−1 but expires and rejects it at the exact deadline', () => {
    const active = requireActive('challenge-30')
    const allowed = incrementProduct(active, {
      productId: 'lucky-sticker',
      timestamp: START + 29_999,
    })
    expect(allowed.ok).toBe(true)
    if (allowed.ok) expect(getProductQuantity(allowed.value.state, 'lucky-sticker')).toBe(1)

    const late = incrementProduct(active, {
      productId: 'lucky-sticker',
      timestamp: START + 30_000,
    })
    expect(late.ok).toBe(false)
    if (late.ok || !('reconciliation' in late)) return
    expect(late.error.code).toBe('CHALLENGE_EXPIRED')
    expect(late.reconciliation.state.status).toBe('expired')
    expect(getProductQuantity(late.reconciliation.state, 'lucky-sticker')).toBe(0)
  })

  it('expires after a long background or a route return without any interval ticks', () => {
    const active = requireActive('challenge-60')
    const returned = reconcileChallengeTime(active, START + 120_000)
    expect(returned.ok).toBe(true)
    if (!returned.ok) return
    expect(returned.value.state.status).toBe('expired')
    expect(returned.value.state.completedAt).toBe(START + 60_000)
    expect(deriveChallengeResult(returned.value.state)?.actualDurationMs).toBe(60_000)
  })
})

describe('challenge completion, results, and achievements', () => {
  it('records an early exact-zero clear in milliseconds and freezes immediately', () => {
    let state = requireActive('challenge-60', 'early-clear')
    EXACT_ZERO_REGRESSION_PATH.forEach((line, index) => {
      const timestamp =
        index === EXACT_ZERO_REGRESSION_PATH.length - 1 ? START + 12_438 : START + index
      const result = purchaseProduct(state, { ...line, timestamp })
      if (!result.ok) throw new Error(result.error.code)
      state = result.value.state
    })

    expect(state).toMatchObject({ status: 'completed', completedAt: START + 12_438 })
    expect(deriveRunTotals(state).remainingBalanceUsd).toBe(0)
    expect(state.runUnlockedAchievementIds).toContain('challenge-clear')
    expect(deriveChallengeResult(state)).toMatchObject({
      outcome: 'cleared-before-deadline',
      durationMs: 60_000,
      actualDurationMs: 12_438,
      exactZeroClear: true,
      isFrozen: true,
      canPurchase: false,
    })
  })

  it('gives deadline expiry priority over a theoretically clearing final purchase', () => {
    const nearZero = buildRunState({
      mode: 'challenge-30',
      status: 'active',
      timestamp: START,
      quantities: {
        'orbital-ring-study': 1,
        'mars-city': 1,
        'lunar-base': 2,
        'ocean-cleanup': 1,
        'football-club': 1,
        'solar-farm': 1,
        'moon-trip': 1,
        'lucky-sticker': 999_999_999,
      },
    })
    expect(deriveRunTotals(nearZero).remainingBalanceUsd).toBe(1)

    const result = incrementProduct(nearZero, {
      productId: 'lucky-sticker',
      timestamp: START + getChallengeDurationMs('challenge-30'),
    })
    expect(result.ok).toBe(false)
    if (result.ok || !('reconciliation' in result)) return
    expect(result.reconciliation.state.status).toBe('expired')
    expect(deriveRunTotals(result.reconciliation.state).remainingBalanceUsd).toBe(1)
    expect(result.reconciliation.state.runUnlockedAchievementIds).not.toContain('challenge-clear')
  })

  it('evaluates the formal 30-second half-spend achievement on timeout once', () => {
    const halfSpent = buildRunState({
      mode: 'challenge-30',
      status: 'active',
      timestamp: START,
      quantities: { 'orbital-ring-study': 1 },
    })
    const result = reconcileChallengeTime(halfSpent, START + 30_000)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.newlyUnlockedAchievementIds).toContain('challenge-half-30')
    expect(result.value.state.runUnlockedAchievementIds).toContain('challenge-half-30')

    const repeated = reconcileChallengeTime(result.value.state, START + 31_000)
    expect(repeated.ok && repeated.value.newlyUnlockedAchievementIds).toEqual([])
  })
})
