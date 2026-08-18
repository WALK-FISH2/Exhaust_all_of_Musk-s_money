import Taro from '@tarojs/taro'

import { createH5StorageAdapter } from '../storage/adapters/h5-storage'
import { createTaroStorageAdapter, type TaroStorageApi } from '../storage/adapters/taro-storage'
import type { StorageAdapter } from '../storage/storage-adapter'

export function createPlatformStorageAdapter(): StorageAdapter {
  if (process.env.TARO_ENV === 'h5') {
    return createH5StorageAdapter(window.localStorage)
  }

  return createTaroStorageAdapter(Taro as unknown as TaroStorageApi)
}
