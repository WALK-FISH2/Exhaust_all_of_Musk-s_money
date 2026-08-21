import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const outputRoot = resolve('dist/h5')

function requireFile(relativePath) {
  const absolutePath = resolve(outputRoot, relativePath)
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing PWA build artifact: ${relativePath}`)
  }
  return absolutePath
}

const indexPath = requireFile('index.html')
const manifestPath = requireFile('manifest.webmanifest')
const serviceWorkerPath = requireFile('sw.js')
requireFile('registerSW.js')
requireFile('static/pwa-icon.svg')
requireFile('static/pwa-icon-maskable.svg')

const indexHtml = readFileSync(indexPath, 'utf8')
if (!indexHtml.includes('manifest.webmanifest')) {
  throw new Error('H5 entry does not reference manifest.webmanifest.')
}
if (!indexHtml.includes('registerSW.js')) {
  throw new Error('H5 entry does not include service worker registration.')
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
if (manifest.display !== 'standalone') {
  throw new Error('PWA manifest display mode must be standalone.')
}
if (manifest.id !== '/' || manifest.lang !== 'zh-CN') {
  throw new Error('PWA manifest must retain the stable root id and zh-CN language.')
}
if (
  manifest.name !== "花光马斯克的钱 / Spend Musk's Money" ||
  manifest.short_name !== '花光 $400B'
) {
  throw new Error('PWA manifest is missing the formal product identity.')
}
if (manifest.theme_color !== '#13213c' || manifest.background_color !== '#f3f0e8') {
  throw new Error('PWA manifest colors must match the formal M5 design tokens.')
}
if (manifest.start_url !== '/' || manifest.scope !== '/') {
  throw new Error('PWA manifest start_url and scope must both be /.')
}

const iconSizes = new Set((manifest.icons ?? []).map((icon) => icon.sizes))
for (const requiredSize of ['192x192', '512x512']) {
  if (!iconSizes.has(requiredSize)) {
    throw new Error(`PWA manifest is missing a ${requiredSize} icon declaration.`)
  }
}
const iconPurposes = new Set((manifest.icons ?? []).map((icon) => icon.purpose))
if (!iconPurposes.has('any') || !iconPurposes.has('maskable')) {
  throw new Error('PWA manifest requires both standard and maskable icons.')
}

const serviceWorker = readFileSync(serviceWorkerPath, 'utf8')
if (
  !serviceWorker.includes('index.html') ||
  !serviceWorker.includes('static/pwa-icon.svg') ||
  !serviceWorker.includes('static/pwa-icon-maskable.svg')
) {
  throw new Error('Service worker precache manifest is missing the app shell or static icon.')
}
if (!serviceWorker.includes('caches.match')) {
  throw new Error('Service worker does not contain the offline cache/navigation fallback path.')
}
if (serviceWorker.includes('skipWaiting')) {
  throw new Error('Service worker must not force activation while an active session is open.')
}
if (!serviceWorker.includes('spend-musk-money-app-shell-')) {
  throw new Error('Service worker cache is not using the scoped application cache prefix.')
}
if (
  serviceWorker.includes('spend-musk-money:game-data') ||
  serviceWorker.includes('localStorage')
) {
  throw new Error('Service worker must not read, mutate, or remove the game-save repository.')
}

console.log(
  'PWA build verification passed: manifest, registration, precached shell/assets, navigation fallback and safe update policy are present.',
)
