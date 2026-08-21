import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const outputRoot = resolve('dist/h5')
const indexPath = resolve(outputRoot, 'index.html')
const cssRoot = resolve(outputRoot, 'css')

if (!existsSync(indexPath) || !existsSync(cssRoot)) {
  throw new Error('Missing H5 build artifacts. Run the H5 build before this check.')
}

const indexHtml = readFileSync(indexPath, 'utf8')
if (/documentElement[\s\S]*fontSize=x/.test(indexHtml)) {
  throw new Error('H5 entry still contains Taro responsive root-font scaling.')
}

const css = readdirSync(cssRoot)
  .filter((fileName) => fileName.endsWith('.css'))
  .map((fileName) => readFileSync(resolve(cssRoot, fileName), 'utf8'))
  .join('\n')

const gameShellRule = css.match(/\.game-shell\{[^}]+\}/)?.[0]
if (!gameShellRule || !gameShellRule.includes('width:min(1460px,100%)')) {
  throw new Error('H5 game shell is not using the expected responsive CSS-pixel width.')
}
if (gameShellRule.includes('rem')) {
  throw new Error('H5 game shell unexpectedly uses rem after pxtransform was disabled.')
}

const categoryListRule = css.match(/\.category-list\{[^}]+\}/)?.[0]
if (!categoryListRule?.includes('display:flex') || !categoryListRule.includes('flex-wrap:wrap')) {
  throw new Error('H5 category list must be a wrapping flex layout.')
}

const categoryChipRule = css.match(/\.category-chip\{[^}]+\}/)?.[0]
if (!categoryChipRule?.includes('width:auto')) {
  throw new Error('H5 category buttons must override Taro button width with width:auto.')
}

if (
  !/@media \(max-width: 820px\)\{[\s\S]*?\.product-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(
    css,
  )
) {
  throw new Error('H5 mobile product grid must use the two-column compact layout.')
}
if (!/@media \(max-width: 350px\)\{[\s\S]*?\.product-grid\{grid-template-columns:1fr/.test(css)) {
  throw new Error('H5 very-narrow product grid must fall back to one column.')
}
if (!css.includes('.product-card--compact-mobile .product-card__visual')) {
  throw new Error('H5 build is missing the compact mobile product-card presentation rules.')
}
if (!css.includes('.product-card__mark') || !css.includes('safe-area-inset-bottom')) {
  throw new Error('H5 build is missing the formal product marks or safe-area handling.')
}
if (!css.includes('taro-button-core:focus-visible') || !css.includes('.motion-reduce')) {
  throw new Error('H5 build is missing visible keyboard focus or reduced-motion rules.')
}
if (!css.includes('.motion-settings') || !css.includes('.pwa-status')) {
  throw new Error('H5 build is missing M5 motion preferences or PWA status UI.')
}

console.log(
  'H5 layout verification passed: CSS-pixel sizing, responsive cards, safe areas, focus visibility, motion preferences and PWA status are present.',
)
