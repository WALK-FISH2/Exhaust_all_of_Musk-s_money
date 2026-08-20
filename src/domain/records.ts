import { deriveChallengeResult } from './results'
import type { ChallengeMode, RunState } from './game-state'

export interface ChallengeRecordCandidate {
  readonly mode: ChallengeMode
  readonly totalSpentUsd: number
  readonly actualDurationMs: number
  readonly exactZeroClear: boolean
}

export interface ChallengeModeRecords {
  readonly highestSpending: ChallengeRecordCandidate | null
  readonly fastestClear: ChallengeRecordCandidate | null
}

export type LocalRecords = Readonly<Record<ChallengeMode, ChallengeModeRecords>>

export interface LocalRecordUpdate {
  readonly records: LocalRecords
  readonly beatenKinds: readonly ('highest-spending' | 'fastest-clear')[]
}

export function createEmptyLocalRecords(): LocalRecords {
  return {
    'challenge-30': { highestSpending: null, fastestClear: null },
    'challenge-60': { highestSpending: null, fastestClear: null },
    'challenge-300': { highestSpending: null, fastestClear: null },
  }
}

export function deriveChallengeRecordCandidate(state: RunState): ChallengeRecordCandidate | null {
  const result = deriveChallengeResult(state)
  if (result === null) return null
  return {
    mode: result.metrics.mode,
    totalSpentUsd: result.metrics.totalSpentUsd,
    actualDurationMs: result.actualDurationMs,
    exactZeroClear: result.exactZeroClear,
  }
}

export function selectHighestSpendingRecord(
  existing: ChallengeRecordCandidate | null,
  candidate: ChallengeRecordCandidate,
): ChallengeRecordCandidate {
  if (existing === null || candidate.totalSpentUsd > existing.totalSpentUsd) return candidate
  return existing
}

export function selectFastestClearRecord(
  existing: ChallengeRecordCandidate | null,
  candidate: ChallengeRecordCandidate,
): ChallengeRecordCandidate | null {
  if (!candidate.exactZeroClear) return existing
  if (
    existing === null ||
    !existing.exactZeroClear ||
    candidate.actualDurationMs < existing.actualDurationMs
  ) {
    return candidate
  }
  return existing
}

export function updateLocalRecords(
  records: LocalRecords,
  candidate: ChallengeRecordCandidate,
): LocalRecordUpdate {
  const existing = records[candidate.mode]
  const highestSpending = selectHighestSpendingRecord(existing.highestSpending, candidate)
  const fastestClear = selectFastestClearRecord(existing.fastestClear, candidate)
  const beatenKinds: ('highest-spending' | 'fastest-clear')[] = []
  if (highestSpending === candidate) beatenKinds.push('highest-spending')
  if (fastestClear === candidate) beatenKinds.push('fastest-clear')
  if (beatenKinds.length === 0) return { records, beatenKinds }

  return {
    records: {
      ...records,
      [candidate.mode]: { highestSpending, fastestClear },
    },
    beatenKinds,
  }
}
