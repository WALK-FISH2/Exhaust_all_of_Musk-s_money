import { ACHIEVEMENT_DEFINITIONS } from '../data/achievements'
import { getChallengeDurationMs } from '../data/challenges'
import { CATALOG_VERSION } from '../data/config'
import { PRODUCT_BY_ID } from '../data/products'
import type { AchievementId } from '../domain/achievement-types'
import {
  validateRunState,
  type ChallengeMode,
  type RunMode,
  type RunState,
  type RunStatus,
} from '../domain/game-state'
import {
  INITIAL_BUDGET_USD,
  isNonNegativeSafeInteger,
  isPositiveSafeInteger,
} from '../domain/money'
import {
  createEmptyLocalRecords,
  type ChallengeRecordCandidate,
  type LocalRecords,
} from '../domain/records'
import {
  CURRENT_SCHEMA_VERSION,
  createDefaultPreferences,
  type PersistedGameDataV1,
  type Preferences,
} from './schema'

export type PersistenceDiagnosticCode =
  | 'ACTIVE_RUN_DROPPED'
  | 'UNKNOWN_ACHIEVEMENT_DROPPED'
  | 'DUPLICATE_ACHIEVEMENT_DROPPED'
  | 'INVALID_LIFETIME_ACHIEVEMENTS_RESET'
  | 'INVALID_RECORD_DROPPED'
  | 'INVALID_PREFERENCES_RESET'

export interface PersistedValidationResult {
  readonly data: PersistedGameDataV1
  readonly diagnostics: readonly PersistenceDiagnosticCode[]
  readonly recovered: boolean
}

type UnknownRecord = Readonly<Record<string, unknown>>

const ACHIEVEMENT_IDS = new Set<AchievementId>(
  ACHIEVEMENT_DEFINITIONS.map((definition) => definition.id),
)
const RUN_MODES = new Set<RunMode>(['free', 'challenge-30', 'challenge-60', 'challenge-300'])
const RUN_STATUSES = new Set<RunStatus>(['ready', 'active', 'completed', 'expired'])
const CHALLENGE_MODES: readonly ChallengeMode[] = ['challenge-30', 'challenge-60', 'challenge-300']

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNullableTimestamp(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && isNonNegativeSafeInteger(value))
}

function sanitizeAchievementIds(
  value: unknown,
  diagnostics: PersistenceDiagnosticCode[],
  invalidCollectionCode: PersistenceDiagnosticCode,
): readonly AchievementId[] {
  if (!Array.isArray(value)) {
    diagnostics.push(invalidCollectionCode)
    return []
  }

  const seen = new Set<AchievementId>()
  const result: AchievementId[] = []
  for (const candidate of value) {
    if (typeof candidate !== 'string' || !ACHIEVEMENT_IDS.has(candidate as AchievementId)) {
      diagnostics.push('UNKNOWN_ACHIEVEMENT_DROPPED')
      continue
    }
    const id = candidate as AchievementId
    if (seen.has(id)) {
      diagnostics.push('DUPLICATE_ACHIEVEMENT_DROPPED')
      continue
    }
    seen.add(id)
    result.push(id)
  }
  return result
}

function parseNumberRecord(value: unknown): Readonly<Record<string, number>> | null {
  if (!isRecord(value)) return null
  const parsed: Record<string, number> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'number' || !isNonNegativeSafeInteger(entry)) return null
    parsed[key] = entry
  }
  return parsed
}

function parseRunState(value: unknown, diagnostics: PersistenceDiagnosticCode[]): RunState | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || value.id.trim().length === 0) return null
  if (value.catalogVersion !== CATALOG_VERSION) return null
  if (!RUN_MODES.has(value.mode as RunMode) || !RUN_STATUSES.has(value.status as RunStatus)) {
    return null
  }
  if (value.initialBudgetUsd !== INITIAL_BUDGET_USD) return null
  if (
    !isNullableTimestamp(value.startedAt) ||
    !isNullableTimestamp(value.deadlineAt) ||
    !isNullableTimestamp(value.durationMs) ||
    !isNullableTimestamp(value.completedAt)
  ) {
    return null
  }

  const quantities = parseNumberRecord(value.quantities)
  const unitPriceSnapshotsUsd = parseNumberRecord(value.unitPriceSnapshotsUsd)
  if (quantities === null || unitPriceSnapshotsUsd === null) return null
  if (!Array.isArray(value.runUnlockedAchievementIds)) return null

  for (const [productId, snapshot] of Object.entries(unitPriceSnapshotsUsd)) {
    if (!PRODUCT_BY_ID.has(productId) || !isPositiveSafeInteger(snapshot)) return null
  }
  for (const [productId, quantity] of Object.entries(quantities)) {
    if (!PRODUCT_BY_ID.has(productId)) return null
    if (quantity > 0 && unitPriceSnapshotsUsd[productId] === undefined) return null
  }

  const runUnlockedAchievementIds = sanitizeAchievementIds(
    value.runUnlockedAchievementIds,
    diagnostics,
    'INVALID_LIFETIME_ACHIEVEMENTS_RESET',
  )
  const state: RunState = {
    id: value.id,
    catalogVersion: CATALOG_VERSION,
    mode: value.mode as RunMode,
    initialBudgetUsd: INITIAL_BUDGET_USD,
    quantities,
    unitPriceSnapshotsUsd,
    startedAt: value.startedAt,
    deadlineAt: value.deadlineAt,
    durationMs: value.durationMs,
    completedAt: value.completedAt,
    status: value.status as RunStatus,
    runUnlockedAchievementIds,
  }
  return validateRunState(state).valid ? state : null
}

function parseRecordCandidate(
  value: unknown,
  mode: ChallengeMode,
  requireClear: boolean,
): ChallengeRecordCandidate | null {
  if (!isRecord(value) || value.mode !== mode) return null
  const totalSpentUsd = value.totalSpentUsd
  const actualDurationMs = value.actualDurationMs
  if (
    typeof totalSpentUsd !== 'number' ||
    !isNonNegativeSafeInteger(totalSpentUsd) ||
    totalSpentUsd > INITIAL_BUDGET_USD ||
    typeof actualDurationMs !== 'number' ||
    !isNonNegativeSafeInteger(actualDurationMs) ||
    typeof value.exactZeroClear !== 'boolean'
  ) {
    return null
  }

  const durationMs = getChallengeDurationMs(mode)
  if (actualDurationMs > durationMs) return null
  if (value.exactZeroClear) {
    if (totalSpentUsd !== INITIAL_BUDGET_USD || actualDurationMs >= durationMs) return null
  } else if (actualDurationMs !== durationMs) {
    return null
  }
  if (requireClear && !value.exactZeroClear) return null

  return {
    mode,
    totalSpentUsd,
    actualDurationMs,
    exactZeroClear: value.exactZeroClear,
  }
}

function parseLocalRecords(value: unknown, diagnostics: PersistenceDiagnosticCode[]): LocalRecords {
  const empty = createEmptyLocalRecords()
  if (!isRecord(value)) {
    diagnostics.push('INVALID_RECORD_DROPPED')
    return empty
  }

  const result: Record<ChallengeMode, LocalRecords[ChallengeMode]> = { ...empty }
  for (const mode of CHALLENGE_MODES) {
    const modeValue = value[mode]
    if (!isRecord(modeValue)) {
      diagnostics.push('INVALID_RECORD_DROPPED')
      continue
    }
    const highestRaw = modeValue.highestSpending
    const fastestRaw = modeValue.fastestClear
    const highestSpending =
      highestRaw === null ? null : parseRecordCandidate(highestRaw, mode, false)
    const fastestClear = fastestRaw === null ? null : parseRecordCandidate(fastestRaw, mode, true)
    if (
      (highestRaw !== null && highestSpending === null) ||
      (fastestRaw !== null && fastestClear === null)
    ) {
      diagnostics.push('INVALID_RECORD_DROPPED')
    }
    result[mode] = { highestSpending, fastestClear }
  }
  return result
}

function parsePreferences(value: unknown, diagnostics: PersistenceDiagnosticCode[]): Preferences {
  if (
    !isRecord(value) ||
    typeof value.showApproxCny !== 'boolean' ||
    (value.reducedMotion !== 'system' &&
      value.reducedMotion !== 'reduce' &&
      value.reducedMotion !== 'full')
  ) {
    diagnostics.push('INVALID_PREFERENCES_RESET')
    return createDefaultPreferences()
  }
  return {
    showApproxCny: value.showApproxCny,
    reducedMotion: value.reducedMotion,
  }
}

export function validateAndRecoverPersistedData(input: unknown): PersistedValidationResult | null {
  if (!isRecord(input)) return null
  if (input.schemaVersion !== CURRENT_SCHEMA_VERSION || input.catalogVersion !== CATALOG_VERSION) {
    return null
  }

  const diagnostics: PersistenceDiagnosticCode[] = []
  const lifetimeAchievementIds = sanitizeAchievementIds(
    input.lifetimeAchievementIds,
    diagnostics,
    'INVALID_LIFETIME_ACHIEVEMENTS_RESET',
  )
  const activeRun = input.activeRun === null ? null : parseRunState(input.activeRun, diagnostics)
  if (input.activeRun !== null && activeRun === null) diagnostics.push('ACTIVE_RUN_DROPPED')

  const data: PersistedGameDataV1 = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    catalogVersion: CATALOG_VERSION,
    activeRun,
    lifetimeAchievementIds,
    records: parseLocalRecords(input.records, diagnostics),
    preferences: parsePreferences(input.preferences, diagnostics),
  }
  return { data, diagnostics, recovered: diagnostics.length > 0 }
}
