import { existsSync, readdirSync, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'

function collectFiles(root) {
  if (!existsSync(root)) throw new Error(`Missing build output: ${root}`)
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name)
    return entry.isDirectory() ? collectFiles(path) : [path]
  })
}

function measure(root) {
  const files = collectFiles(root)
  return {
    files: files.length,
    bytes: files.reduce((total, file) => total + statSync(file).size, 0),
    imageBytes: files
      .filter((file) => ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(extname(file)))
      .reduce((total, file) => total + statSync(file).size, 0),
  }
}

const h5 = measure(resolve('dist/h5'))
const weapp = measure(resolve('dist/weapp'))
const budgets = {
  h5Bytes: 5 * 1024 * 1024,
  weappBytes: 2 * 1024 * 1024,
  imageBytes: 256 * 1024,
}

if (h5.bytes > budgets.h5Bytes) throw new Error('H5 unpacked output exceeds the 5 MiB M5 budget.')
if (weapp.bytes > budgets.weappBytes) {
  throw new Error('WEAPP output exceeds the 2 MiB main-package early-warning budget.')
}
if (h5.imageBytes > budgets.imageBytes || weapp.imageBytes > budgets.imageBytes) {
  throw new Error('Shipped visual assets exceed the 256 KiB M5 image budget.')
}

console.log(JSON.stringify({ h5, weapp, budgets }))
