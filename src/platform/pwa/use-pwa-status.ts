import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>
  prompt(): Promise<void>
}

export interface PwaStatusState {
  readonly supported: boolean
  readonly canInstall: boolean
  readonly installState: PwaInstallState
  readonly standalone: boolean
  readonly online: boolean
  readonly serviceWorkerReady: boolean
  readonly updateReady: boolean
  readonly install: () => Promise<void>
}

export type PwaInstallState = 'prompt' | 'menu' | 'standalone' | 'unknown'

interface PwaInstallStateInput {
  readonly standalone: boolean
  readonly canInstall: boolean
  readonly serviceWorkerSupported: boolean
  readonly serviceWorkerReady: boolean
}

export function classifyPwaInstallState({
  standalone,
  canInstall,
  serviceWorkerSupported,
  serviceWorkerReady,
}: PwaInstallStateInput): PwaInstallState {
  if (standalone) return 'standalone'
  if (canInstall) return 'prompt'
  if (serviceWorkerSupported && serviceWorkerReady) return 'menu'
  return 'unknown'
}

const IS_H5 = process.env.TARO_ENV === 'h5'

export function usePwaStatus(): PwaStatusState {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(false)
  const [online, setOnline] = useState(true)
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    if (!IS_H5 || typeof window === 'undefined') return undefined

    const displayMode = window.matchMedia('(display-mode: standalone)')
    const refreshEnvironment = () => {
      setStandalone(displayMode.matches)
      setOnline(navigator.onLine)
    }
    const onInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstallPrompt(null)
      setStandalone(true)
    }

    refreshEnvironment()
    window.addEventListener('beforeinstallprompt', onInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('online', refreshEnvironment)
    window.addEventListener('offline', refreshEnvironment)
    displayMode.addEventListener('change', refreshEnvironment)

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.ready.then((registration) => {
        setServiceWorkerReady(true)
        if (registration.waiting) setUpdateReady(true)
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (installing === null) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateReady(true)
            }
          })
        })
      })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('online', refreshEnvironment)
      window.removeEventListener('offline', refreshEnvironment)
      displayMode.removeEventListener('change', refreshEnvironment)
    }
  }, [])

  const install = useCallback(async () => {
    if (installPrompt === null) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }, [installPrompt])

  const canInstall = installPrompt !== null
  const serviceWorkerSupported =
    IS_H5 && typeof navigator !== 'undefined' && 'serviceWorker' in navigator

  return {
    supported: IS_H5,
    canInstall,
    installState: classifyPwaInstallState({
      standalone,
      canInstall,
      serviceWorkerSupported,
      serviceWorkerReady,
    }),
    standalone,
    online,
    serviceWorkerReady,
    updateReady,
    install,
  }
}
