import { CATALOG_VERSION } from '../data/config'
import type { AchievementId } from '../domain/achievement-types'
import type { RunState } from '../domain/game-state'
import { createEmptyLocalRecords, type LocalRecords } from '../domain/records'

export const CURRENT_SCHEMA_VERSION = 1 as const

export interface Preferences {
  readonly showApproxCny: boolean
  readonly reducedMotion: 'system' | 'reduce' | 'full'
}

export interface PersistedGameDataV1 {
  readonly schemaVersion: typeof CURRENT_SCHEMA_VERSION
  readonly catalogVersion: typeof CATALOG_VERSION
  readonly activeRun: RunState | null
  readonly lifetimeAchievementIds: readonly AchievementId[]
  readonly records: LocalRecords
  readonly preferences: Preferences
}

export function createDefaultPreferences(): Preferences {
  return { showApproxCny: true, reducedMotion: 'full' }
}

export function createEmptyPersistedGameData(): PersistedGameDataV1 {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    catalogVersion: CATALOG_VERSION,
    activeRun: null,
    lifetimeAchievementIds: [],
    records: createEmptyLocalRecords(),
    preferences: createDefaultPreferences(),
  }
}
