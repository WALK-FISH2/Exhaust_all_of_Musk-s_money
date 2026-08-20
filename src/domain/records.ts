import { deriveChallengeResult } from './results'
import type { ChallengeMode, RunState } from './game-state'

export interface ChallengeRecordCandidate {
  readonly mode: ChallengeMode
  readonly totalSpentUsd: number
  readonly actualDurationMs: number
  readonly exactZeroClear: boolean
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
