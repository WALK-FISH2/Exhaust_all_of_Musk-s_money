import { afterEach, describe, expect, it, vi } from 'vitest'

import { setupUpdateManager, type WeappUpdateApi, type WeappUpdateManager } from '../../src/app'

interface UpdateCallbacks {
  check?: (result: { readonly hasUpdate: boolean }) => void
  ready?: () => void
  failed?: () => void
}

interface ModalOptions {
  readonly title: string
  readonly content: string
  readonly showCancel: boolean
  readonly confirmText?: string
  readonly success?: (result: { readonly confirm: boolean }) => void
}

function installWxApi(canUseUpdateManager = true): {
  readonly callbacks: UpdateCallbacks
  readonly api: WeappUpdateApi
  readonly updateManager: WeappUpdateManager
  readonly applyUpdate: ReturnType<typeof vi.fn>
  readonly getUpdateManager: ReturnType<typeof vi.fn>
  readonly showModal: ReturnType<typeof vi.fn>
} {
  const callbacks: UpdateCallbacks = {}
  const applyUpdate = vi.fn()
  const updateManager: WeappUpdateManager = {
    onCheckForUpdate: vi.fn((callback) => {
      callbacks.check = callback
    }),
    onUpdateReady: vi.fn((callback) => {
      callbacks.ready = callback
    }),
    onUpdateFailed: vi.fn((callback) => {
      callbacks.failed = callback
    }),
    applyUpdate,
  }
  const getUpdateManager = vi.fn(() => updateManager)
  const showModal = vi.fn<(options: ModalOptions) => void>()
  const api: WeappUpdateApi = {
    canIUse: vi.fn(() => canUseUpdateManager),
    getUpdateManager,
    showModal,
  }

  Object.defineProperty(globalThis, 'wx', {
    configurable: true,
    value: api,
  })

  return { callbacks, api, updateManager, applyUpdate, getUpdateManager, showModal }
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'wx')
  vi.restoreAllMocks()
})

describe('WEAPP update manager', () => {
  it('skips registration when getUpdateManager is unsupported', () => {
    const { api, getUpdateManager, showModal } = installWxApi(false)

    setupUpdateManager()

    expect(api.canIUse).toHaveBeenCalledWith('getUpdateManager')
    expect(getUpdateManager).not.toHaveBeenCalled()
    expect(showModal).not.toHaveBeenCalled()
  })

  it('registers update callbacks, confirms apply, and reports download failure', () => {
    const { callbacks, updateManager, applyUpdate, showModal } = installWxApi()

    setupUpdateManager()

    expect(updateManager.onCheckForUpdate).toHaveBeenCalledOnce()
    expect(updateManager.onUpdateReady).toHaveBeenCalledOnce()
    expect(updateManager.onUpdateFailed).toHaveBeenCalledOnce()
    expect(callbacks.check).toBeTypeOf('function')

    callbacks.check?.({ hasUpdate: true })
    callbacks.ready?.()

    expect(showModal).toHaveBeenCalledTimes(1)
    const readyModal = showModal.mock.calls[0]?.[0]
    expect(readyModal).toMatchObject({
      title: '发现新版本',
      content: '新版本已经准备好，点击确定后将重新启动小程序。',
      showCancel: false,
      confirmText: '立即更新',
    })

    readyModal?.success?.({ confirm: false })
    expect(applyUpdate).not.toHaveBeenCalled()
    readyModal?.success?.({ confirm: true })
    expect(applyUpdate).toHaveBeenCalledOnce()

    callbacks.failed?.()
    expect(showModal).toHaveBeenCalledTimes(2)
    expect(showModal.mock.calls[1]?.[0]).toMatchObject({
      title: '更新失败',
      content: '新版本下载失败，请检查网络后重新打开小程序。',
      showCancel: false,
    })
  })
})
