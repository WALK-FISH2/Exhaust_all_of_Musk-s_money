import type { StorageAdapter } from '../../src/storage/storage-adapter'

export class MemoryStorageAdapter implements StorageAdapter {
  private readonly values = new Map<string, string>()
  failRead = false
  failWrite = false
  failRemove = false

  async get(key: string): Promise<string | null> {
    if (this.failRead) throw new Error('read failed')
    return this.values.get(key) ?? null
  }

  async set(key: string, value: string): Promise<void> {
    if (this.failWrite) throw new Error('write failed')
    this.values.set(key, value)
  }

  async remove(key: string): Promise<void> {
    if (this.failRemove) throw new Error('remove failed')
    this.values.delete(key)
  }

  getRaw(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setRaw(key: string, value: string): void {
    this.values.set(key, value)
  }
}
