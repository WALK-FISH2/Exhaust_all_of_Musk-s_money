import type { StorageAdapter } from './storage-adapter'

export interface M0StorageTestRecord {
  readonly schemaVersion: 1
  readonly source: 'm0-storage-probe'
  readonly revision: number
}

function parseRecord(raw: string): M0StorageTestRecord {
  const value: unknown = JSON.parse(raw)

  if (
    typeof value !== 'object' ||
    value === null ||
    !('schemaVersion' in value) ||
    value.schemaVersion !== 1 ||
    !('source' in value) ||
    value.source !== 'm0-storage-probe' ||
    !('revision' in value) ||
    typeof value.revision !== 'number'
  ) {
    throw new Error('Invalid M0 storage test record.')
  }

  return {
    schemaVersion: 1,
    source: 'm0-storage-probe',
    revision: value.revision,
  }
}

/** M0-only repository proving that persistence logic is independent of platform adapters. */
export class M0StorageRepository {
  constructor(
    private readonly storage: StorageAdapter,
    private readonly key = 'm0-storage-test',
  ) {}

  async load(): Promise<M0StorageTestRecord | null> {
    const raw = await this.storage.get(this.key)
    return raw === null ? null : parseRecord(raw)
  }

  async save(record: M0StorageTestRecord): Promise<void> {
    await this.storage.set(this.key, JSON.stringify(record))
  }

  async clear(): Promise<void> {
    await this.storage.remove(this.key)
  }
}
