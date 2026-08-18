import { CATEGORIES } from '../data/categories'
import {
  EXACT_ZERO_REGRESSION_PATH,
  MAX_QUANTITY_OVERRIDES,
  PRODUCTS,
  type ExactZeroPathLine,
} from '../data/products'
import type { CategoryDefinition, ProductDefinition } from './catalog'
import { compareProducts } from './catalog'
import { INITIAL_BUDGET_USD, isPositiveSafeInteger } from './money'

export type CatalogIssueCode =
  | 'UNEXPECTED_CATEGORY_COUNT'
  | 'UNEXPECTED_PRODUCT_COUNT'
  | 'EMPTY_CATEGORY_ID'
  | 'DUPLICATE_CATEGORY_ID'
  | 'EMPTY_PRODUCT_ID'
  | 'DUPLICATE_PRODUCT_ID'
  | 'INVALID_PRODUCT_ORDER'
  | 'DUPLICATE_PRODUCT_ORDER'
  | 'INVALID_PRODUCT_PRICE'
  | 'INVALID_PRODUCT_CAP'
  | 'UNSAFE_PRODUCT_MAX_SPEND'
  | 'UNKNOWN_CATEGORY'
  | 'PRODUCT_EXCEEDS_INITIAL_BUDGET'
  | 'CATALOG_NOT_SORTED'
  | 'MISSING_ONE_DOLLAR_PRODUCT'
  | 'INVALID_CAP_OVERRIDE'
  | 'SINGLE_PRODUCT_MAX_CLEARS_BUDGET'
  | 'EXACT_ZERO_PATH_MISSING_PRODUCT'
  | 'EXACT_ZERO_PATH_INVALID_QUANTITY'
  | 'EXACT_ZERO_PATH_CAP_EXCEEDED'
  | 'EXACT_ZERO_PATH_UNSAFE_TOTAL'
  | 'EXACT_ZERO_PATH_TOTAL_MISMATCH'

export interface CatalogIssue {
  readonly code: CatalogIssueCode
  readonly subjectId?: string
}

export interface CatalogValidationOptions {
  readonly initialBudgetUsd: number
  readonly expectedCategoryCount: number
  readonly expectedProductCount: number
  readonly capOverrides: Readonly<Record<string, number>>
  readonly exactZeroPath: readonly ExactZeroPathLine[]
}

export interface CatalogValidationResult {
  readonly valid: boolean
  readonly issues: readonly CatalogIssue[]
  readonly exactZeroPathTotalUsd: number | null
}

function issue(code: CatalogIssueCode, subjectId?: string): CatalogIssue {
  return subjectId === undefined ? { code } : { code, subjectId }
}

export function validateCatalog(
  categories: readonly CategoryDefinition[],
  products: readonly ProductDefinition[],
  options: CatalogValidationOptions,
): CatalogValidationResult {
  const issues: CatalogIssue[] = []
  const categoryIds = new Set<string>()
  const productIds = new Set<string>()
  const orders = new Set<number>()

  if (categories.length !== options.expectedCategoryCount) {
    issues.push(issue('UNEXPECTED_CATEGORY_COUNT'))
  }
  if (products.length !== options.expectedProductCount) {
    issues.push(issue('UNEXPECTED_PRODUCT_COUNT'))
  }

  for (const category of categories) {
    if (category.id.trim().length === 0) issues.push(issue('EMPTY_CATEGORY_ID'))
    if (categoryIds.has(category.id)) issues.push(issue('DUPLICATE_CATEGORY_ID', category.id))
    categoryIds.add(category.id)
  }

  products.forEach((product, index) => {
    if (product.id.trim().length === 0) issues.push(issue('EMPTY_PRODUCT_ID'))
    if (productIds.has(product.id)) issues.push(issue('DUPLICATE_PRODUCT_ID', product.id))
    productIds.add(product.id)

    if (!isPositiveSafeInteger(product.order)) {
      issues.push(issue('INVALID_PRODUCT_ORDER', product.id))
    }
    if (orders.has(product.order)) {
      issues.push(issue('DUPLICATE_PRODUCT_ORDER', product.id))
    }
    orders.add(product.order)

    if (!isPositiveSafeInteger(product.priceUsd)) {
      issues.push(issue('INVALID_PRODUCT_PRICE', product.id))
    }
    if (!isPositiveSafeInteger(product.maxQuantityPerRun)) {
      issues.push(issue('INVALID_PRODUCT_CAP', product.id))
    }
    if (!Number.isSafeInteger(product.priceUsd * product.maxQuantityPerRun)) {
      issues.push(issue('UNSAFE_PRODUCT_MAX_SPEND', product.id))
    }
    if (!categoryIds.has(product.categoryId)) {
      issues.push(issue('UNKNOWN_CATEGORY', product.id))
    }
    if (product.priceUsd > options.initialBudgetUsd) {
      issues.push(issue('PRODUCT_EXCEEDS_INITIAL_BUDGET', product.id))
    }

    const previous = products[index - 1]
    if (previous !== undefined && compareProducts(previous, product) > 0) {
      issues.push(issue('CATALOG_NOT_SORTED', product.id))
    }

    const expectedOverride = options.capOverrides[product.id]
    if (expectedOverride !== undefined && product.maxQuantityPerRun !== expectedOverride) {
      issues.push(issue('INVALID_CAP_OVERRIDE', product.id))
    }

    if (
      isPositiveSafeInteger(product.priceUsd) &&
      isPositiveSafeInteger(product.maxQuantityPerRun)
    ) {
      const maxQuantity = Math.min(
        Math.floor(options.initialBudgetUsd / product.priceUsd),
        product.maxQuantityPerRun,
      )
      const maxSpend = product.priceUsd * maxQuantity
      if (Number.isSafeInteger(maxSpend) && maxSpend === options.initialBudgetUsd) {
        issues.push(issue('SINGLE_PRODUCT_MAX_CLEARS_BUDGET', product.id))
      }
    }
  })

  if (!products.some((product) => product.priceUsd === 1)) {
    issues.push(issue('MISSING_ONE_DOLLAR_PRODUCT'))
  }

  let exactZeroPathTotalUsd: number | null = 0
  const productById = new Map(products.map((product) => [product.id, product]))
  for (const line of options.exactZeroPath) {
    const product = productById.get(line.productId)
    if (product === undefined) {
      issues.push(issue('EXACT_ZERO_PATH_MISSING_PRODUCT', line.productId))
      exactZeroPathTotalUsd = null
      continue
    }
    if (!isPositiveSafeInteger(line.quantity)) {
      issues.push(issue('EXACT_ZERO_PATH_INVALID_QUANTITY', line.productId))
      exactZeroPathTotalUsd = null
      continue
    }
    if (line.quantity > product.maxQuantityPerRun) {
      issues.push(issue('EXACT_ZERO_PATH_CAP_EXCEEDED', line.productId))
    }
    const subtotal = product.priceUsd * line.quantity
    if (!Number.isSafeInteger(subtotal) || exactZeroPathTotalUsd === null) {
      issues.push(issue('EXACT_ZERO_PATH_UNSAFE_TOTAL', line.productId))
      exactZeroPathTotalUsd = null
      continue
    }
    const nextTotal: number = exactZeroPathTotalUsd + subtotal
    if (!Number.isSafeInteger(nextTotal)) {
      issues.push(issue('EXACT_ZERO_PATH_UNSAFE_TOTAL', line.productId))
      exactZeroPathTotalUsd = null
      continue
    }
    exactZeroPathTotalUsd = nextTotal
  }

  if (exactZeroPathTotalUsd !== options.initialBudgetUsd) {
    issues.push(issue('EXACT_ZERO_PATH_TOTAL_MISMATCH'))
  }

  return {
    valid: issues.length === 0,
    issues,
    exactZeroPathTotalUsd,
  }
}

export function validateV1Catalog(): CatalogValidationResult {
  return validateCatalog(CATEGORIES, PRODUCTS, {
    initialBudgetUsd: INITIAL_BUDGET_USD,
    expectedCategoryCount: 10,
    expectedProductCount: 45,
    capOverrides: MAX_QUANTITY_OVERRIDES,
    exactZeroPath: EXACT_ZERO_REGRESSION_PATH,
  })
}
