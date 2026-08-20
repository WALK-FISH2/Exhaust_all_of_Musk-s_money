import { describe, expect, it } from 'vitest'

import { createH5StorageAdapter, type WebStorageLike } from '../../src/storage/adapters/h5-storage'
import {
  createTaroStorageAdapter,
  type TaroStorageApi,
} from '../../src/storage/adapters/taro-storage'
import { runM0StorageProbe } from '../../src/storage/m0-storage-probe'
import { GameStorageRepository } from '../../src/storage/repository'
import { createEmptyPersistedGameData } from '../../src/storage/schema'
import type { StorageAdapter } from '../../src/storage/storage-adapter'

class MemoryWebStorage implements WebStorageLike {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

class MemoryTaroStorage implements TaroStorageApi {
  private readonly values = new Map<string, string>()

  async getStorage(options: { readonly key: string }): Promise<{ readonly data: unknown }> {
    const value = this.values.get(options.key)
    if (value === undefined) {
      throw new Error('getStorage:fail data not found')
    }
    return { data: value }
  }

  async setStorage(options: { readonly key: string; readonly data: string }): Promise<void> {
    this.values.set(options.key, options.data)
  }

  async removeStorage(options: { readonly key: string }): Promise<void> {
    this.values.delete(options.key)
  }
}

const adapterFactories: ReadonlyArray<readonly [string, () => StorageAdapter]> = [
  ['H5 localStorage adapter', () => createH5StorageAdapter(new MemoryWebStorage())],
  ['Taro Storage adapter', () => createTaroStorageAdapter(new MemoryTaroStorage())],
]

describe.each(adapterFactories)('%s', (_adapterName, createAdapter) => {
  it('satisfies the shared Storage contract', async () => {
    const result = await runM0StorageProbe(createAdapter())

    expect(result).toEqual({
      passed: true,
      completedSteps: ['cleanup-before', 'missing-read', 'set', 'get-json', 'overwrite', 'remove'],
    })
  })

  it('supports the same formal repository document contract', async () => {
    const repository = new GameStorageRepository(createAdapter())
    const document = createEmptyPersistedGameData()
    expect(await repository.save(document)).toEqual({ ok: true })
    expect(await repository.load()).toMatchObject({ status: 'loaded', data: document })
    expect(await repository.clear()).toEqual({ ok: true })
    expect(await repository.load()).toMatchObject({ status: 'empty', data: null })
  })
})
