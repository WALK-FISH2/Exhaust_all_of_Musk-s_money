import type { AchievementId } from '../domain/achievement-types'
import { reconcileChallengeTime } from '../domain/challenge'
import { isChallengeMode, isRestorableUnfinishedRun, type RunState } from '../domain/game-state'
import {
  deriveChallengeRecordCandidate,
  updateLocalRecords,
  type LocalRecords,
  type LocalRecordUpdate,
} from '../domain/records'
import {
  CURRENT_SCHEMA_VERSION,
  type PersistedGameDataV1,
  type Preferences,
} from '../storage/schema'
import { CATALOG_VERSION } from '../data/config'

export interface PersistentProgressUpdate {
  readonly lifetimeAchievementIds: readonly AchievementId[]
  readonly records: LocalRecords
  readonly beatenRecordKinds: readonly ('highest-spending' | 'fastest-clear')[]
  readonly changed: boolean
}

export interface HydratedGameProgress extends PersistentProgressUpdate {
  readonly run: RunState
  readonly preferences: Preferences
  readonly restorePromptOpen: boolean
  readonly shouldOpenResult: boolean
  readonly requiresSave: boolean
  readonly observedNowMs: number
}

export function mergeLifetimeAchievements(
  existing: readonly AchievementId[],
  runAchievementIds: readonly AchievementId[],
): readonly AchievementId[] {
  const seen = new Set(existing)
  const appended = runAchievementIds.filter((id) => {
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
  return appended.length === 0 ? existing : [...existing, ...appended]
}

export function updatePersistentProgressForRun(
  lifetimeAchievementIds: readonly AchievementId[],
  records: LocalRecords,
  run: RunState,
): PersistentProgressUpdate {
  const nextLifetimeAchievementIds = mergeLifetimeAchievements(
    lifetimeAchievementIds,
    run.runUnlockedAchievementIds,
  )
  const candidate = deriveChallengeRecordCandidate(run)
  const recordUpdate: LocalRecordUpdate =
    candidate === null ? { records, beatenKinds: [] } : updateLocalRecords(records, candidate)
  return {
    lifetimeAchievementIds: nextLifetimeAchievementIds,
    records: recordUpdate.records,
    beatenRecordKinds: recordUpdate.beatenKinds,
    changed:
      nextLifetimeAchievementIds !== lifetimeAchievementIds || recordUpdate.records !== records,
  }
}

export function hydratePersistedGame(
  data: PersistedGameDataV1,
  fallbackRun: RunState,
  timestamp: number,
): HydratedGameProgress {
  const savedRun = data.activeRun
  const restorePromptOpen = savedRun !== null && isRestorableUnfinishedRun(savedRun)
  let run = savedRun ?? fallbackRun
  let reconciled = false

  if (isChallengeMode(run.mode) && run.status === 'active') {
    const reconciliation = reconcileChallengeTime(run, timestamp)
    if (reconciliation.ok && reconciliation.value.changed) {
      run = reconciliation.value.state
      reconciled = true
    }
  }

  const progress = updatePersistentProgressForRun(data.lifetimeAchievementIds, data.records, run)
  return {
    ...progress,
    run,
    preferences: data.preferences,
    restorePromptOpen,
    shouldOpenResult: run.status === 'completed' || run.status === 'expired',
    requiresSave: reconciled || progress.changed,
    observedNowMs: timestamp,
  }
}

export function createPersistedGameData(input: {
  readonly run: RunState
  readonly lifetimeAchievementIds: readonly AchievementId[]
  readonly records: LocalRecords
  readonly preferences: Preferences
}): PersistedGameDataV1 {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    catalogVersion: CATALOG_VERSION,
    activeRun: input.run,
    lifetimeAchievementIds: input.lifetimeAchievementIds,
    records: input.records,
    preferences: input.preferences,
  }
}
