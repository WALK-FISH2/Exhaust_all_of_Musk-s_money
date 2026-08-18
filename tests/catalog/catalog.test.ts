import { describe, expect, it } from 'vitest'

import { CATEGORIES, CATEGORY_IDS } from '../../src/data/categories'
import {
  EXACT_ZERO_REGRESSION_PATH,
  MAX_QUANTITY_OVERRIDES,
  PRODUCT_BY_ID,
  PRODUCTS,
} from '../../src/data/products'
import { sortProducts } from '../../src/domain/catalog'
import { validateV1Catalog } from '../../src/domain/catalog-validation'
import { INITIAL_BUDGET_USD } from '../../src/domain/money'

describe('v1 static catalog', () => {
  it('contains exactly 45 products and 10 categories', () => {
    expect(PRODUCTS).toHaveLength(45)
    expect(CATEGORIES).toHaveLength(10)
  })

  it('passes the executable catalog validator', () => {
    expect(validateV1Catalog()).toEqual({
      valid: true,
      issues: [],
      exactZeroPathTotalUsd: INITIAL_BUDGET_USD,
    })
  })

  it('has unique IDs/orders and valid category references', () => {
    expect(new Set(PRODUCTS.map((product) => product.id)).size).toBe(PRODUCTS.length)
    expect(new Set(PRODUCTS.map((product) => product.order)).size).toBe(PRODUCTS.length)
    expect(PRODUCTS.every((product) => CATEGORY_IDS.has(product.categoryId))).toBe(true)
  })

  it('uses positive safe prices/caps and safe maximum subtotals', () => {
    for (const product of PRODUCTS) {
      expect(Number.isSafeInteger(product.priceUsd)).toBe(true)
      expect(product.priceUsd).toBeGreaterThan(0)
      expect(Number.isSafeInteger(product.maxQuantityPerRun)).toBe(true)
      expect(product.maxQuantityPerRun).toBeGreaterThan(0)
      expect(Number.isSafeInteger(product.priceUsd * product.maxQuantityPerRun)).toBe(true)
    }
  })

  it('preserves both formal cap overrides', () => {
    expect(PRODUCT_BY_ID.get('private-train')?.maxQuantityPerRun).toBe(7_999)
    expect(PRODUCT_BY_ID.get('private-island')?.maxQuantityPerRun).toBe(4_999)
    expect(MAX_QUANTITY_OVERRIDES).toEqual({
      'private-train': 7_999,
      'private-island': 4_999,
    })
  })

  it('is deterministically sorted by priceUsd then order without mutating input', () => {
    const reversed = [...PRODUCTS].reverse()
    const snapshot = [...reversed]
    const sorted = sortProducts(reversed)

    expect(reversed).toEqual(snapshot)
    expect(sorted.map((product) => product.id)).toEqual(PRODUCTS.map((product) => product.id))
  })

  it.each(PRODUCTS)('$id fresh-run MAX cannot clear the $400B budget', (product) => {
    const maxQuantity = Math.min(
      Math.floor(INITIAL_BUDGET_USD / product.priceUsd),
      product.maxQuantityPerRun,
    )
    expect(product.priceUsd * maxQuantity).not.toBe(INITIAL_BUDGET_USD)
  })

  it('keeps the official exact-zero path within caps and exactly $400B', () => {
    let totalUsd = 0
    for (const line of EXACT_ZERO_REGRESSION_PATH) {
      const product = PRODUCT_BY_ID.get(line.productId)
      expect(product).toBeDefined()
      expect(line.quantity).toBeLessThanOrEqual(product?.maxQuantityPerRun ?? 0)
      totalUsd += (product?.priceUsd ?? 0) * line.quantity
    }
    expect(totalUsd).toBe(INITIAL_BUDGET_USD)
  })
})
