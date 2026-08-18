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
if (manifest.start_url !== '/' || manifest.scope !== '/') {
  throw new Error('PWA manifest start_url and scope must both be /.')
}

const iconSizes = new Set((manifest.icons ?? []).map((icon) => icon.sizes))
for (const requiredSize of ['192x192', '512x512']) {
  if (!iconSizes.has(requiredSize)) {
    throw new Error(`PWA manifest is missing a ${requiredSize} icon declaration.`)
  }
}

const serviceWorker = readFileSync(serviceWorkerPath, 'utf8')
if (!serviceWorker.includes('index.html') || !serviceWorker.includes('static/pwa-icon.svg')) {
  throw new Error('Service worker precache manifest is missing the app shell or static icon.')
}
if (!serviceWorker.includes('caches.match')) {
  throw new Error('Service worker does not contain the offline cache/navigation fallback path.')
}
if (serviceWorker.includes('skipWaiting')) {
  throw new Error('Service worker must not force activation while an active session is open.')
}

console.log(
  'PWA build verification passed: manifest, registration, precached shell/assets, navigation fallback and safe update policy are present.',
)
