import type { StorageAdapter } from '../storage-adapter'

export interface WebStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function createH5StorageAdapter(storage: WebStorageLike): StorageAdapter {
  return {
    async get(key) {
      return storage.getItem(key)
    },
    async set(key, value) {
      storage.setItem(key, value)
    },
    async remove(key) {
      storage.removeItem(key)
    },
  }
}
