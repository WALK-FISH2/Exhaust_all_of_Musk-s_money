import { CATALOG_VERSION } from '../../data/config'
import { CURRENT_SCHEMA_VERSION, createDefaultPreferences } from '../schema'

export type MigrationFailureCode =
  | 'INVALID_ROOT'
  | 'INVALID_SCHEMA_VERSION'
  | 'FUTURE_SCHEMA_VERSION'
  | 'UNSUPPORTED_SCHEMA_VERSION'
  | 'FUTURE_CATALOG_VERSION'
  | 'UNSUPPORTED_CATALOG_VERSION'

export type MigrationResult =
  | { readonly ok: true; readonly value: unknown; readonly migrated: boolean }
  | { readonly ok: false; readonly code: MigrationFailureCode }

type UnknownRecord = Readonly<Record<string, unknown>>
type SchemaMigration = (value: UnknownRecord) => UnknownRecord
type CatalogMigration = (value: UnknownRecord) => UnknownRecord

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Internal pre-release compatibility fixture. No released v0 save format is claimed.
const SCHEMA_MIGRATIONS: Readonly<Record<number, SchemaMigration>> = {
  0: (value) => ({ ...value, schemaVersion: 1, preferences: createDefaultPreferences() }),
}

// The first formal persistence schema starts at catalog version 2. Future catalog
// migrations are registered here and executed sequentially before validation.
const CATALOG_MIGRATIONS: Readonly<Record<number, CatalogMigration>> = {}

export function runPersistenceMigrations(input: unknown): MigrationResult {
  if (!isRecord(input)) return { ok: false, code: 'INVALID_ROOT' }
  if (!Number.isSafeInteger(input.schemaVersion) || (input.schemaVersion as number) < 0) {
    return { ok: false, code: 'INVALID_SCHEMA_VERSION' }
  }

  let value = input
  let schemaVersion = input.schemaVersion as number
  let migrated = false
  if (schemaVersion > CURRENT_SCHEMA_VERSION) {
    return { ok: false, code: 'FUTURE_SCHEMA_VERSION' }
  }
  while (schemaVersion < CURRENT_SCHEMA_VERSION) {
    const migrate = SCHEMA_MIGRATIONS[schemaVersion]
    if (migrate === undefined) return { ok: false, code: 'UNSUPPORTED_SCHEMA_VERSION' }
    value = migrate(value)
    schemaVersion += 1
    migrated = true
  }

  if (!Number.isSafeInteger(value.catalogVersion) || (value.catalogVersion as number) < 0) {
    return { ok: false, code: 'UNSUPPORTED_CATALOG_VERSION' }
  }
  let catalogVersion = value.catalogVersion as number
  if (catalogVersion > CATALOG_VERSION) {
    return { ok: false, code: 'FUTURE_CATALOG_VERSION' }
  }
  while (catalogVersion < CATALOG_VERSION) {
    const migrate = CATALOG_MIGRATIONS[catalogVersion]
    if (migrate === undefined) return { ok: false, code: 'UNSUPPORTED_CATALOG_VERSION' }
    value = migrate(value)
    catalogVersion += 1
    migrated = true
  }

  return { ok: true, value, migrated }
}
