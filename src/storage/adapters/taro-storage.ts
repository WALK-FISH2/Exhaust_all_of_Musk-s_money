import type { StorageAdapter } from '../storage-adapter'

interface TaroGetStorageResult {
  readonly data: unknown
}

export interface TaroStorageApi {
  getStorage(options: { readonly key: string }): Promise<TaroGetStorageResult>
  setStorage(options: { readonly key: string; readonly data: string }): Promise<unknown>
  removeStorage(options: { readonly key: string }): Promise<unknown>
}

export function createTaroStorageAdapter(api: TaroStorageApi): StorageAdapter {
  return {
    async get(key) {
      try {
        const result = await api.getStorage({ key })
        if (result.data === null || result.data === undefined) {
          return null
        }
        return typeof result.data === 'string' ? result.data : JSON.stringify(result.data)
      } catch {
        return null
      }
    },
    async set(key, value) {
      await api.setStorage({ key, data: value })
    },
    async remove(key) {
      try {
        await api.removeStorage({ key })
      } catch {
        // Removing a missing key is intentionally idempotent in the shared contract.
      }
    },
  }
}
