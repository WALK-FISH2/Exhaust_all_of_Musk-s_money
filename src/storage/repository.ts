import { runPersistenceMigrations, type MigrationFailureCode } from './migrations'
import type { PersistedGameDataV1 } from './schema'
import type { StorageAdapter } from './storage-adapter'
import { validateAndRecoverPersistedData, type PersistenceDiagnosticCode } from './validation'

export const GAME_STORAGE_KEY = 'spend-musk-money:game-data'

export type PersistenceLoadStatus =
  | 'empty'
  | 'loaded'
  | 'migrated'
  | 'recovered'
  | 'corrupt-json'
  | 'invalid-data'
  | 'future-version'
  | 'unsupported-version'
  | 'storage-error'

export interface PersistenceLoadResult {
  readonly status: PersistenceLoadStatus
  readonly data: PersistedGameDataV1 | null
  readonly diagnostics: readonly PersistenceDiagnosticCode[]
  readonly writable: boolean
}

export type PersistenceWriteResult =
  { readonly ok: true } | { readonly ok: false; readonly code: 'INVALID_DATA' | 'STORAGE_ERROR' }

export interface GamePersistenceRepository {
  load(): Promise<PersistenceLoadResult>
  save(data: PersistedGameDataV1): Promise<PersistenceWriteResult>
  clear(): Promise<PersistenceWriteResult>
}

function isWriteProtectedMigrationFailure(code: MigrationFailureCode): boolean {
  return (
    code === 'FUTURE_SCHEMA_VERSION' ||
    code === 'FUTURE_CATALOG_VERSION' ||
    code === 'UNSUPPORTED_SCHEMA_VERSION' ||
    code === 'UNSUPPORTED_CATALOG_VERSION'
  )
}

export class GameStorageRepository implements GamePersistenceRepository {
  private writeQueue: Promise<void> = Promise.resolve()

  constructor(
    private readonly storage: StorageAdapter,
    private readonly key = GAME_STORAGE_KEY,
  ) {}

  async load(): Promise<PersistenceLoadResult> {
    let raw: string | null
    try {
      raw = await this.storage.get(this.key)
    } catch {
      return { status: 'storage-error', data: null, diagnostics: [], writable: false }
    }
    if (raw === null) return { status: 'empty', data: null, diagnostics: [], writable: true }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { status: 'corrupt-json', data: null, diagnostics: [], writable: true }
    }

    const migration = runPersistenceMigrations(parsed)
    if (!migration.ok) {
      const protectedFailure = isWriteProtectedMigrationFailure(migration.code)
      return {
        status:
          migration.code === 'FUTURE_SCHEMA_VERSION' || migration.code === 'FUTURE_CATALOG_VERSION'
            ? 'future-version'
            : protectedFailure
              ? 'unsupported-version'
              : 'invalid-data',
        data: null,
        diagnostics: [],
        writable: !protectedFailure,
      }
    }

    const validation = validateAndRecoverPersistedData(migration.value)
    if (validation === null) {
      return { status: 'invalid-data', data: null, diagnostics: [], writable: true }
    }
    return {
      status: validation.recovered ? 'recovered' : migration.migrated ? 'migrated' : 'loaded',
      data: validation.data,
      diagnostics: validation.diagnostics,
      writable: true,
    }
  }

  async save(data: PersistedGameDataV1): Promise<PersistenceWriteResult> {
    const validation = validateAndRecoverPersistedData(data)
    if (validation === null || validation.recovered) return { ok: false, code: 'INVALID_DATA' }
    const serialized = JSON.stringify(validation.data)
    return this.enqueueWrite(async () => this.storage.set(this.key, serialized))
  }

  async clear(): Promise<PersistenceWriteResult> {
    return this.enqueueWrite(async () => this.storage.remove(this.key))
  }

  private async enqueueWrite(operation: () => Promise<void>): Promise<PersistenceWriteResult> {
    let result: PersistenceWriteResult = { ok: true }
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        await operation()
      } catch {
        result = { ok: false, code: 'STORAGE_ERROR' }
      }
    })
    await this.writeQueue
    return result
  }
}
