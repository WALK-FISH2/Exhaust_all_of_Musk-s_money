import { describe, expect, it } from 'vitest'

import { createPersistedGameData } from '../../src/application/game-persistence'
import { createFreeModeUiState, freeModeReducer } from '../../src/application/free-mode-controller'
import { createEmptyLocalRecords } from '../../src/domain/records'
import { deriveRunTotals } from '../../src/domain/game-state'
import { runPersistenceMigrations } from '../../src/storage/migrations'
import { GAME_STORAGE_KEY, GameStorageRepository } from '../../src/storage/repository'
import { createDefaultPreferences, createEmptyPersistedGameData } from '../../src/storage/schema'
import { MemoryStorageAdapter } from '../helpers/memory-storage'

function purchasedDocument() {
  let state = createFreeModeUiState('persisted-free', 1_000)
  state = freeModeReducer(state, {
    type: 'increment',
    productId: 'lucky-sticker',
    timestamp: 1_001,
  })
  return createPersistedGameData(state)
}

describe('versioned game storage repository', () => {
  it('returns an empty writable result when no save exists', async () => {
    const repository = new GameStorageRepository(new MemoryStorageAdapter())
    await expect(repository.load()).resolves.toEqual({
      status: 'empty',
      data: null,
      diagnostics: [],
      writable: true,
    })
  })

  it('writes and reloads one validated root document', async () => {
    const storage = new MemoryStorageAdapter()
    const repository = new GameStorageRepository(storage)
    const document = purchasedDocument()

    await expect(repository.save(document)).resolves.toEqual({ ok: true })
    const loaded = await repository.load()
    expect(loaded.status).toBe('loaded')
    expect(loaded.data).toEqual(document)
    expect(JSON.parse(storage.getRaw(GAME_STORAGE_KEY) ?? '{}')).toMatchObject({
      schemaVersion: 1,
      catalogVersion: 2,
      activeRun: { id: 'persisted-free' },
    })
  })

  it('migrates the explicit pre-release v0 fixture sequentially', async () => {
    const current = createEmptyPersistedGameData()
    const legacy = {
      schemaVersion: 0,
      catalogVersion: current.catalogVersion,
      activeRun: current.activeRun,
      lifetimeAchievementIds: current.lifetimeAchievementIds,
      records: current.records,
    }
    const migration = runPersistenceMigrations(legacy)
    expect(migration).toMatchObject({
      ok: true,
      migrated: true,
      value: { schemaVersion: 1, preferences: createDefaultPreferences() },
    })

    const storage = new MemoryStorageAdapter()
    storage.setRaw(GAME_STORAGE_KEY, JSON.stringify(legacy))
    const loaded = await new GameStorageRepository(storage).load()
    expect(loaded.status).toBe('migrated')
    expect(loaded.data?.schemaVersion).toBe(1)
  })

  it('recovers valid lifetime data while dropping an invalid quantity run', async () => {
    const storage = new MemoryStorageAdapter()
    const invalid = purchasedDocument()
    storage.setRaw(
      GAME_STORAGE_KEY,
      JSON.stringify({
        ...invalid,
        activeRun: {
          ...invalid.activeRun,
          quantities: { 'lucky-sticker': -1 },
        },
        lifetimeAchievementIds: ['first-swipe'],
      }),
    )

    const loaded = await new GameStorageRepository(storage).load()
    expect(loaded.status).toBe('recovered')
    expect(loaded.data?.activeRun).toBeNull()
    expect(loaded.data?.lifetimeAchievementIds).toEqual(['first-swipe'])
    expect(loaded.diagnostics).toContain('ACTIVE_RUN_DROPPED')
  })

  it('drops an active run containing an unknown product without crashing', async () => {
    const storage = new MemoryStorageAdapter()
    const invalid = purchasedDocument()
    storage.setRaw(
      GAME_STORAGE_KEY,
      JSON.stringify({
        ...invalid,
        activeRun: {
          ...invalid.activeRun,
          quantities: { 'future-product': 1 },
          unitPriceSnapshotsUsd: { 'future-product': 1 },
        },
      }),
    )
    const loaded = await new GameStorageRepository(storage).load()
    expect(loaded.status).toBe('recovered')
    expect(loaded.data?.activeRun).toBeNull()
  })

  it('filters unknown and duplicate achievements but preserves known IDs', async () => {
    const storage = new MemoryStorageAdapter()
    storage.setRaw(
      GAME_STORAGE_KEY,
      JSON.stringify({
        ...createEmptyPersistedGameData(),
        lifetimeAchievementIds: ['first-swipe', 'future-achievement', 'first-swipe'],
      }),
    )
    const loaded = await new GameStorageRepository(storage).load()
    expect(loaded.status).toBe('recovered')
    expect(loaded.data?.lifetimeAchievementIds).toEqual(['first-swipe'])
    expect(loaded.diagnostics).toEqual(
      expect.arrayContaining(['UNKNOWN_ACHIEVEMENT_DROPPED', 'DUPLICATE_ACHIEVEMENT_DROPPED']),
    )
  })

  it('rejects corrupt JSON safely and permits a later clean save', async () => {
    const storage = new MemoryStorageAdapter()
    storage.setRaw(GAME_STORAGE_KEY, '{broken')
    const repository = new GameStorageRepository(storage)
    await expect(repository.load()).resolves.toMatchObject({
      status: 'corrupt-json',
      writable: true,
    })
    await expect(repository.save(purchasedDocument())).resolves.toEqual({ ok: true })
  })

  it('protects unknown future schema data from overwrite', async () => {
    const storage = new MemoryStorageAdapter()
    const raw = JSON.stringify({ ...createEmptyPersistedGameData(), schemaVersion: 99 })
    storage.setRaw(GAME_STORAGE_KEY, raw)
    const loaded = await new GameStorageRepository(storage).load()
    expect(loaded).toMatchObject({ status: 'future-version', writable: false, data: null })
    expect(storage.getRaw(GAME_STORAGE_KEY)).toBe(raw)
  })

  it('protects unknown future catalog data from overwrite', async () => {
    const storage = new MemoryStorageAdapter()
    const raw = JSON.stringify({ ...createEmptyPersistedGameData(), catalogVersion: 99 })
    storage.setRaw(GAME_STORAGE_KEY, raw)
    await expect(new GameStorageRepository(storage).load()).resolves.toMatchObject({
      status: 'future-version',
      writable: false,
      data: null,
    })
    expect(storage.getRaw(GAME_STORAGE_KEY)).toBe(raw)
  })

  it('keeps authoritative unit-price snapshots instead of recalculating old spend', async () => {
    const storage = new MemoryStorageAdapter()
    const document = purchasedDocument()
    if (document.activeRun === null) throw new Error('Expected active run')
    const snapshotDocument = {
      ...document,
      activeRun: {
        ...document.activeRun,
        unitPriceSnapshotsUsd: { 'lucky-sticker': 7 },
      },
    }
    const repository = new GameStorageRepository(storage)
    expect(await repository.save(snapshotDocument)).toEqual({ ok: true })
    const loaded = await repository.load()
    expect(loaded.data?.activeRun && deriveRunTotals(loaded.data.activeRun).totalSpentUsd).toBe(7)
  })

  it('converts adapter read/write/remove failures into controlled results', async () => {
    const storage = new MemoryStorageAdapter()
    const repository = new GameStorageRepository(storage)

    storage.failRead = true
    await expect(repository.load()).resolves.toMatchObject({
      status: 'storage-error',
      writable: false,
    })
    storage.failRead = false
    storage.failWrite = true
    await expect(repository.save(purchasedDocument())).resolves.toEqual({
      ok: false,
      code: 'STORAGE_ERROR',
    })
    storage.failWrite = false
    storage.failRemove = true
    await expect(repository.clear()).resolves.toEqual({
      ok: false,
      code: 'STORAGE_ERROR',
    })
  })

  it('rejects invalid application documents before writing', async () => {
    const repository = new GameStorageRepository(new MemoryStorageAdapter())
    const invalid = {
      ...createEmptyPersistedGameData(),
      records: createEmptyLocalRecords(),
      lifetimeAchievementIds: ['unknown'],
    }
    await expect(repository.save(invalid as never)).resolves.toEqual({
      ok: false,
      code: 'INVALID_DATA',
    })
  })
})
