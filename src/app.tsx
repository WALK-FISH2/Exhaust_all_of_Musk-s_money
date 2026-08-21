import type { PropsWithChildren } from 'react'

import './app.scss'

export interface WeappUpdateManager {
  onCheckForUpdate(callback: (result: { readonly hasUpdate: boolean }) => void): void
  onUpdateReady(callback: () => void): void
  onUpdateFailed(callback: () => void): void
  applyUpdate(): void
}

export interface WeappUpdateApi {
  canIUse(schema: string): boolean
  getUpdateManager(): WeappUpdateManager
  showModal(options: {
    readonly title: string
    readonly content: string
    readonly showCancel: boolean
    readonly confirmText?: string
    readonly success?: (result: { readonly confirm: boolean }) => void
  }): void
}

declare const wx: WeappUpdateApi

export function setupUpdateManager(): void {
  if (typeof wx === 'undefined' || !wx.canIUse('getUpdateManager')) return

  const updateManager = wx.getUpdateManager()

  updateManager.onCheckForUpdate(() => undefined)

  updateManager.onUpdateReady(() => {
    wx.showModal({
      title: '发现新版本',
      content: '新版本已经准备好，点击确定后将重新启动小程序。',
      showCancel: false,
      confirmText: '立即更新',
      success: ({ confirm }) => {
        if (confirm) updateManager.applyUpdate()
      },
    })
  })

  updateManager.onUpdateFailed(() => {
    wx.showModal({
      title: '更新失败',
      content: '新版本下载失败，请检查网络后重新打开小程序。',
      showCancel: false,
    })
  })
}

if (process.env.TARO_ENV === 'weapp') setupUpdateManager()

export default function App({ children }: PropsWithChildren): JSX.Element {
  return children as JSX.Element
}
