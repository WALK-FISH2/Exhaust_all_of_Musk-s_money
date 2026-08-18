import { PRODUCTS } from '../data/products'
import type { ProductDefinition } from './catalog'
import { getProductQuantity, getProductUnitPriceUsd, type RunState } from './game-state'
import { multiplyUsd } from './money'
import { deriveResultMetrics } from './results'

export interface ReceiptLine {
  readonly productId: string
  readonly unitPriceUsd: number
  readonly quantity: number
  readonly subtotalUsd: number
}

export interface Receipt {
  readonly lines: readonly ReceiptLine[]
  readonly distinctProductCount: number
  readonly totalQuantity: number
  readonly totalSpentUsd: number
  readonly remainingBalanceUsd: number
}

export function deriveReceipt(
  state: RunState,
  products: readonly ProductDefinition[] = PRODUCTS,
): Receipt {
  const metrics = deriveResultMetrics(state, products)
  const lines = products.flatMap((product): readonly ReceiptLine[] => {
    const quantity = getProductQuantity(state, product.id)
    if (quantity === 0) return []
    const unitPriceUsd = getProductUnitPriceUsd(state, product)
    return [
      {
        productId: product.id,
        unitPriceUsd,
        quantity,
        subtotalUsd: multiplyUsd(unitPriceUsd, quantity),
      },
    ]
  })

  return {
    lines,
    distinctProductCount: metrics.distinctProductCount,
    totalQuantity: metrics.totalQuantity,
    totalSpentUsd: metrics.totalSpentUsd,
    remainingBalanceUsd: metrics.remainingBalanceUsd,
  }
}
