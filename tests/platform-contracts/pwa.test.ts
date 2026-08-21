import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { GAME_STORAGE_KEY } from '../../src/storage/repository'
import { classifyPwaInstallState } from '../../src/platform/pwa/use-pwa-status'

describe('PWA source contracts', () => {
  const serviceWorker = readFileSync('src/platform/pwa/sw.js', 'utf8')
  const html = readFileSync('src/index.html', 'utf8')

  it('keeps service-worker cache updates separate from local game saves', () => {
    expect(serviceWorker).toContain('spend-musk-money-app-shell-')
    expect(serviceWorker).toContain('key.startsWith(CACHE_PREFIX)')
    expect(serviceWorker).not.toContain('skipWaiting')
    expect(serviceWorker).not.toContain('localStorage')
    expect(serviceWorker).not.toContain(GAME_STORAGE_KEY)
  })

  it('contains an offline navigation fallback and formal install identity', () => {
    expect(serviceWorker).toContain("event.request.mode === 'navigate'")
    expect(serviceWorker).toContain("caches.match('/index.html')")
    expect(html).toContain("Spend Musk's Money")
    expect(html).toContain('viewport-fit=cover')
  })

  it('distinguishes page prompt, browser-menu fallback, standalone and unknown states', () => {
    expect(
      classifyPwaInstallState({
        standalone: false,
        canInstall: true,
        serviceWorkerSupported: true,
        serviceWorkerReady: true,
      }),
    ).toBe('prompt')
    expect(
      classifyPwaInstallState({
        standalone: false,
        canInstall: false,
        serviceWorkerSupported: true,
        serviceWorkerReady: true,
      }),
    ).toBe('menu')
    expect(
      classifyPwaInstallState({
        standalone: true,
        canInstall: false,
        serviceWorkerSupported: true,
        serviceWorkerReady: true,
      }),
    ).toBe('standalone')
    expect(
      classifyPwaInstallState({
        standalone: false,
        canInstall: false,
        serviceWorkerSupported: false,
        serviceWorkerReady: false,
      }),
    ).toBe('unknown')
  })
})
