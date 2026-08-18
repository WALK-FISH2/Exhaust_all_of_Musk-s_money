import { CATEGORIES } from '../data/categories'
import { PRODUCTS } from '../data/products'
import type { ProductDefinition } from './catalog'
import {
  deriveRunTotals,
  getProductQuantity,
  getProductUnitPriceUsd,
  type RunState,
} from './game-state'
import { addUsd, multiplyUsd } from './money'

export interface ResultLine {
  readonly productId: string
  readonly categoryId: string
  readonly order: number
  readonly unitPriceUsd: number
  readonly quantity: number
  readonly subtotalUsd: number
}

export interface RunResultMetrics {
  readonly mode: RunState['mode']
  readonly totalSpentUsd: number
  readonly remainingBalanceUsd: number
  readonly spendingPercent: number
  readonly wasteIndex: number
  readonly totalQuantity: number
  readonly distinctProductCount: number
  readonly categoriesTouched: readonly string[]
  readonly highestSubtotalLine: ResultLine | null
}

function isHigherPriorityLine(candidate: ResultLine, current: ResultLine): boolean {
  if (candidate.subtotalUsd !== current.subtotalUsd) {
    return candidate.subtotalUsd > current.subtotalUsd
  }
  if (candidate.unitPriceUsd !== current.unitPriceUsd) {
    return candidate.unitPriceUsd > current.unitPriceUsd
  }
  return candidate.order < current.order
}

export function deriveResultMetrics(
  state: RunState,
  products: readonly ProductDefinition[] = PRODUCTS,
): RunResultMetrics {
  const totals = deriveRunTotals(state, products)
  const categories = new Set<string>()
  let totalQuantity = 0
  let distinctProductCount = 0
  let highestSubtotalLine: ResultLine | null = null

  for (const product of products) {
    const quantity = getProductQuantity(state, product.id)
    if (quantity === 0) continue

    const unitPriceUsd = getProductUnitPriceUsd(state, product)
    const line: ResultLine = {
      productId: product.id,
      categoryId: product.categoryId,
      order: product.order,
      unitPriceUsd,
      quantity,
      subtotalUsd: multiplyUsd(unitPriceUsd, quantity),
    }
    totalQuantity = addUsd(totalQuantity, quantity)
    distinctProductCount += 1
    categories.add(product.categoryId)
    if (highestSubtotalLine === null || isHigherPriorityLine(line, highestSubtotalLine)) {
      highestSubtotalLine = line
    }
  }

  const spendingPercent = (totals.totalSpentUsd / state.initialBudgetUsd) * 100
  return {
    mode: state.mode,
    ...totals,
    spendingPercent,
    wasteIndex: Math.min(100, Math.max(0, Math.round(spendingPercent))),
    totalQuantity,
    distinctProductCount,
    categoriesTouched: CATEGORIES.filter((category) => categories.has(category.id)).map(
      (category) => category.id,
    ),
    highestSubtotalLine,
  }
}
