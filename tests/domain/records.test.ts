import { describe, expect, it } from 'vitest'

import {
  selectFastestClearRecord,
  selectHighestSpendingRecord,
  type ChallengeRecordCandidate,
} from '../../src/domain/records'

function candidate(
  totalSpentUsd: number,
  actualDurationMs: number,
  exactZeroClear = false,
): ChallengeRecordCandidate {
  return { mode: 'challenge-60', totalSpentUsd, actualDurationMs, exactZeroClear }
}

describe('pure challenge record candidate comparison', () => {
  it('replaces highest spending only for a strictly higher integer total', () => {
    const existing = candidate(200_000_000_000, 60_000)
    const higher = candidate(200_000_000_001, 60_000)
    expect(selectHighestSpendingRecord(existing, higher)).toBe(higher)
    expect(selectHighestSpendingRecord(existing, candidate(199_999_999_999, 60_000))).toBe(existing)
  })

  it('preserves the existing spending record on an exact tie', () => {
    const existing = candidate(200_000_000_000, 60_000)
    expect(selectHighestSpendingRecord(existing, candidate(200_000_000_000, 59_000))).toBe(existing)
  })

  it('replaces fastest clear only for a strictly lower millisecond duration', () => {
    const existing = candidate(400_000_000_000, 12_438, true)
    const faster = candidate(400_000_000_000, 12_437, true)
    expect(selectFastestClearRecord(existing, faster)).toBe(faster)
    expect(selectFastestClearRecord(existing, candidate(400_000_000_000, 12_439, true))).toBe(
      existing,
    )
  })

  it('preserves the existing fastest clear on a millisecond tie', () => {
    const existing = candidate(400_000_000_000, 12_438, true)
    expect(selectFastestClearRecord(existing, candidate(400_000_000_000, 12_438, true))).toBe(
      existing,
    )
  })

  it('ignores a non-clear candidate for fastest-clear records', () => {
    const existing = candidate(400_000_000_000, 12_438, true)
    expect(selectFastestClearRecord(existing, candidate(399_999_999_999, 1, false))).toBe(existing)
    expect(selectFastestClearRecord(null, candidate(399_999_999_999, 1, false))).toBeNull()
  })
})
