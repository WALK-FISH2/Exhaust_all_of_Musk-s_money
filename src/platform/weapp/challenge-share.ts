import { getChallengeDurationMs } from '../../data/challenges'
import { isChallengeMode, type ChallengeMode, type RunState } from '../../domain/game-state'
import type { LocalRecords } from '../../domain/records'
import { deriveChallengeResult } from '../../domain/results'
import { formatChallengeShareTitle, M6_COPY } from '../../i18n/m6'

export const CHALLENGE_SHARE_PATH = '/pages/index/index'
export const FREE_SHARE_QUERY = 'shareMode=free'

export interface ChallengeShareRouteParams extends Partial<Record<string, string>> {
  readonly shareMode?: string | undefined
  readonly challengeMode?: string | undefined
  readonly duration?: string | undefined
  readonly record?: string | undefined
}

export interface ChallengeShareSnapshot {
  readonly mode: ChallengeMode
  readonly durationSeconds: 30 | 60 | 300
  readonly recordMs: number | null
}

export interface ChallengeSharePayload {
  readonly title: string
  readonly path: string
  readonly query: string
}

export interface ChallengeShareHandlers {
  readonly friend: { readonly title: string; readonly path: string }
  readonly timeline: { readonly title: string; readonly query: string }
}

export type WeappShareLanding =
  | { readonly kind: 'free'; readonly mode: 'free' }
  | ({ readonly kind: 'challenge' } & ChallengeShareSnapshot)

function parseInteger(value: string | undefined): number | null {
  if (value === undefined || !/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function parseChallengeMode(value: string | undefined): ChallengeMode | null {
  return value === 'challenge-30' || value === 'challenge-60' || value === 'challenge-300'
    ? value
    : null
}

function toDurationSeconds(mode: ChallengeMode): 30 | 60 | 300 {
  return (getChallengeDurationMs(mode) / 1_000) as 30 | 60 | 300
}

export function selectChallengeShareRecordMs(run: RunState, records: LocalRecords): number | null {
  if (!isChallengeMode(run.mode)) return null
  const currentResult = deriveChallengeResult(run)
  if (currentResult !== null) return currentResult.actualDurationMs
  const modeRecords = records[run.mode]
  return (
    modeRecords.fastestClear?.actualDurationMs ??
    modeRecords.highestSpending?.actualDurationMs ??
    null
  )
}

export function createChallengeShareSnapshot(
  run: RunState,
  records: LocalRecords,
): ChallengeShareSnapshot | null {
  if (!isChallengeMode(run.mode)) return null
  return {
    mode: run.mode,
    durationSeconds: toDurationSeconds(run.mode),
    recordMs: selectChallengeShareRecordMs(run, records),
  }
}

export function buildChallengeSharePayload(
  snapshot: ChallengeShareSnapshot,
): ChallengeSharePayload {
  const parameters = [
    `challengeMode=${encodeURIComponent(snapshot.mode)}`,
    `duration=${snapshot.durationSeconds}`,
  ]
  if (snapshot.recordMs !== null) parameters.push(`record=${snapshot.recordMs}`)
  const query = parameters.join('&')
  return {
    title: formatChallengeShareTitle(snapshot.durationSeconds, snapshot.recordMs),
    path: `${CHALLENGE_SHARE_PATH}?${query}`,
    query,
  }
}

export function buildWeappShareHandlers(
  snapshot: ChallengeShareSnapshot | null,
): ChallengeShareHandlers {
  if (snapshot === null) {
    return {
      friend: {
        title: M6_COPY.freeShareTitle,
        path: `${CHALLENGE_SHARE_PATH}?${FREE_SHARE_QUERY}`,
      },
      timeline: { title: M6_COPY.freeShareTitle, query: FREE_SHARE_QUERY },
    }
  }
  const payload = buildChallengeSharePayload(snapshot)
  return {
    friend: { title: payload.title, path: payload.path },
    timeline: { title: payload.title, query: payload.query },
  }
}

export function parseChallengeShareRoute(
  parameters: ChallengeShareRouteParams,
): ChallengeShareSnapshot | null {
  const mode = parseChallengeMode(parameters.challengeMode)
  if (mode === null) return null
  const durationSeconds = parseInteger(parameters.duration)
  const expectedDurationSeconds = toDurationSeconds(mode)
  if (durationSeconds !== expectedDurationSeconds) return null

  const maximumRecordMs = getChallengeDurationMs(mode)
  const parsedRecord = parseInteger(parameters.record)
  const recordMs =
    parameters.record === undefined
      ? null
      : parsedRecord !== null && parsedRecord <= maximumRecordMs
        ? parsedRecord
        : null
  return { mode, durationSeconds: expectedDurationSeconds, recordMs }
}

export function parseWeappShareRoute(
  parameters: ChallengeShareRouteParams,
): WeappShareLanding | null {
  if (parameters.shareMode !== undefined) {
    const freeOnly =
      parameters.shareMode === 'free' &&
      parameters.challengeMode === undefined &&
      parameters.duration === undefined &&
      parameters.record === undefined
    return freeOnly ? { kind: 'free', mode: 'free' } : null
  }

  const challenge = parseChallengeShareRoute(parameters)
  return challenge === null ? null : { kind: 'challenge', ...challenge }
}
