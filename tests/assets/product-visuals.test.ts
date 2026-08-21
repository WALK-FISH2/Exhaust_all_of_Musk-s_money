import { describe, expect, it } from 'vitest'

import { PRODUCTS } from '../../src/data/products'
import { PRODUCT_VISUAL_ASSETS } from '../../src/ui/product-visuals'

describe('formal product visual registry', () => {
  it('registers one unique project-original code-native mark for all 45 products', () => {
    expect(PRODUCT_VISUAL_ASSETS).toHaveLength(PRODUCTS.length)
    expect(PRODUCT_VISUAL_ASSETS).toHaveLength(45)

    const productIds = new Set(PRODUCTS.map((product) => product.id))
    const visualIds = new Set(PRODUCT_VISUAL_ASSETS.map((asset) => asset.productId))
    const symbols = new Set(PRODUCT_VISUAL_ASSETS.map((asset) => asset.symbol))
    expect(visualIds).toEqual(productIds)
    expect(symbols).toHaveLength(PRODUCTS.length)

    for (const asset of PRODUCT_VISUAL_ASSETS) {
      expect(asset.assetId).toBe(`product-mark:${asset.productId}`)
      expect(asset.format).toBe('code-native-mark')
      expect(asset.source).toBe('src/ui/product-visuals.ts')
      expect(asset.license).toContain('Project-original')
      expect(asset.attributionRequired).toBe(false)
      expect(asset.symbol).not.toMatch(/https?:\/\//)
    }
  })
})
